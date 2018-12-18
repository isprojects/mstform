import { IObservableArray, observable } from "mobx";
import { IAnyModelType, Instance } from "mobx-state-tree";
import {
  ConversionResponse,
  ConversionValue,
  Converter,
  IConverter,
  StateConverterOptionsWithContext
} from "./converter";
import { controlled } from "./controlled";
import { identity } from "./utils";

const NUMBER_REGEX = new RegExp("^-?(0|[1-9]\\d*)(\\.\\d*)?$");
const INTEGER_REGEX = new RegExp("^-?(0|[1-9]\\d*)$");

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

function convertSeparators(
  raw: string,
  options: StateConverterOptionsWithContext
) {
  return convertDecimalSeparator(
    convertThousandSeparators(raw, options),
    options
  );
}

function renderSeparators(
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

export class StringConverter<V> extends Converter<string, V> {
  defaultControlled = controlled.value;
}

const string = new StringConverter<string>({
  emptyRaw: "",
  emptyValue: "",
  convert(raw) {
    return raw;
  },
  render(value) {
    return value;
  },
  preprocessRaw(raw: string): string {
    return raw.trim();
  }
});

const number = new StringConverter<number>({
  emptyRaw: "",
  emptyImpossible: true,
  rawValidate(raw) {
    // deal with case when string starts with .
    if (raw.startsWith(".")) {
      raw = "0" + raw;
    }
    return NUMBER_REGEX.test(raw);
  },
  convert(raw) {
    return +raw;
  },
  render(value, options) {
    return renderSeparators(value.toString(), options);
  },
  preprocessRaw(
    raw: string,
    options: StateConverterOptionsWithContext
  ): string {
    raw = raw.trim();
    return convertSeparators(raw, options);
  }
});

const integer = new StringConverter<number>({
  emptyRaw: "",
  emptyImpossible: true,
  rawValidate(raw) {
    return INTEGER_REGEX.test(raw);
  },
  convert(raw) {
    return +raw;
  },
  render(value) {
    return value.toString();
  },
  preprocessRaw(raw: string): string {
    return raw.trim();
  }
});

const boolean = new Converter<boolean, boolean>({
  emptyRaw: false,
  emptyImpossible: true,
  convert(raw) {
    return raw;
  },
  render(value) {
    return value;
  },
  defaultControlled: controlled.checked,
  neverRequired: true
});

export interface DecimalOptions {
  maxWholeDigits: number;
  decimalPlaces: number;
  allowNegative: boolean;
}

function decimal(
  options?:
    | Partial<DecimalOptions>
    | ((context: any) => Partial<DecimalOptions>)
) {
  function getOptions(context: any): DecimalOptions {
    if (typeof options === "function") {
      return getDecimalOptions(options(context));
    }
    if (options == null) {
      return { maxWholeDigits: 10, decimalPlaces: 2, allowNegative: true };
    }
    return getDecimalOptions(options);
  }

  function getDecimalOptions(options: Partial<DecimalOptions>) {
    const maxWholeDigits: number = options.maxWholeDigits || 10;
    const decimalPlaces: number =
      options.decimalPlaces == null ? 2 : options.decimalPlaces;
    const allowNegative: boolean =
      options.allowNegative == null ? true : options.allowNegative;
    return { maxWholeDigits, decimalPlaces, allowNegative };
  }

  function getRegex(context: any): RegExp {
    const options = getOptions(context);
    return new RegExp(
      `^${
        options.allowNegative ? `-?` : ``
      }(0|[1-9]\\d{0,${options.maxWholeDigits - 1}})(\\.\\d{0,${
        options.decimalPlaces
      }})?$`
    );
  }

  function trimDecimals(
    raw: string,
    options: StateConverterOptionsWithContext
  ) {
    const splitRaw = raw.split(".");
    if (typeof splitRaw[1] === "undefined") {
      return raw;
    }
    splitRaw[1] = splitRaw[1].substring(
      0,
      getOptions(options.context).decimalPlaces
    );
    if (splitRaw[1].length === 0) {
      raw = splitRaw.join("");
    } else {
      raw = splitRaw.join(".");
    }
    return raw;
  }

  return new StringConverter<string>({
    emptyRaw: "",
    emptyImpossible: true,
    defaultControlled: controlled.value,
    neverRequired: false,
    preprocessRaw(
      raw: string,
      options: StateConverterOptionsWithContext
    ): string {
      raw = raw.trim();
      return convertSeparators(raw, options);
    },
    rawValidate(raw, options) {
      if (raw === "" || raw === ".") {
        return false;
      }
      if (
        options.thousandSeparator === "." &&
        options.decimalSeparator == null
      ) {
        return false;
      }
      // deal with case when string starts with .
      if (raw.startsWith(".")) {
        raw = "0" + raw;
      }
      return getRegex(options.context).test(raw);
    },
    convert(raw, options) {
      return trimDecimals(raw, options);
    },
    render(value, options) {
      return renderSeparators(trimDecimals(value, options), options);
    }
  });
}

// XXX create a way to create arrays with mobx state tree types
const stringArray = new Converter<string[], IObservableArray<string>>({
  emptyRaw: [],
  emptyValue: observable.array([]),
  convert(raw) {
    return observable.array(raw);
  },
  render(value) {
    return value.slice();
  }
});

function maybe<R, V>(
  converter: StringConverter<V>
): IConverter<string, V | undefined>;
function maybe<M>(
  converter: IConverter<M | null, M | undefined>
): IConverter<M | null, M | undefined>;
function maybe<R, V>(
  converter: IConverter<R, V>
): IConverter<string, V | undefined> | IConverter<R | null, V | undefined> {
  if (converter instanceof StringConverter) {
    return new StringMaybe(converter, undefined);
  }
  return maybeModel(converter, null, undefined) as IConverter<
    R | null,
    V | undefined
  >;
}

function maybeNull<R, V>(
  converter: StringConverter<V>
): IConverter<string, V | null>;
function maybeNull<M>(
  converter: IConverter<M | null, M | null>
): IConverter<M | null, M | null>;
function maybeNull<R, V>(
  converter: IConverter<R, V>
): IConverter<string, V | null> | IConverter<R | null, V | null> {
  if (converter instanceof StringConverter) {
    return new StringMaybe(converter, null);
  }
  return maybeModel(converter, null, null) as IConverter<R | null, V | null>;
}

// XXX it would be nice if this could be a simple converter instead
// of a reimplementation. unfortunately the delegation to the
// underlying converter makes this impossible as it has a different
// and asynchronous API. We need to refactor this further in the future.
class StringMaybe<V, RE, VE> implements IConverter<string, V | VE> {
  emptyRaw: string;
  defaultControlled = controlled.value;
  neverRequired = false;
  emptyImpossible: boolean;

  constructor(public converter: IConverter<string, V>, public emptyValue: VE) {
    this.emptyRaw = "";
    this.emptyImpossible = false;
  }

  preprocessRaw(
    raw: string,
    options: StateConverterOptionsWithContext
  ): string {
    raw = raw.trim();
    return this.converter.preprocessRaw(raw, options);
  }

  async convert(
    raw: string,
    options: StateConverterOptionsWithContext
  ): Promise<ConversionResponse<V | VE>> {
    if (raw.trim() === "") {
      return new ConversionValue(this.emptyValue);
    }
    return this.converter.convert(raw, options);
  }

  render(value: V | VE, options: StateConverterOptionsWithContext): string {
    if (value === this.emptyValue) {
      return "";
    }
    return this.converter.render(value as V, options);
  }
}

function model<M extends IAnyModelType>(model: M) {
  return new Converter<Instance<M> | null, Instance<M>>({
    emptyRaw: null,
    emptyImpossible: true,
    defaultControlled: controlled.object,
    neverRequired: false,
    convert(raw) {
      if (raw == null) {
        throw new Error("Raw should never be null at this point");
      }
      return raw;
    },
    render(value) {
      return value;
    }
  });
}

function maybeModel<M, RE, VE>(
  converter: IConverter<M | RE, M | VE>,
  emptyRaw: RE,
  emptyValue: VE
): IConverter<M | RE, M | VE> {
  return new Converter({
    emptyRaw: emptyRaw,
    emptyValue: emptyValue,
    convert: (r: M | RE) => (r !== emptyRaw ? (r as M) : emptyValue),
    render: (v: M | VE) => (v !== emptyValue ? (v as M) : emptyRaw),
    defaultControlled: controlled.object
  });
}

const object = new Converter<any, any>({
  emptyRaw: null,
  emptyValue: undefined,
  convert: identity,
  render: identity
});

export const converters = {
  string,
  number,
  integer,
  decimal,
  boolean,
  stringArray,
  maybe,
  maybeNull,
  model,
  object
};
