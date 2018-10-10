import { IObservableArray, observable } from "mobx";
import { IModelType } from "mobx-state-tree";
import {
  CONVERSION_ERROR,
  ConversionResponse,
  ConversionValue,
  Converter,
  IConverter
} from "./converter";
import { Controlled, controlled } from "./controlled";
import { identity } from "./utils";

const NUMBER_REGEX = new RegExp("^-?(0|[1-9]\\d*)(\\.\\d*)?$");
const INTEGER_REGEX = new RegExp("^-?(0|[1-9]\\d*)$");

export class StringConverter<V> extends Converter<string, V> {
  defaultControlled = controlled.value;
  preprocessRaw(raw: string): string {
    return raw.trim();
  }
}

const string = new StringConverter<string>({
  emptyRaw: "",
  convert(raw) {
    return raw;
  },
  render(value) {
    return value;
  }
});

const number = new StringConverter<number>({
  emptyRaw: "",
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
  render(value) {
    return value.toString();
  }
});

const integer = new StringConverter<number>({
  emptyRaw: "",
  rawValidate(raw) {
    return INTEGER_REGEX.test(raw);
  },
  convert(raw) {
    return +raw;
  },
  render(value) {
    return value.toString();
  }
});

const boolean = new Converter<boolean, boolean>({
  emptyRaw: false,
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
  maxWholeDigits?: number;
  decimalPlaces?: number;
  allowNegative?: boolean;
}

class Decimal implements IConverter<string, string> {
  public converter: StringConverter<string>;

  emptyRaw: string;
  defaultControlled = controlled.value;
  neverRequired = false;

  constructor(options?: DecimalOptions) {
    const maxWholeDigits: number =
      options == null || !options.maxWholeDigits ? 10 : options.maxWholeDigits;
    const decimalPlaces: number =
      options == null || !options.decimalPlaces ? 2 : options.decimalPlaces;
    const allowNegative: boolean =
      options == null || options.allowNegative == null
        ? true
        : options.allowNegative;

    this.emptyRaw = "";
    const regex = new RegExp(
      `^${allowNegative ? `-?` : ``}(0|[1-9]\\d{0,${maxWholeDigits -
        1}})(\\.\\d{0,${decimalPlaces}})?$`
    );

    this.converter = new StringConverter<string>({
      emptyRaw: "",
      rawValidate(raw) {
        if (raw === "" || raw === ".") {
          return false;
        }
        // deal with case when string starts with .
        if (raw.startsWith(".")) {
          raw = "0" + raw;
        }
        return regex.test(raw);
      },
      convert(raw) {
        return raw;
      },
      render(value) {
        return value;
      }
    });
  }

  preprocessRaw(raw: string): string {
    return raw.trim();
  }

  convert(raw: string) {
    return this.converter.convert(raw);
  }
  render(value: string) {
    return this.converter.render(value);
  }
  getRaw(value: any) {
    return value;
  }
}

function decimal(options?: DecimalOptions): IConverter<string, string> {
  return new Decimal(options);
}

// XXX create a way to create arrays with mobx state tree types
const stringArray = new Converter<string[], IObservableArray<string>>({
  emptyRaw: [],
  convert(raw) {
    return observable.array(raw);
  },
  render(value) {
    return value.slice();
  }
});

// this works with string converters and also with models
function maybe<R, V>(
  converter: StringConverter<V>
): IConverter<string, V | null>;
function maybe<R>(converter: IConverter<R, R>): IConverter<R | null, R | null>;
function maybe<R, V>(
  converter: Converter<string, V> | IConverter<R, R>
): IConverter<string, V | null> | IConverter<R | null, R | null> {
  if (converter instanceof StringConverter) {
    return new StringMaybe(converter);
  }
  return maybeModel(converter as IConverter<R, R>);
}

class StringMaybe<V> implements IConverter<string, V | null> {
  emptyRaw: string;
  defaultControlled = controlled.value;
  neverRequired = false;

  constructor(public converter: StringConverter<V>) {
    this.emptyRaw = "";
  }

  preprocessRaw(raw: string): string {
    return raw.trim();
  }

  async convert(raw: string): Promise<ConversionResponse<V | null>> {
    if (raw.trim() === "") {
      return new ConversionValue(null);
    }
    return this.converter.convert(raw);
  }

  render(value: V | null): string {
    if (value === null) {
      return "";
    }
    return this.converter.render(value);
  }
}

class Model<M> implements IConverter<M | null, M> {
  emptyRaw: M | null;
  defaultControlled: Controlled;
  neverRequired = false;

  constructor(model: IModelType<any, M>) {
    this.emptyRaw = null;
    this.defaultControlled = controlled.object;
  }
  preprocessRaw(raw: M): M {
    return raw;
  }

  async convert(raw: M | null): Promise<ConversionResponse<M>> {
    if (raw === null) {
      return CONVERSION_ERROR;
    }
    return new ConversionValue(raw);
  }

  render(value: M): M {
    return value;
  }
}

function model<M>(model: IModelType<any, M>): IConverter<M | null, M> {
  return new Model(model);
}

function maybeModel<M>(
  converter: IConverter<M, M>
): IConverter<M | null, M | null> {
  return new Converter({
    emptyRaw: null,
    convert: identity,
    render: identity,
    defaultControlled: controlled.object
  });
}

const object = new Converter<any, any>({
  emptyRaw: null,
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
  model,
  object
};
