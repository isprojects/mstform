import { Controlled, controlled } from "./controlled";

export interface StateConverterOptions {
  decimalSeparator?: string;
  thousandSeparator?: string;
  renderThousands?: boolean;
}

export interface StateConverterOptionsWithContext
  extends StateConverterOptions {
  context?: any;
}

export interface ConverterOptions<R, V> {
  convert(raw: R, options: StateConverterOptionsWithContext): V;
  render(value: V, options: StateConverterOptionsWithContext): R;
  rawValidate?(
    value: R,
    options: StateConverterOptionsWithContext
  ): boolean | Promise<boolean>;
  validate?(
    value: V,
    options: StateConverterOptionsWithContext
  ): boolean | Promise<boolean>;
  emptyRaw: R;
  emptyImpossible?: boolean;
  defaultControlled?: Controlled;
  neverRequired?: boolean;
  preprocessRaw?(raw: R, options?: StateConverterOptionsWithContext): R;
}

export interface IConverter<R, V> {
  emptyRaw: R;
  emptyImpossible: boolean;
  convert(
    raw: R,
    options: StateConverterOptionsWithContext
  ): Promise<ConversionResponse<V>>;
  render(value: V, options: StateConverterOptionsWithContext): R;
  defaultControlled: Controlled;
  neverRequired: boolean;
  preprocessRaw(raw: R, options: StateConverterOptionsWithContext): R;
}

export class ConversionValue<V> {
  constructor(public value: V) {}
}

export type ConversionError = "ConversionError";

export const CONVERSION_ERROR: ConversionError = "ConversionError";

export type ConversionResponse<V> = ConversionError | ConversionValue<V>;

export class Converter<R, V> implements IConverter<R, V> {
  emptyRaw: R;
  emptyImpossible: boolean;
  defaultControlled: Controlled;
  neverRequired: boolean = false;

  constructor(public definition: ConverterOptions<R, V>) {
    this.emptyRaw = definition.emptyRaw;
    this.defaultControlled = definition.defaultControlled
      ? definition.defaultControlled
      : controlled.object;
    this.neverRequired = !!definition.neverRequired;
    this.emptyImpossible = !!definition.emptyImpossible;
  }

  preprocessRaw(raw: R, options?: StateConverterOptionsWithContext): R {
    if (this.definition.preprocessRaw == null) {
      return raw;
    }
    return this.definition.preprocessRaw(raw, options);
  }

  async convert(
    raw: R,
    options: StateConverterOptionsWithContext
  ): Promise<ConversionResponse<V>> {
    if (this.definition.rawValidate) {
      const rawValidationSuccess = await this.definition.rawValidate(
        raw,
        options
      );
      if (!rawValidationSuccess) {
        return CONVERSION_ERROR;
      }
    }

    const value = this.definition.convert(raw, options);

    if (this.definition.validate) {
      const rawValidationSuccess = await this.definition.validate(
        value,
        options
      );
      if (!rawValidationSuccess) {
        return CONVERSION_ERROR;
      }
    }
    return new ConversionValue<V>(value);
  }

  render(value: V, options: StateConverterOptionsWithContext): R {
    return this.definition.render(value, options);
  }
}
