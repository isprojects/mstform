import {
  CONVERSION_ERROR,
  ConversionValue,
  IConverter,
  converters
} from "../src";

async function check(
  converter: IConverter<any, any>,
  value: any,
  expected: any
) {
  const r = await converter.convert(value);
  expect(r).toBeInstanceOf(ConversionValue);
  expect((r as ConversionValue<any>).value).toEqual(expected);
}

async function fails(converter: IConverter<any, any>, value: any) {
  const r = await converter.convert(value);
  expect(r).toBe(CONVERSION_ERROR);
}

test("string converter", async () => {
  await check(converters.string, "foo", "foo");
  await check(converters.string, "", "");
});

test("number converter", async () => {
  await check(converters.number, "3", 3);
  await check(converters.number, "3.14", 3.14);
  await check(converters.number, "-3.14", -3.14);
  await fails(converters.number, "foo");
});

test("maybe number converter", async () => {
  await check(converters.maybe(converters.number), "3", 3);
  await check(converters.maybe(converters.number), "", null);
});
