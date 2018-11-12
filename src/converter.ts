import { Controlled, controlled } from "./controlled";

export interface ConverterOptions<R, V> {
  convert(raw: R, context?: any): V;
  render(value: V, context?: any): R;
  rawValidate?(value: R, context?: any): boolean | Promise<boolean>;
  validate?(value: V, context?: any): boolean | Promise<boolean>;
  emptyRaw: R;
  defaultControlled?: Controlled;
  neverRequired?: boolean;
}

export interface IConverter<R, V> {
  emptyRaw: R;
  convert(raw: R, context?: any): Promise<ConversionResponse<V>>;
  render(value: V, context?: any): R;
  defaultControlled: Controlled;
  neverRequired: boolean;
  preprocessRaw(raw: R): R;
}

export class ConversionValue<V> {
  constructor(public value: V) {}
}

export type ConversionError = "ConversionError";

export const CONVERSION_ERROR: ConversionError = "ConversionError";

export type ConversionResponse<V> = ConversionError | ConversionValue<V>;

export class Converter<R, V> implements IConverter<R, V> {
  emptyRaw: R;
  defaultControlled: Controlled;
  neverRequired: boolean = false;

  constructor(public definition: ConverterOptions<R, V>) {
    this.emptyRaw = definition.emptyRaw;
    this.defaultControlled = definition.defaultControlled
      ? definition.defaultControlled
      : controlled.object;
    this.neverRequired = !!definition.neverRequired;
  }

  preprocessRaw(raw: R): R {
    return raw;
  }

  async convert(raw: R, context?: any): Promise<ConversionResponse<V>> {
    if (this.definition.rawValidate) {
      const rawValidationSuccess = await this.definition.rawValidate(
        raw,
        context
      );
      if (!rawValidationSuccess) {
        return CONVERSION_ERROR;
      }
    }

    const value = this.definition.convert(raw, context);

    if (this.definition.validate) {
      const rawValidationSuccess = await this.definition.validate(
        value,
        context
      );
      if (!rawValidationSuccess) {
        return CONVERSION_ERROR;
      }
    }
    return new ConversionValue<V>(value);
  }

  render(value: V, context?: any): R {
    return this.definition.render(value, context);
  }
}
