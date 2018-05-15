export interface ConverterOptions<R, V> {
  convert(raw: R): V;
  render(value: V): R;
  rawValidate?(value: R): boolean;
  validate?(value: V): boolean;
  getRaw(...args: any[]): R;
}

export class ProcessValue<V> {
  constructor(public value: V) {}
}

export type ConversionError = "ConversionError";

export const conversionError: ConversionError = "ConversionError";

export type ProcessResponse<V> = ConversionError | ProcessValue<V>;

export class Converter<R, V> {
  constructor(public definition: ConverterOptions<R, V>) {}
  async process(raw: R): Promise<ProcessResponse<V>> {
    if (this.definition.rawValidate) {
      const rawValidationSuccess = await this.definition.rawValidate(raw);
      if (!rawValidationSuccess) {
        return conversionError;
      }
    }
    const value = this.definition.convert(raw);
    if (value === undefined) {
      return conversionError;
    }
    if (this.definition.validate) {
      const rawValidationSuccess = await this.definition.validate(value);
      if (!rawValidationSuccess) {
        return conversionError;
      }
    }
    return new ProcessValue<V>(value);
  }
}
