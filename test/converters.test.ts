import { types } from "mobx-state-tree";
import {
  CONVERSION_ERROR,
  ConversionValue,
  Field,
  Form,
  IConverter,
  converters,
  StateConverterOptionsWithContext
} from "../src";

async function check(
  converter: IConverter<any, any>,
  value: any,
  expected: any
) {
  const processedValue = converter.preprocessRaw(value, {});
  const r = await converter.convert(processedValue, {});
  expect(r).toBeInstanceOf(ConversionValue);
  expect((r as ConversionValue<any>).value).toEqual(expected);
}

async function checkWithOptions(
  converter: IConverter<any, any>,
  value: any,
  expected: any,
  options: StateConverterOptionsWithContext
) {
  const processedValue = converter.preprocessRaw(value, options);
  const r = await converter.convert(processedValue, options);
  expect(r).toBeInstanceOf(ConversionValue);
  expect((r as ConversionValue<any>).value).toEqual(expected);
}

async function fails(converter: IConverter<any, any>, value: any) {
  const r = await converter.convert(value, {});
  expect(r).toBe(CONVERSION_ERROR);
}

async function failsWithOptions(
  converter: IConverter<any, any>,
  value: any,
  options: StateConverterOptionsWithContext
) {
  const processedValue = converter.preprocessRaw(value, options);
  const r = await converter.convert(processedValue, options);
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
  await checkWithOptions(converters.number, "1234,56", 1234.56, {
    decimalSeparator: ","
  });
  await checkWithOptions(converters.number, "4.000,000000", 4000, {
    decimalSeparator: ",",
    thousandSeparator: "."
  });
  await fails(converters.number, "foo");
  await fails(converters.number, "1foo");
  await fails(converters.number, "");
  await failsWithOptions(converters.number, "1,23.45", {
    decimalSeparator: ".",
    thousandSeparator: ","
  });
  await failsWithOptions(converters.number, ",12345", {
    thousandSeparator: ","
  });
  await failsWithOptions(converters.number, "1234,567", {
    thousandSeparator: ","
  });
  await failsWithOptions(converters.number, "12.3,456", {
    decimalSeparator: ".",
    thousandSeparator: ","
  });
  await failsWithOptions(converters.number, "1.1,1", {
    decimalSeparator: ",",
    thousandSeparator: "."
  });
  await failsWithOptions(converters.number, "1,1.1", {
    decimalSeparator: ",",
    thousandSeparator: "."
  });
});

test("number converter with both options", async () => {
  await checkWithOptions(converters.number, "4.314.314,31", 4314314.31, {
    decimalSeparator: ",",
    thousandSeparator: "."
  });
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
  await checkWithOptions(converters.decimal({}), "43,14", "43.14", {
    decimalSeparator: ","
  });
  await checkWithOptions(
    converters.decimal({ decimalPlaces: 6 }),
    "4.000,000000",
    "4000.000000",
    {
      decimalSeparator: ",",
      thousandSeparator: "."
    }
  );
  await checkWithOptions(
    converters.decimal({ decimalPlaces: 2 }),
    "36.365,21",
    "36365.21",
    {
      decimalSeparator: ",",
      thousandSeparator: ".",
      renderThousands: true
    }
  );
  await fails(converters.decimal({}), "foo");
  await fails(converters.decimal({}), "1foo");
  await fails(converters.decimal({}), "");
  await fails(converters.decimal({}), ".");
  await fails(converters.decimal({ maxWholeDigits: 4 }), "12345.34");
  await fails(converters.decimal({ decimalPlaces: 2 }), "12.444");
  await fails(converters.decimal({ allowNegative: false }), "-45.34");
  await failsWithOptions(converters.decimal({}), "1,23.45", {
    decimalSeparator: ".",
    thousandSeparator: ","
  });
  await failsWithOptions(converters.decimal({}), ",12345", {
    thousandSeparator: ","
  });
  await failsWithOptions(converters.decimal({}), "1234,567", {
    thousandSeparator: ","
  });
  await failsWithOptions(converters.decimal({}), "12.3,456", {
    decimalSeparator: ".",
    thousandSeparator: ","
  });
  await failsWithOptions(converters.decimal({}), "1.1,1", {
    decimalSeparator: ",",
    thousandSeparator: "."
  });
  await failsWithOptions(converters.decimal({}), "1,1.1", {
    decimalSeparator: ",",
    thousandSeparator: "."
  });
});

test("decimal converter with both options", async () => {
  await checkWithOptions(converters.decimal({}), "4.314.314,31", "4314314.31", {
    decimalSeparator: ",",
    thousandSeparator: "."
  });
});

test("decimal converter render with renderThousands false", async () => {
  const converter = converters.decimal({});
  const options = {
    decimalSeparator: ",",
    thousandSeparator: ".",
    renderThousands: false
  };
  const value = "4.314.314,31";
  const processedValue = converter.preprocessRaw(value, options);
  const converted = await converter.convert(processedValue, options);
  const rendered = await converter.render(
    (converted as ConversionValue<any>).value,
    options
  );
  expect(rendered).toEqual("4314314,31");
});

test("decimal converter render with six decimals", async () => {
  const converter = converters.decimal({ decimalPlaces: 6 });
  const options = {
    decimalSeparator: ",",
    thousandSeparator: ".",
    renderThousands: true
  };
  const value = "4.000000";
  const processedValue = converter.preprocessRaw(value, options);
  const converted = await converter.convert(processedValue, options);
  const rendered = await converter.render(
    (converted as ConversionValue<any>).value,
    options
  );
  expect(rendered).toEqual("4,000000");
});

test("decimal converter render with six decimals and thousand separators", async () => {
  const converter = converters.decimal({ decimalPlaces: 6 });
  const options = {
    decimalSeparator: ",",
    thousandSeparator: ".",
    renderThousands: true
  };
  const value = "4000000.000000";
  const processedValue = converter.preprocessRaw(value, options);
  const converted = await converter.convert(processedValue, options);
  const rendered = await converter.render(
    (converted as ConversionValue<any>).value,
    options
  );
  expect(rendered).toEqual("4.000.000,000000");
});

test("decimal converter render with six decimals, only showing three", async () => {
  const converter = converters.decimal({ decimalPlaces: 3 });
  const options = {
    decimalSeparator: ",",
    thousandSeparator: ".",
    renderThousands: true
  };
  const value = "4000.000000";
  const rendered = await converter.render(value, options);
  expect(rendered).toEqual("4.000,000");
});

test("decimal converter with thousandSeparator . and no decimalSeparator can't convert", async () => {
  let message = false;
  const converter = converters.decimal();
  const options = {
    thousandSeparator: ".",
    renderThousands: true
  };
  const value = "4.000";
  const processedValue = converter.preprocessRaw(value, options);
  try {
    await converter.convert(processedValue, options);
  } catch (e) {
    message = e.message;
  }
  expect(message).toBeTruthy();
});

test("do not convert a normal string with decimal options", async () => {
  await checkWithOptions(converters.string, "43,14", "43,14", {
    decimalSeparator: ","
  });
});

test("boolean converter", async () => {
  await check(converters.boolean, false, false);
  await check(converters.boolean, true, true);
});

test("maybe number converter", async () => {
  await check(converters.maybe(converters.number), "3", 3);
  await check(converters.maybe(converters.number), "", undefined);
});

test("maybeNull number converter", async () => {
  await check(converters.maybeNull(converters.number), "3", 3);
  await check(converters.maybeNull(converters.number), "", null);
});

test("maybe decimal converter", async () => {
  await check(converters.maybe(converters.decimal()), "3.14", "3.14");
  await check(converters.maybe(converters.decimal()), "", undefined);
  const c = converters.maybe(converters.decimal());
  expect(c.render(undefined, {})).toEqual("");
});

test("maybeNull decimal converter", async () => {
  await check(converters.maybeNull(converters.decimal()), "3.14", "3.14");
  await check(converters.maybeNull(converters.decimal()), "", null);
  const c = converters.maybeNull(converters.decimal());
  expect(c.render(null, {})).toEqual("");
});

test("maybe string converter", async () => {
  await check(converters.maybe(converters.string), "foo", "foo");
  await check(converters.maybe(converters.string), "", undefined);
});

test("maybeNull string converter", async () => {
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
  const r = await converter.convert({ foo: "value" }, {});
  expect(r).toEqual({ value: { foo: "value" } });
  const r2 = await converter.convert(o, {});
  expect(r2).toEqual({ value: o });
});

test("maybe model converter", async () => {
  const M = types.model("M", {
    foo: types.string
  });
  const o = M.create({
    foo: "FOO"
  });
  const converter = converters.maybe(converters.model(M));
  const r = await converter.convert({ foo: "value" }, {});
  expect(r).toEqual({ value: { foo: "value" } });
  const r2 = await converter.convert(o, {});
  expect(r2).toEqual({ value: o });
  // we use null as the sentinel value for raw
  const r3 = await converter.convert(null, {});
  expect(r3).toEqual({ value: undefined });
});

test("maybeNull model converter", async () => {
  const M = types.model("M", {
    foo: types.string
  });
  const o = M.create({
    foo: "FOO"
  });
  const converter = converters.maybeNull(converters.model(M));
  const r = await converter.convert({ foo: "value" }, {});
  expect(r).toEqual({ value: { foo: "value" } });
  const r2 = await converter.convert(o, {});
  expect(r2).toEqual({ value: o });
  const r3 = await converter.convert(null, {});
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
  const r = await converter.convert({ foo: "value" }, {});
  expect(r).toEqual({ value: { foo: "value" } });
  const r2 = await converter.convert(o, {});
  expect(r2).toEqual({ value: o });
  const r3 = await converter.convert(null, {});
  expect(r3).toEqual({ value: null });
});

test("dynamic decimal converter", async () => {
  const context = { options: { decimalPlaces: 0 } };

  function currency() {
    return converters.decimal(context => context.options);
  }

  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(currency())
  });

  const o = M.create({ foo: "4" });

  const state = form.state(o, { context: context });
  const field = state.field("foo");

  await field.setRaw("3.141");
  expect(field.raw).toEqual("3.141");
  expect(field.value).toEqual("4"); // conversion error
  expect(field.error).toEqual("Could not convert");
  context.options = { decimalPlaces: 3 };
  await field.setRaw("3.141");
  expect(field.raw).toEqual("3.141");
  expect(field.value).toEqual("3.141"); // conversion succeeds
  expect(field.error).toBeUndefined();
  context.options = { decimalPlaces: 2 };
  expect(field.raw).toEqual("3.141");
  expect(field.value).toEqual("3.141"); // nothing happens until field is touched
  expect(field.error).toBeUndefined();
  await field.setRaw("3.141"); // touch field again
  expect(field.raw).toEqual("3.141");
  expect(field.value).toEqual("3.141");
  expect(field.error).toEqual("Could not convert");
});
