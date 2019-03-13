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
import {
  checkConverterOptions,
  convertSeparators,
  DecimalOptions,
  getRegex,
  renderSeparators,
  trimDecimals,
  getOptions
} from "./decimal";

const NUMBER_REGEX = new RegExp("^-?(0|[1-9]\\d*)(\\.\\d*)?$");
const INTEGER_REGEX = new RegExp("^-?(0|[1-9]\\d*)$");

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

function decimal(
  decimalOptions?:
    | Partial<DecimalOptions>
    | ((context: any) => Partial<DecimalOptions>)
) {
  return new StringConverter<string>({
    emptyRaw: "",
    emptyImpossible: true,
    defaultControlled: controlled.value,
    neverRequired: false,
    preprocessRaw(
      raw: string,
      converterOptions: StateConverterOptionsWithContext
    ): string {
      raw = raw.trim();
      return convertSeparators(raw, converterOptions);
    },
    rawValidate(raw, converterOptions) {
      if (raw === "" || raw === ".") {
        return false;
      }
      checkConverterOptions(converterOptions);
      // deal with case when string starts with .
      if (raw.startsWith(".")) {
        raw = "0" + raw;
      }
      return getRegex(converterOptions.context, decimalOptions).test(raw);
    },
    convert(raw) {
      return raw;
    },
    render(value, converterOptions) {
      return renderSeparators(
        trimDecimals(value, converterOptions, decimalOptions),
        converterOptions
      );
    },
    postprocessRaw(raw, converterOptions) {
      const options = getOptions(converterOptions.context, decimalOptions);
      if (options.decimalPlaces === 0) {
        return raw;
      }
      const decimalSeparator = converterOptions.decimalSeparator || ".";
      const splitRaw = raw.split(decimalSeparator);
      // if there is no decimal separator, add it along a number of zeroes equal
      // to decimal places.
      if (splitRaw.length === 1) {
        return raw + decimalSeparator + "0".repeat(options.decimalPlaces);
      }
      // else, add a number of zeroes equal to decimal places minus the number
      // of decimals already present.
      return raw + "0".repeat(options.decimalPlaces - splitRaw[1].length);
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

const textStringArray = new Converter<string, IObservableArray<string>>({
  emptyRaw: "",
  emptyValue: observable.array([]),
  defaultControlled: controlled.value,
  convert(raw) {
    const rawSplit = raw.split("\n").map(r => r.trim());
    if (rawSplit.length === 1 && rawSplit[0] === "") {
      return observable.array([]);
    }
    return observable.array(rawSplit);
  },
  render(value) {
    return value.join("\n");
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

  hasPostprocessRaw() {
    return false;
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
  textStringArray,
  stringArray,
  maybe,
  maybeNull,
  model,
  object
};
