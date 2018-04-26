import { observable, action } from "mobx";
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
  private _convert: Converter<TRaw, TValue>;
  private _render: Renderer<TValue, TRaw>;
  private _getValue: ValueGetter<TRaw>;
  private _conversionError: ConversionError;

  constructor(
    convert: Converter<TRaw, TValue>,
    render: Renderer<TValue, TRaw>,
    getValue: ValueGetter<TRaw>,
    conversionError: ConversionError
  ) {
    this._convert = convert;
    this._render = render;
    this._getValue = getValue;
    this._validators = [];
    this._rawValidators = [];
    this._conversionError = conversionError;
  }

  async process(raw: TRaw): Promise<ProcessResponse<TValue>> {
    for (const validator of this._rawValidators) {
      const validationResponse = await validator(raw);
      if (typeof validationResponse === "string" && validationResponse) {
        return new ProcessResponse<TValue>(null, validationResponse);
      }
    }
    const result = this._convert(raw);
    if (result === undefined) {
      return new ProcessResponse<TValue>(null, this._conversionError());
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
  private _value: Field<TRawValue, TValue> | Form;

  constructor(value: Field<TRawValue, TValue> | Form) {
    this._value = value;
  }

  resolveParts(parts: string[]): ResolveResponse {
    const [first, ...rest] = parts;
    if (!isInt(first)) {
      throw new Error("Not a Repeating");
    }
    if (rest.length === 0) {
      return this._value;
    }
    throw new Error("Cannot resolve into Repeating");
  }
}

function isInt(s: string): boolean {
  return Number.isInteger(parseInt(s, 10));
}

class Form {
  private _fields: Map<string, Field<any, any> | Repeating<any, any>>;

  constructor(fields: FieldMap) {
    this._fields = new Map();
    Object.keys(fields).forEach(key => {
      this._fields.set(key, fields[key]);
    });
  }

  resolveParts(parts: string[]): ResolveResponse {
    const [first, ...rest] = parts;
    const found = this._fields.get(first);

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
  private _errors: Map<string, string>;
  private _raw: Map<string, any>;
  private _promises: Map<string, Promise<any>>;

  form: Form;

  @observable node: IStateTreeNode;

  constructor(form: Form, node: IStateTreeNode) {
    this.form = form;
    this._errors = observable.map();
    this._raw = observable.map();
    this._promises = observable.map();
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
    for (const key in this._raw.keys()) {
      if (key.startsWith(path)) {
        this._raw.delete(key);
      }
    }
    for (const key in this._errors.keys()) {
      if (key.startsWith(path)) {
        this._errors.delete(key);
      }
    }
  }

  @action
  private async handleChange(path: string, raw: any) {
    // XXX part of this could move into Field?
    this._raw.set(path, raw);
    this._errors.delete(path);
    const definition = this.form.resolve(path);
    if (!(definition instanceof Field)) {
      throw new Error("Cannot process non-field");
    }
    // XXX handling async errors
    // XXX handling async in general
    const processResult = await definition.process(raw);

    const currentRaw = this._raw.get(path);
    // XXX expand comparison rules
    if (currentRaw !== raw) {
      return;
    }
    if (processResult.error != null) {
      this._errors.set(path, processResult.error);
      return;
    }

    applyPatch(this.node, [
      { op: "replace", path, value: processResult.value }
    ]);
    this._errors.delete(path);
  }
}

export { Field, Repeating, Form };
