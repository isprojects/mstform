import { Normalizer, normalizers } from "./normalizer";

export interface ConverterOptions<R, V> {
  convert(raw: R): V;
  render(value: V): R;
  rawValidate?(value: R): boolean | Promise<boolean>;
  validate?(value: V): boolean | Promise<boolean>;
  emptyRaw: R;
  defaultNormalizer?: Normalizer;
}

export interface IConverter<R, V> {
  emptyRaw: R;
  convert(raw: R): Promise<ConversionResponse<V>>;
  render(value: V): R;
  defaultNormalizer: Normalizer;
}

export class ConversionValue<V> {
  constructor(public value: V) {}
}

export type ConversionError = "ConversionError";

export const CONVERSION_ERROR: ConversionError = "ConversionError";

export type ConversionResponse<V> = ConversionError | ConversionValue<V>;

export class Converter<R, V> implements IConverter<R, V> {
  emptyRaw: R;
  defaultNormalizer: Normalizer;

  constructor(public definition: ConverterOptions<R, V>) {
    this.emptyRaw = definition.emptyRaw;
    this.defaultNormalizer = definition.defaultNormalizer
      ? definition.defaultNormalizer
      : normalizers.object;
  }

  async convert(raw: R): Promise<ConversionResponse<V>> {
    if (this.definition.rawValidate) {
      const rawValidationSuccess = await this.definition.rawValidate(raw);
      if (!rawValidationSuccess) {
        return CONVERSION_ERROR;
      }
    }

    const value = this.definition.convert(raw);

    if (this.definition.validate) {
      const rawValidationSuccess = await this.definition.validate(value);
      if (!rawValidationSuccess) {
        return CONVERSION_ERROR;
      }
    }
    return new ConversionValue<V>(value);
  }

  render(value: V): R {
    return this.definition.render(value);
  }
}
