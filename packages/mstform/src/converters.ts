import { IObservableArray, observable } from "mobx";
import {
  ConversionResponse,
  ConversionValue,
  Converter,
  IConverter
} from "./converter";

const NUMBER_REGEX = new RegExp("^-?(0|[1-9]\\d*)(\\.\\d*)?$");
const INTEGER_REGEX = new RegExp("^-?(0|[1-9]\\d*)$");

const string = new Converter<string, string>({
  convert(raw) {
    return raw;
  },
  render(value) {
    return value;
  }
});

const number = new Converter<string, number>({
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

const integer = new Converter<string, number>({
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

class Decimal implements IConverter<string, string> {
  public converter: Converter<string, string>;

  constructor(public maxWholeDigits: number, public decimalPlaces: number) {
    const regex = new RegExp(
      `^-?(0|[1-9]\\d{0,${maxWholeDigits - 1}})(\\.\\d{0,${decimalPlaces}})?$`
    );
    this.converter = new Converter<string, string>({
      rawValidate(raw) {
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

function decimal(
  maxDigits: number,
  decimalPlaces: number
): IConverter<string, string> {
  return new Decimal(maxDigits, decimalPlaces);
}

class Maybe<V> implements IConverter<string, V | null> {
  constructor(public converter: Converter<string, V>) {}
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

export function maybe<R, V>(
  converter: Converter<string, V>
): IConverter<string, V | null> {
  return new Maybe(converter);
}

// XXX create a way to create arrays with mobx state tree types
const stringArray = new Converter<string[], IObservableArray<string>>({
  convert(raw) {
    return observable.array(raw);
  },
  render(value) {
    return value;
  }
});

export const converters = {
  string,
  number,
  integer,
  decimal,
  stringArray,
  maybe
};
