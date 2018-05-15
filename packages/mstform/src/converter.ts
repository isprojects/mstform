export interface ConverterOptions<R, V> {
  convert(raw: R): V;
  render(value: V): R;
  rawValidate(value: R): boolean;
  validate(value: V): boolean;
  getRaw(...args: any[]): R;
}

export enum ValidationResponse {
  rawValidationError,
  conversionError,
  validationError
}

export type ErrorMessages = { [K in keyof ValidationResponse]: string };

export class ProcessValue<V> {
  constructor(public value: V) {}
}

export type ProcessResponse<V> = ValidationResponse | ProcessValue<V>;

export class Converter<R, V> {
  constructor(public definition: ConverterOptions<R, V>) {}
  async process(raw: R): Promise<ProcessResponse<V>> {
    const rawValidationSuccess = await this.definition.rawValidate(raw);
    if (!rawValidationSuccess) {
      return ValidationResponse.rawValidationError;
    }
    const value = this.definition.convert(raw);
    if (value === undefined) {
      return ValidationResponse.conversionError;
    }

    const validationSuccess = await this.definition.validate(value);
    if (!rawValidationSuccess) {
      return ValidationResponse.validationError;
    }
    return new ProcessValue<V>(value);
  }
}
