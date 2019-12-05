import { IObservableArray, observable } from "mobx";
import { IAnyModelType, Instance } from "mobx-state-tree";
import {
  Converter,
  IConverter,
  StateConverterOptionsWithContext,
  ConversionError,
  withDefaults
} from "./converter";
import { controlled } from "./controlled";
import { dynamic } from "./dynamic-converter";

import { identity } from "./utils";
import {
  parseDecimal,
  renderDecimal,
  DecimalOptions,
  DecimalParserError,
  checkConverterOptions
} from "./decimalParser";

const INTEGER_REGEX = new RegExp("^-?(0|[1-9]\\d*)$");

export class StringConverter<V> extends Converter<string, V> {
  defaultControlled = controlled.value;
}

type StringOptions = {
  maxLength: number;
};

function stringWithOptions(options?: StringOptions) {
  return new StringConverter<string>({
    emptyRaw: "",
    emptyValue: "",
    convert(raw) {
      if (options != null && options.maxLength < raw.length) {
        throw new ConversionError("exceedsMaxLength");
      }
      return raw;
    },
    render(value) {
      return value;
    },
    preprocessRaw(raw: string): string {
      return raw.trim();
    }
  });
}

const string = stringWithOptions();

type NumberOptions = {};

function numberWithOptions(options?: NumberOptions) {
  return new StringConverter<number>({
    emptyRaw: "",
    emptyImpossible: true,
    convert(raw, converterOptions) {
      checkConverterOptions(converterOptions);
      try {
        return +parseDecimal(raw, {
          maxWholeDigits: 100,
          decimalPlaces: 100,
          allowNegative: true,
          addZeroes: false,
          decimalSeparator: converterOptions.decimalSeparator || ".",
          thousandSeparator: converterOptions.thousandSeparator || ",",
          renderThousands: converterOptions.renderThousands || false
        });
      } catch (e) {
        if (e instanceof DecimalParserError) {
          throw new ConversionError(e.type);
        }
        throw e;
      }
    },
    render(value, converterOptions) {
      return renderDecimal(value.toString(), {
        maxWholeDigits: 100,
        decimalPlaces: 100,
        allowNegative: true,
        addZeroes: false,
        decimalSeparator: converterOptions.decimalSeparator || ".",
        thousandSeparator: converterOptions.thousandSeparator || ",",
        renderThousands: converterOptions.renderThousands || false
      });
    },
    preprocessRaw(
      raw: string,
      options: StateConverterOptionsWithContext
    ): string {
      return raw.trim();
    }
  });
}

const number = numberWithOptions();

type IntegerOptions = {};

function integerWithOptions(options?: IntegerOptions) {
  return new StringConverter<number>({
    emptyRaw: "",
    emptyImpossible: true,
    convert(raw) {
      if (!INTEGER_REGEX.test(raw)) {
        throw new ConversionError();
      }
      return +raw;
    },
    render(value) {
      return value.toString();
    },
    preprocessRaw(raw: string): string {
      return raw.trim();
    }
  });
}

const integer = integerWithOptions();

type BooleanOptions = {};

function booleanWithOptions(options?: BooleanOptions) {
  return new Converter<boolean, boolean>({
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
}

const boolean = booleanWithOptions();

function decimal(options: DecimalOptions) {
  return new StringConverter<string>({
    emptyRaw: "",
    emptyImpossible: true,
    defaultControlled: controlled.value,
    neverRequired: false,
    preprocessRaw(raw: string): string {
      return raw.trim();
    },
    convert(raw, converterOptions) {
      checkConverterOptions(converterOptions);
      try {
        return parseDecimal(raw, {
          ...options,
          decimalSeparator: converterOptions.decimalSeparator || ".",
          thousandSeparator: converterOptions.thousandSeparator || ",",
          renderThousands: converterOptions.renderThousands || false
        });
      } catch (e) {
        if (e instanceof DecimalParserError) {
          throw new ConversionError(e.type);
        }
        throw e;
      }
    },
    render(value, converterOptions) {
      return renderDecimal(value, {
        ...options,
        decimalSeparator: converterOptions.decimalSeparator || ".",
        thousandSeparator: converterOptions.thousandSeparator || ",",
        renderThousands: converterOptions.renderThousands || false
      });
    }
  });
}

type StringArrayOptions = {};

// XXX create a way to create arrays with mobx state tree types
function stringArrayWithOptions(options?: StringArrayOptions) {
  return new Converter<string[], IObservableArray<string>>({
    emptyRaw: [],
    emptyValue: observable.array([]),
    convert(raw) {
      return observable.array(raw);
    },
    render(value) {
      return value.slice();
    }
  });
}

const stringArray = stringArrayWithOptions();

type TextStringArrayOptions = {};

function textStringArrayWithOptions(options?: TextStringArrayOptions) {
  return new Converter<string, IObservableArray<string>>({
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
}

const textStringArray = textStringArrayWithOptions();

function maybe<R, V>(
  converter: StringConverter<V>
): IConverter<string, V | undefined>;
function maybe<M>(
  converter: IConverter<M | null, M | undefined>
): IConverter<M | null, M | undefined>;
function maybe<R, V>(
  converter: IConverter<R, V>
): IConverter<string, V | undefined> | IConverter<R | null, V | undefined> {
  // we detect that we're converting a string, which needs a special maybe
  if (typeof converter.emptyRaw === "string") {
    return stringMaybe(
      (converter as unknown) as IConverter<string, V>,
      undefined
    );
  }
  // XXX add an 'as any' as we get a typeerror for some reason now
  return maybeModel(converter as any, null, undefined) as IConverter<
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
  // we detect that we're converting a string, which needs a special maybe
  if (typeof converter.emptyRaw === "string") {
    return stringMaybe(
      (converter as unknown) as IConverter<string, V | null>,
      null
    );
  }
  // XXX add an 'as any' as we get a typeerror for some reason now
  return maybeModel(converter as any, null, null) as IConverter<
    R | null,
    V | null
  >;
}

function stringMaybe<V>(converter: IConverter<string, V>, emptyValue: V) {
  return new Converter<string, V>({
    emptyRaw: "",
    emptyValue: emptyValue,
    defaultControlled: controlled.value,
    preprocessRaw(
      raw: string,
      options: StateConverterOptionsWithContext
    ): string {
      raw = raw.trim();
      return converter.preprocessRaw(raw, options);
    },
    convert(raw: string, options: StateConverterOptionsWithContext) {
      if (raw.trim() === "") {
        return emptyValue;
      }
      const r = converter.convert(raw, options);
      if (r instanceof ConversionError) {
        throw r;
      }
      return r.value;
    },
    render(value: V, options: StateConverterOptionsWithContext) {
      if (value === this.emptyValue) {
        return "";
      }
      return converter.render(value, options);
    }
  });
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
  converter: IConverter<M, M>,
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
  stringWithOptions: withDefaults(stringWithOptions, {
    maxLength: 255
  }),
  number,
  integer,
  decimal: withDefaults(decimal, {
    maxWholeDigits: 10,
    decimalPlaces: 2,
    allowNegative: true,
    addZeroes: true
  }),
  boolean,
  textStringArray,
  stringArray,
  maybe,
  maybeNull,
  model,
  object,
  dynamic
};
