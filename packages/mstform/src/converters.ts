import { IObservableArray, observable } from "mobx";
import { Converter } from "./converter";

const NUMBER_REGEX = new RegExp("^-?(0|[1-9]\\d*)(\\.\\d+)?$");

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
  stringArray
};
