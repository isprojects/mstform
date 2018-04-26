import { observable, action, computed } from "mobx";
import { IStateTreeNode, onPatch, applyPatch } from "mobx-state-tree";

export type ValidationResponse = string | null | undefined | false;

export class ProcessResponse<TValue> {
  value: TValue | null;
  error: string | null;

  constructor(value: TValue | null, error: string | null) {
    this.value = value;
    this.error = error;
  }
}

export interface Converter<TRaw, TValue> {
  (value: TRaw): TValue | undefined;
}

export interface Renderer<TValue, TRaw> {
  (value: TValue): TRaw;
}

export interface ValueGetter<TRaw> {
  (...args: any[]): TRaw;
}

export interface Validator<TValue> {
  (value: TValue): ValidationResponse | Promise<ValidationResponse>;
}

export interface ConversionError {
  (): string;
}

export type FieldMap = { [key: string]: Field<any, any> };

export type ResolveResponse = Form | Field<any, any> | Repeating<any, any>;

class Field<TRaw, TValue> {
  private _rawValidators: Validator<TRaw>[];
  private _validators: Validator<TValue>[];
  private convert: Converter<TRaw, TValue>;
  private render: Renderer<TValue, TRaw>;
  getValue: ValueGetter<TRaw>;
  private conversionError: ConversionError;

  constructor(
    convert: Converter<TRaw, TValue>,
    render: Renderer<TValue, TRaw>,
    getValue: ValueGetter<TRaw>,
    conversionError: ConversionError
  ) {
    this.convert = convert;
    this.render = render;
    this.getValue = getValue;
    this._validators = [];
    this._rawValidators = [];
    this.conversionError = conversionError;
  }

  async process(raw: TRaw): Promise<ProcessResponse<TValue>> {
    for (const validator of this._rawValidators) {
      const validationResponse = await validator(raw);
      if (typeof validationResponse === "string" && validationResponse) {
        return new ProcessResponse<TValue>(null, validationResponse);
      }
    }
    const result = this.convert(raw);
    if (result === undefined) {
      return new ProcessResponse<TValue>(null, this.conversionError());
    }
    for (const validator of this._validators) {
      const validationResponse = await validator(result);
      if (typeof validationResponse === "string" && validationResponse) {
        return new ProcessResponse<TValue>(null, validationResponse);
      }
    }
    return new ProcessResponse<TValue>(result, null);
  }

  validators(...validators: Validator<TValue>[]) {
    this._validators = validators;
  }

  rawValidators(...validators: Validator<TRaw>[]) {
    this._rawValidators = validators;
  }

  resolveParts(parts: string[]): ResolveResponse {
    if (parts.length === 0) {
      return this;
    }
    throw new Error("Cannot resolve into Field");
  }
}

class Repeating<TRawValue, TValue> {
  private value: Field<TRawValue, TValue> | Form;

  constructor(value: Field<TRawValue, TValue> | Form) {
    this.value = value;
  }

  resolveParts(parts: string[]): ResolveResponse {
    const [first, ...rest] = parts;
    if (!isInt(first)) {
      throw new Error("Not a Repeating");
    }
    if (rest.length === 0) {
      return this.value;
    }
    throw new Error("Cannot resolve into Repeating");
  }
}

function isInt(s: string): boolean {
  return Number.isInteger(parseInt(s, 10));
}

class Form {
  private fields: Map<string, Field<any, any> | Repeating<any, any>>;

  constructor(fields: FieldMap) {
    this.fields = new Map();
    Object.keys(fields).forEach(key => {
      this.fields.set(key, fields[key]);
    });
  }

  resolveParts(parts: string[]): ResolveResponse {
    const [first, ...rest] = parts;
    const found = this.fields.get(first);

    if (found === undefined) {
      throw new Error("Undefined field");
    }
    return found.resolveParts(rest);
  }

  resolve(path: string): ResolveResponse {
    if (path.startsWith("/")) {
      path = path.slice(1);
    }
    return this.resolveParts(path.split("/"));
  }
}

class FormState {
  private errors: Map<string, string>;
  private raw: Map<string, any>;
  private promises: Map<string, Promise<any>>;

  form: Form;

  @observable node: IStateTreeNode;

  constructor(form: Form, node: IStateTreeNode) {
    this.form = form;
    this.errors = observable.map();
    this.raw = observable.map();
    this.promises = observable.map();
    this.node = node;
    // XXX do something with disposer?
    onPatch(node, patch => {
      if (patch.op === "remove") {
        this.removeInfo(patch.path);
      }
    });
  }

  @action
  private removeInfo(path: string) {
    for (const key in this.raw.keys()) {
      if (key.startsWith(path)) {
        this.raw.delete(key);
      }
    }
    for (const key in this.errors.keys()) {
      if (key.startsWith(path)) {
        this.errors.delete(key);
      }
    }
  }

  @action
  async handleChange(path: string, raw: any) {
    // XXX part of this could move into Field?
    this.raw.set(path, raw);
    this.errors.delete(path);
    const definition = this.resolve(path);
    if (!(definition instanceof Field)) {
      throw new Error("Cannot process non-field");
    }
    // XXX handling async errors
    // XXX handling async in general
    const processResult = await definition.process(raw);

    const currentRaw = this.raw.get(path);
    // XXX expand comparison rules
    if (currentRaw !== raw) {
      return;
    }
    if (processResult.error != null) {
      this.errors.set(path, processResult.error);
      return;
    }

    applyPatch(this.node, [
      { op: "replace", path, value: processResult.value }
    ]);
    this.errors.delete(path);
  }

  getError(path: string): string | undefined {
    return this.errors.get(path);
  }

  getRaw(path: string): any {
    return this.raw.get(path);
  }

  resolve(path: string): ResolveResponse {
    return this.form.resolve(path);
  }
}

class FormAccessor {}

class RepeatingAccessor {
  // can node also be a plain value? depends on what's in it
  insert(index: number, node: IStateTreeNode) {}
  push(node: IStateTreeNode) {}
  remove(node: IStateTreeNode) {}

  @computed
  get error(): string {
    return "error";
  }
}

class FieldAccessor<TRaw, TValue> {
  private state: FormState;
  private path: string;

  constructor(state: FormState, path: string) {
    this.state = state;
    this.path = path;
  }

  @computed
  get error(): string | undefined {
    return this.state.getError(this.path);
  }

  @computed
  get raw(): TRaw {
    // XXX what happens if raw is undefined?
    return this.state.getRaw(this.path);
  }

  handleChange = (...args: any[]) => {
    const definition = this.state.resolve(this.path);
    if (!(definition instanceof Field)) {
      throw new Error("Cannot handle change on a non-field");
    }
    const raw = definition.getValue(...args);
    return this.state.handleChange(this.path, raw);
  };
}

export { Field, Repeating, Form };
