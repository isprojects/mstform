import { configure } from "mobx";
import { Converter, ProcessValue, conversionError } from "../src/converter";

configure({ enforceActions: "strict" });

test("simple converter", async () => {
  const converter = new Converter<string, string>({
    convert: raw => raw,
    render: value => value,
    getRaw: value => value
  });

  const result = await converter.process("foo");
  expect(result).toBeInstanceOf(ProcessValue);
  expect((result as ProcessValue<string>).value).toEqual("foo");

  // the string "ConversionError" is a valid text to convert
  const result2 = await converter.process("ConversionError");
  expect(result2).toBeInstanceOf(ProcessValue);
  expect((result2 as ProcessValue<string>).value).toEqual("ConversionError");
});

test("converter to integer", async () => {
  const converter = new Converter<string, number>({
    rawValidate: raw => /^\d+$/.test(raw),
    convert: raw => parseInt(raw, 10),
    render: value => value.toString(),
    getRaw: value => value
  });

  const result = await converter.process("3");
  expect(result).toBeInstanceOf(ProcessValue);
  expect((result as ProcessValue<number>).value).toEqual(3);

  const result2 = await converter.process("not a number");
  expect(result2).toEqual(conversionError);
});

test("converter with validate", async () => {
  const converter = new Converter<string, number>({
    convert: raw => parseInt(raw, 10),
    render: value => value.toString(),
    validate: value => value <= 10,
    getRaw: value => value
  });

  const result = await converter.process("3");
  expect(result).toBeInstanceOf(ProcessValue);
  expect((result as ProcessValue<number>).value).toEqual(3);

  const result2 = await converter.process("100");
  expect(result2).toEqual(conversionError);
});
