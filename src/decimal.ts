import {
  StateConverterOptions,
  StateConverterOptionsWithContext
} from "./converter";
import { DecimalOptions } from "./decimalParser";

export function getOptions(
  context: any,
  options?:
    | Partial<DecimalOptions>
    | ((context: any) => Partial<DecimalOptions>)
): DecimalOptions {
  if (typeof options === "function") {
    return getDecimalOptions(options(context));
  }
  if (options == null) {
    return {
      maxWholeDigits: 10,
      decimalPlaces: 2,
      allowNegative: true,
      addZeroes: true
    };
  }
  return getDecimalOptions(options);
}

function getDecimalOptions(options: Partial<DecimalOptions>): DecimalOptions {
  const maxWholeDigits: number = options.maxWholeDigits || 10;
  const decimalPlaces: number =
    options.decimalPlaces == null ? 2 : options.decimalPlaces;
  const allowNegative: boolean =
    options.allowNegative == null ? true : options.allowNegative;
  const addZeroes = !!options.addZeroes;
  return { maxWholeDigits, decimalPlaces, allowNegative, addZeroes };
}

export function checkConverterOptions(
  converterOptions: StateConverterOptions | StateConverterOptionsWithContext
): void {
  if (
    converterOptions.thousandSeparator === "." &&
    converterOptions.decimalSeparator == null
  ) {
    throw new Error(
      "Can't set thousandSeparator to . without setting decimalSeparator."
    );
  }
  if (
    converterOptions.thousandSeparator === converterOptions.decimalSeparator &&
    converterOptions.thousandSeparator != null
  ) {
    throw new Error(
      "Can't set thousandSeparator and decimalSeparator to the same value."
    );
  }
}
