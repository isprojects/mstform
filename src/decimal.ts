import { StateConverterOptionsWithContext } from "./converter";
import { DecimalOptions } from "./converters";

function normalizeLastElement(
  raw: string,
  options: StateConverterOptionsWithContext
) {
  if (options.decimalSeparator == null) {
    return raw;
  }
  return raw.split(options.decimalSeparator)[0];
}

function convertDecimalSeparator(
  raw: string,
  options: StateConverterOptionsWithContext
) {
  if (options.decimalSeparator == null) {
    return raw;
  }
  return raw.replace(options.decimalSeparator, ".");
}

function renderDecimalSeparator(
  value: string,
  options: StateConverterOptionsWithContext
) {
  if (options.decimalSeparator == null) {
    return value;
  }
  return value.replace(".", options.decimalSeparator);
}

function convertThousandSeparators(
  raw: string,
  options: StateConverterOptionsWithContext
) {
  if (options.thousandSeparator == null) {
    return raw;
  }
  const splitRaw = raw.split(options.thousandSeparator);
  const firstElement = splitRaw[0];
  const lastElement = normalizeLastElement(
    splitRaw[splitRaw.length - 1],
    options
  );
  // value before the first thousand separator has to be of length 1, 2 or 3
  if (firstElement.length < 1 || firstElement.length > 3) {
    return raw;
  }
  if (lastElement.length !== 3) {
    return raw;
  }
  // all remaining elements of the split string should have length 3
  if (!splitRaw.slice(1, -1).every(raw => raw.length === 3)) {
    return raw;
  }
  // turn split string back into full string without thousand separators
  return splitRaw.join("");
}

function renderThousandSeparators(
  value: string,
  options: StateConverterOptionsWithContext
) {
  if (options.thousandSeparator == null || !options.renderThousands) {
    return value;
  }
  const decimalSeparator = options.decimalSeparator || ".";
  const splitValue = value.split(decimalSeparator);
  splitValue[0] = splitValue[0].replace(
    /\B(?=(\d{3})+(?!\d))/g,
    options.thousandSeparator
  );
  return splitValue.join(decimalSeparator);
}

export function convertSeparators(
  raw: string,
  options: StateConverterOptionsWithContext
) {
  return convertDecimalSeparator(
    convertThousandSeparators(raw, options),
    options
  );
}

export function renderSeparators(
  value: string,
  options: StateConverterOptionsWithContext
) {
  if (options == null) {
    return value;
  }
  return renderThousandSeparators(
    renderDecimalSeparator(value, options),
    options
  );
}

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
    return { maxWholeDigits: 10, decimalPlaces: 2, allowNegative: true };
  }
  return getDecimalOptions(options);
}

function getDecimalOptions(options: Partial<DecimalOptions>): DecimalOptions {
  const maxWholeDigits: number = options.maxWholeDigits || 10;
  const decimalPlaces: number =
    options.decimalPlaces == null ? 2 : options.decimalPlaces;
  const allowNegative: boolean =
    options.allowNegative == null ? true : options.allowNegative;
  return { maxWholeDigits, decimalPlaces, allowNegative };
}

export function getRegex(
  context: any,
  decimalOptions?:
    | Partial<DecimalOptions>
    | ((context: any) => Partial<DecimalOptions>)
): RegExp {
  const options = getOptions(context, decimalOptions);
  return new RegExp(
    `^${
      options.allowNegative ? `-?` : ``
    }(0|[1-9]\\d{0,${options.maxWholeDigits - 1}})(\\.\\d{0,${
      options.decimalPlaces
    }})?$`
  );
}

export function trimDecimals(
  value: string,
  options: StateConverterOptionsWithContext,
  decimalOptions?:
    | Partial<DecimalOptions>
    | ((context: any) => Partial<DecimalOptions>)
): string {
  const [before, after] = value.split(".");
  if (typeof after === "undefined") {
    return value;
  }
  const trimmedAfter = after.substring(
    0,
    getOptions(options.context, decimalOptions).decimalPlaces
  );
  if (trimmedAfter.length === 0) {
    return before;
  }
  return [before, trimmedAfter].join(".");
}
