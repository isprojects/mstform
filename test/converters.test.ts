import { types } from "mobx-state-tree";
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
  await check(converters.number, ".14", 0.14);
  await check(converters.number, "19.14", 19.14);
  await check(converters.number, "19.", 19);
  await check(converters.number, "-3.14", -3.14);
  await fails(converters.number, "foo");
  await fails(converters.number, "1foo");
  await fails(converters.number, "");
});

test("integer converter", async () => {
  await check(converters.integer, "3", 3);
  await fails(converters.integer, "3.14");
  await fails(converters.integer, ".14");
  await check(converters.integer, "0", 0);
  await check(converters.integer, "-3", -3);
  await fails(converters.integer, "foo");
  await fails(converters.integer, "1foo");
  await fails(converters.integer, "");
});

test("decimal converter", async () => {
  await check(converters.decimal({}), "3", "3");
  await check(converters.decimal({}), "3.14", "3.14");
  await check(converters.decimal({}), "43.14", "43.14");
  await check(converters.decimal({}), "4313", "4313");
  await check(converters.decimal({}), "-3.14", "-3.14");
  await check(converters.decimal({}), "0", "0");
  await check(converters.decimal({}), ".14", ".14");
  await check(converters.decimal({}), "14.", "14.");
  await fails(converters.decimal({}), "foo");
  await fails(converters.decimal({}), "1foo");
  await fails(converters.decimal({}), "");
  await fails(converters.decimal({}), ".");
  await fails(converters.decimal({ maxWholeDigits: 4 }), "12345.34");
  await fails(converters.decimal({ decimalPlaces: 2 }), "12.444");
  await fails(converters.decimal({ allowNegative: false }), "-45.34");
});

test("boolean converter", async () => {
  await check(converters.boolean, false, false);
  await check(converters.boolean, true, true);
});

test("maybe number converter", async () => {
  await check(converters.maybeNull(converters.number), "3", 3);
  await check(converters.maybeNull(converters.number), "", null);
});

test("maybe decimal converter", async () => {
  await check(converters.maybeNull(converters.decimal()), "3.14", "3.14");
  await check(converters.maybeNull(converters.decimal()), "", null);
  const c = converters.maybeNull(converters.decimal());
  expect(c.render(null)).toEqual("");
});

test("maybe string converter", async () => {
  await check(converters.maybeNull(converters.string), "foo", "foo");
  await check(converters.maybeNull(converters.string), "", null);
});

test("model converter", async () => {
  const M = types.model("M", {
    foo: types.string
  });
  const o = M.create({
    foo: "FOO"
  });
  const converter = converters.model(M);
  const r = await converter.convert({ foo: "value" });
  expect(r).toEqual({ value: { foo: "value" } });
  const r2 = await converter.convert(o);
  expect(r2).toEqual({ value: o });
});

test("maybe model converter", async () => {
  const M = types.model("M", {
    foo: types.string
  });
  const o = M.create({
    foo: "FOO"
  });
  const converter = converters.maybeNull(converters.model(M));
  const r = await converter.convert({ foo: "value" });
  expect(r).toEqual({ value: { foo: "value" } });
  const r2 = await converter.convert(o);
  expect(r2).toEqual({ value: o });
  const r3 = await converter.convert(null);
  expect(r3).toEqual({ value: null });
});

test("object converter", async () => {
  const M = types.model("M", {
    foo: types.string
  });
  const o = M.create({
    foo: "FOO"
  });
  const converter = converters.object;
  const r = await converter.convert({ foo: "value" });
  expect(r).toEqual({ value: { foo: "value" } });
  const r2 = await converter.convert(o);
  expect(r2).toEqual({ value: o });
  const r3 = await converter.convert(null);
  expect(r3).toEqual({ value: null });
});
