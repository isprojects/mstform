import { Controlled, controlled } from "./controlled";
import { FieldAccessor } from "./field-accessor";

export interface StateConverterOptions {
  decimalSeparator?: string;
  thousandSeparator?: string;
  renderThousands?: boolean;
}

export interface StateConverterOptionsWithContext
  extends StateConverterOptions {
  context?: any;
  accessor: FieldAccessor<any, any>;
}

export interface ConverterOptions<R, V> {
  convert(raw: R, options: StateConverterOptionsWithContext): V;
  render(value: V, options: StateConverterOptionsWithContext): R;
  emptyRaw: R;
  emptyValue?: V;
  emptyImpossible?: boolean;
  defaultControlled?: Controlled<R, V>;
  neverRequired?: boolean;
  preprocessRaw?(raw: R, options?: StateConverterOptionsWithContext): R;
  isEmpty?(raw: R, options?: StateConverterOptionsWithContext): boolean;
}

export interface IConverter<R, V> {
  emptyRaw: R;
  emptyValue: V;
  emptyImpossible: boolean;
  convert(
    raw: R,
    options: StateConverterOptionsWithContext
  ): ConversionResponse<V>;
  render(value: V, options: StateConverterOptionsWithContext): R;
  defaultControlled: Controlled<R, V>;
  neverRequired: boolean;
  preprocessRaw(raw: R, options: StateConverterOptionsWithContext): R;
  isEmpty(raw: R, options: StateConverterOptionsWithContext): boolean;
}

export class ConversionValue<V> {
  constructor(public value: V) {}
}

export class ConversionError {
  constructor(public type: string = "default") {}
}

export type ConversionResponse<V> = ConversionError | ConversionValue<V>;

export class Converter<R, V> implements IConverter<R, V> {
  emptyRaw: R;
  emptyValue: V;
  emptyImpossible: boolean;
  defaultControlled: Controlled<R, V>;
  neverRequired = false;

  constructor(public definition: ConverterOptions<R, V>) {
    this.emptyRaw = definition.emptyRaw;
    this.emptyImpossible = !!definition.emptyImpossible;
    const emptyValue = definition.emptyValue;
    if (this.emptyImpossible) {
      if (emptyValue !== undefined) {
        throw new Error(
          "If you set emptyImpossible for a converter, emptyValue cannot be set"
        );
      }
      this.emptyValue = undefined as any;
    } else {
      this.emptyValue = emptyValue as any;
    }
    this.defaultControlled = definition.defaultControlled
      ? definition.defaultControlled
      : controlled.object;
    this.neverRequired = !!definition.neverRequired;
  }

  isEmpty(raw: R, options: StateConverterOptionsWithContext) {
    if (this.definition.isEmpty == null) {
      return raw === this.emptyRaw;
    }
    return this.definition.isEmpty(raw, options);
  }

  preprocessRaw(raw: R, options?: StateConverterOptionsWithContext): R {
    if (this.definition.preprocessRaw == null) {
      return raw;
    }
    return this.definition.preprocessRaw(raw, options);
  }

  convert(
    raw: R,
    options: StateConverterOptionsWithContext
  ): ConversionResponse<V> {
    try {
      const value = this.definition.convert(raw, options);
      return new ConversionValue<V>(value);
    } catch (e) {
      if (e instanceof ConversionError) {
        return e;
      }
      throw e;
    }
  }

  render(value: V, options: StateConverterOptionsWithContext): R {
    return this.definition.render(value, options);
  }
}

export interface PartialConverterFactory<O, R, V> {
  (options?: Partial<O>): IConverter<R, V>;
}

export interface ConverterFactory<O, R, V> {
  (options: O): IConverter<R, V>;
}

// turn a converter which accepts options into a converter that
// accepts partial options and fill in the rest with defaults
export function withDefaults<O, R, V>(
  converterFactory: ConverterFactory<O, R, V>,
  defaults: O
): PartialConverterFactory<O, R, V> {
  return (partialOptions?: Partial<O>) => {
    return converterFactory({ ...defaults, ...partialOptions });
  };
}

export type ConverterOrFactory<R, V> =
  | IConverter<R, V>
  | (() => IConverter<R, V>);

export function makeConverter<R, V>(
  converter: ConverterOrFactory<R, V>
): IConverter<R, V> {
  if (typeof converter === "function") {
    return converter();
  }
  return converter;
}
