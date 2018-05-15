import { configure } from "mobx";
import { CONVERSION_ERROR, ConversionValue, Converter } from "../src/converter";

configure({ enforceActions: "strict" });

test("simple converter", async () => {
  const converter = new Converter<string, string>({
    convert: raw => raw,
    render: value => value,
    getRaw: value => value
  });

  const result = await converter.convert("foo");
  expect(result).toBeInstanceOf(ConversionValue);
  expect((result as ConversionValue<string>).value).toEqual("foo");

  // the string "ConversionError" is a valid text to convert
  const result2 = await converter.convert("ConversionError");
  expect(result2).toBeInstanceOf(ConversionValue);
  expect((result2 as ConversionValue<string>).value).toEqual("ConversionError");
});

test("converter to integer", async () => {
  const converter = new Converter<string, number>({
    rawValidate: raw => /^\d+$/.test(raw),
    convert: raw => parseInt(raw, 10),
    render: value => value.toString(),
    getRaw: value => value
  });

  const result = await converter.convert("3");
  expect(result).toBeInstanceOf(ConversionValue);
  expect((result as ConversionValue<number>).value).toEqual(3);

  const result2 = await converter.convert("not a number");
  expect(result2).toEqual(CONVERSION_ERROR);
});

test("converter with validate", async () => {
  const converter = new Converter<string, number>({
    convert: raw => parseInt(raw, 10),
    render: value => value.toString(),
    validate: value => value <= 10,
    getRaw: value => value
  });

  const result = await converter.convert("3");
  expect(result).toBeInstanceOf(ConversionValue);
  expect((result as ConversionValue<number>).value).toEqual(3);

  const result2 = await converter.convert("100");
  expect(result2).toEqual(CONVERSION_ERROR);
});

test("converter with async validate", async () => {
  const done: any[] = [];

  const converter = new Converter<string, string>({
    convert: raw => raw,
    validate: async value => {
      await new Promise(resolve => {
        done.push(resolve);
      });
      return true;
    },
    render: value => value,
    getRaw: value => value
  });

  const result = converter.convert("foo");
  done[0]();
  const v = await result;
  expect((v as ConversionValue<string>).value).toEqual("foo");
});
