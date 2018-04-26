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
  (value: TRaw): TValue;
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

class Field<TRaw, TValue> {
  private _validators: Validator<TValue>[];
  private _convert: Converter<TRaw, TValue>;
  private _render: Renderer<TValue, TRaw>;
  private _getValue: ValueGetter<TRaw>;

  constructor(
    convert: Converter<TRaw, TValue>,
    render: Renderer<TValue, TRaw>,
    getValue: ValueGetter<TRaw>
  ) {
    this._convert = convert;
    this._render = render;
    this._getValue = getValue;
    this._validators = [];
  }

  process(raw: TRaw): ProcessResponse<TValue> {
    const result = this._convert(raw);
    for (const validator of this._validators) {
      const validationResponse = validator(result);
      if (typeof validationResponse === "string" && validationResponse) {
        return new ProcessResponse<TValue>(null, validationResponse);
      }
    }
    return new ProcessResponse<TValue>(result, null);
  }

  validators(...validators: Validator<TValue>[]) {
    this._validators = validators;
  }
}

class Repeating<TRawValue, TValue> {
  private _value: Field<TRawValue, TValue> | Form;

  constructor(value: Field<TRawValue, TValue> | Form) {
    this._value = value;
  }
}

class Form {}

export { Field, Repeating, Form };
