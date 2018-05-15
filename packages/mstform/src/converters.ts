import { IObservableArray, observable } from "mobx";
import {
  ConversionResponse,
  ConversionValue,
  Converter,
  IConverter
} from "./converter";

const NUMBER_REGEX = new RegExp("^-?(0|[1-9]\\d*)(\\.\\d+)?$");
const INTEGER_REGEX = new RegExp("^-?(0|[1-9]\\d*)$");

const string = new Converter<string, string>({
  convert(raw) {
    return raw;
  },
  render(value) {
    return value;
  },
  getRaw(value: any) {
    return value;
  }
});

const number = new Converter<string, number>({
  rawValidate(raw) {
    return NUMBER_REGEX.test(raw);
  },
  convert(raw) {
    return +raw;
  },
  render(value) {
    return value.toString();
  },
  getRaw(value: any) {
    return value;
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
  },
  getRaw(value: any) {
    return value;
  }
});

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

  getRaw(value: any) {
    return value;
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
  },
  getRaw(value: any) {
    return value;
  }
});

export const converters = {
  string,
  number,
  integer,
  stringArray,
  maybe
};
