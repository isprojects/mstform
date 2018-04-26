import { observable } from "mobx";

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
}

class Repeating<TRawValue, TValue> {
  private _value: Field<TRawValue, TValue> | Form;

  constructor(value: Field<TRawValue, TValue> | Form) {
    this._value = value;
  }
}

class Form {
  private _fields: FieldMap;
  constructor(fields: FieldMap) {
    this._fields = fields;
  }
}

class FormState {
  @observable _errors = observable.map();
  @observable _raw = observable.map();
  @observable _promises = observable.map();
}
export { Field, Repeating, Form };
