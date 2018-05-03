import { observable, action, computed, isObservable } from "mobx";
import {
  IStateTreeNode,
  onPatch,
  applyPatch,
  resolvePath
} from "mobx-state-tree";
// have to use this here but loses type information
const equal = require("fast-deep-equal");
// can use this to pass the tests but rollup will bail out
// import * as equal from "fast-deep-equal";

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

export type ResolveResponse = Form<any> | Field<any, any> | Repeating<any, any>;

export class Field<TRaw, TValue> {
  private _rawValidators: Validator<TRaw>[];
  private _validators: Validator<TValue>[];
  private convert: Converter<TRaw, TValue>;
  render: Renderer<TValue, TRaw>;
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

  get rawType(): TRaw {
    throw new Error("Shouldn't be called");
  }

  get valueType(): TValue {
    throw new Error("Shouldn't be called");
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
}

export class Repeating<TRawValue, TValue> {
  private value: Field<TRawValue, TValue> | Form<any>;

  constructor(value: Field<TRawValue, TValue> | Form<any>) {
    this.value = value;
  }
}

function isInt(s: string): boolean {
  return Number.isInteger(parseInt(s, 10));
}

export type FormDefinitionType = {
  [key: string]: Field<any, any>;
};

export class Form<TFormDefinition extends FormDefinitionType> {
  definition: TFormDefinition;

  constructor(definition: TFormDefinition) {
    this.definition = definition;
  }

  create(node: IStateTreeNode) {
    return new FormState<TFormDefinition>(this, node);
  }
}

function unwrap(o: any): any {
  if (isObservable(o)) {
    return o.toJS();
  }
  return o;
}

export class FormState<TFormDefinition extends FormDefinitionType> {
  private errors: Map<string, string>;
  private raw: Map<string, any>;
  private promises: Map<string, Promise<any>>;

  form: Form<TFormDefinition>;

  @observable node: IStateTreeNode;

  constructor(form: Form<TFormDefinition>, node: IStateTreeNode) {
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

  get fields(): FormAccessorType<TFormDefinition> {
    const result: any = {};
    Object.keys(this.form.definition).forEach(key => {
      result[key] = this.access(key);
    });
    return result as FormAccessorType<TFormDefinition>;
  }

  access<K extends keyof TFormDefinition>(
    name: K
  ): FieldAccessor<
    TFormDefinition,
    TFormDefinition[K],
    TFormDefinition[K]["rawType"],
    TFormDefinition[K]["valueType"]
  > {
    return new FieldAccessor(this, this.form.definition[name], name);
  }

  getError(path: string): string | undefined {
    return this.errors.get(path);
  }

  @action
  setError(path: string, error: string) {
    this.errors.set(path, error);
  }

  @action
  removeError(path: string) {
    this.errors.delete(path);
  }

  getValue<TValue>(path: string): TValue {
    return resolvePath(this.node, path);
  }

  getRaw<TRaw>(path: string): TRaw {
    return this.raw.get(path);
  }

  @action
  setRaw<TRaw>(path: string, raw: TRaw) {
    this.raw.set(path, raw);
  }
}

export type FormAccessorType<TFormDefinition extends FormDefinitionType> = {
  [K in keyof TFormDefinition]: FieldAccessor<
    TFormDefinition,
    TFormDefinition[K],
    TFormDefinition[K]["rawType"],
    TFormDefinition[K]["valueType"]
  >
};

export class FormAccessor<TFormDefinition extends FormDefinitionType> {
  private state: FormState<TFormDefinition>;

  constructor(state: FormState<TFormDefinition>) {
    this.state = state;
  }
}

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

export class FieldAccessor<
  TFormDefinition extends FormDefinitionType,
  TField extends Field<TRaw, TValue>,
  TRaw,
  TValue
> {
  private state: FormState<TFormDefinition>;
  field: Field<TRaw, TValue>;
  path: string;

  constructor(
    state: FormState<TFormDefinition>,
    field: Field<TRaw, TValue>,
    path: string
  ) {
    this.state = state;
    this.field = field;
    this.path = path;
  }

  @computed
  get error(): string | undefined {
    return this.state.getError(this.path);
  }

  @computed
  get raw(): TRaw {
    const result = this.state.getRaw<TRaw>(this.path);
    if (result !== undefined) {
      return result;
    }
    return this.field.render(this.state.getValue(this.path));
  }

  handleChange = async (...args: any[]) => {
    const raw = this.field.getValue(...args);
    this.state.setRaw<TRaw>(this.path, raw);
    this.state.removeError(this.path);
    // XXX handling async errors
    // XXX handling async in general
    const processResult = await this.field.process(raw);

    const currentRaw = this.state.getRaw(this.path);

    if (!equal(unwrap(currentRaw), unwrap(raw))) {
      return;
    }

    if (processResult.error != null) {
      this.state.setError(this.path, processResult.error);
      return;
    }

    applyPatch(this.state.node, [
      { op: "replace", path: this.path, value: processResult.value }
    ]);
  };
}

function identity<T>(value: T): T {
  return value;
}

export class StringField extends Field<string, string> {
  constructor() {
    const getValue: ValueGetter<any> = event => {
      return event.target.value;
    };
    const conversionError: ConversionError = () => {
      return "Conversion error";
    };
    super(identity, identity, getValue, conversionError);
  }
}

export class ObjectField<TValue> extends Field<TValue, TValue> {
  constructor() {
    const conversionError: ConversionError = () => {
      return "Conversion error";
    };
    super(identity, identity, identity, conversionError);
  }
}
