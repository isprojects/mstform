import { types } from "mobx-state-tree";
import { Decimal } from "decimal.js-light";
import {
  ConversionError,
  ConversionValue,
  Field,
  Form,
  converters,
  StateConverterOptionsWithContext,
  FieldAccessor
} from "../src";
import { ConverterOrFactory, makeConverter } from "../src/converter";

const baseOptions = {
  // a BIG lie. but we don't really have an accessor in these
  // tests and it's safe to leave it null, even though in
  // the integrated code accessor always *does* exist
  accessor: (null as unknown) as FieldAccessor<any, any>
};

function check(
  converter: ConverterOrFactory<any, any>,
  value: any,
  expected: any
) {
  converter = makeConverter(converter);
  const processedValue = converter.preprocessRaw(value, baseOptions);
  const r = converter.convert(processedValue, baseOptions);
  expect(r).toBeInstanceOf(ConversionValue);
  expect((r as ConversionValue<any>).value).toEqual(expected);
}

function checkDecimal(
  converter: ConverterOrFactory<any, any>,
  value: string,
  expected: Decimal
) {
  converter = makeConverter(converter);
  const processedValue = converter.preprocessRaw(value, baseOptions);
  const r = converter.convert(processedValue, baseOptions);
  expect(r).toBeInstanceOf(ConversionValue);
  expect((r as ConversionValue<Decimal>).value.equals(expected));
}

function checkWithOptions(
  converter: ConverterOrFactory<any, any>,
  value: any,
  expected: any,
  options: StateConverterOptionsWithContext
) {
  converter = makeConverter(converter);
  const processedValue = converter.preprocessRaw(value, options);
  const r = converter.convert(processedValue, options);
  expect(r).toBeInstanceOf(ConversionValue);
  expect((r as ConversionValue<any>).value).toEqual(expected);
}

function checkDecimalWithOptions(
  converter: ConverterOrFactory<any, any>,
  value: string,
  expected: Decimal,
  options: StateConverterOptionsWithContext
) {
  converter = makeConverter(converter);
  const processedValue = converter.preprocessRaw(value, options);
  const r = converter.convert(processedValue, options);
  expect(r).toBeInstanceOf(ConversionValue);
  expect((r as ConversionValue<Decimal>).value.equals(expected));
}

function fails(converter: ConverterOrFactory<any, any>, value: any) {
  converter = makeConverter(converter);
  const r = converter.convert(value, baseOptions);
  expect(r).toBeInstanceOf(ConversionError);
}

function failsWithOptions(
  converter: ConverterOrFactory<any, any>,
  value: any,
  options: StateConverterOptionsWithContext
) {
  converter = makeConverter(converter);
  const processedValue = converter.preprocessRaw(value, options);
  const r = converter.convert(processedValue, options);
  expect(r).toBeInstanceOf(ConversionError);
}

test("string converter", () => {
  check(converters.string, "foo", "foo");
  check(converters.string, "", "");
});

test("string converter with options", () => {
  check(converters.string({ maxLength: 32 }), "foo", "foo");
  fails(converters.string({ maxLength: 2 }), "foo");
});

test("number converter", () => {
  check(converters.number, "3", 3);
  check(converters.number, "3.14", 3.14);
  check(converters.number, ".14", 0.14);
  check(converters.number, "19.14", 19.14);
  check(converters.number, "19.", 19);
  check(converters.number, "-3.14", -3.14);
  checkWithOptions(converters.number, "1234,56", 1234.56, {
    decimalSeparator: ",",
    ...baseOptions
  });
  checkWithOptions(converters.number, "4.000,000000", 4000, {
    decimalSeparator: ",",
    thousandSeparator: ".",
    ...baseOptions
  });
  fails(converters.number, "foo");
  fails(converters.number, "1foo");
  fails(converters.number, "");
  failsWithOptions(converters.number, "1,23.45", {
    decimalSeparator: ".",
    thousandSeparator: ",",
    ...baseOptions
  });
  failsWithOptions(converters.number, ",12345", {
    thousandSeparator: ",",
    ...baseOptions
  });
  failsWithOptions(converters.number, "1234,567", {
    thousandSeparator: ",",
    ...baseOptions
  });
  failsWithOptions(converters.number, "12.3,456", {
    decimalSeparator: ".",
    thousandSeparator: ",",
    ...baseOptions
  });
  failsWithOptions(converters.number, "1.1,1", {
    decimalSeparator: ",",
    thousandSeparator: ".",
    ...baseOptions
  });
  failsWithOptions(converters.number, "1,1.1", {
    decimalSeparator: ",",
    thousandSeparator: ".",
    ...baseOptions
  });
});

test("number converter with both options", () => {
  checkWithOptions(converters.number, "4.314.314,31", 4314314.31, {
    decimalSeparator: ",",
    thousandSeparator: ".",
    ...baseOptions
  });
});

test("integer converter", () => {
  check(converters.integer, "3", 3);
  fails(converters.integer, "3.14");
  fails(converters.integer, ".14");
  check(converters.integer, "0", 0);
  check(converters.integer, "-3", -3);
  fails(converters.integer, "foo");
  fails(converters.integer, "1foo");
  fails(converters.integer, "");
});

test("decimal converter", () => {
  check(converters.stringDecimal, "3", "3");
  check(converters.stringDecimal, "3.14", "3.14");
  check(converters.stringDecimal, "43.14", "43.14");
  check(converters.stringDecimal, "4313", "4313");
  check(converters.stringDecimal, "-3.14", "-3.14");
  check(converters.stringDecimal, "0", "0");
  check(converters.stringDecimal, ".14", ".14");
  check(converters.stringDecimal, "14.", "14.");
  checkWithOptions(converters.stringDecimal, "43,14", "43.14", {
    decimalSeparator: ",",
    ...baseOptions
  });
  checkWithOptions(
    converters.stringDecimal({ decimalPlaces: 6 }),
    "4.000,000000",
    "4000.000000",
    {
      decimalSeparator: ",",
      thousandSeparator: ".",
      ...baseOptions
    }
  );
  checkWithOptions(
    converters.stringDecimal({ decimalPlaces: 2 }),
    "36.365,21",
    "36365.21",
    {
      decimalSeparator: ",",
      thousandSeparator: ".",
      renderThousands: true,
      ...baseOptions
    }
  );
  fails(converters.stringDecimal, "foo");
  fails(converters.stringDecimal, "1foo");
  fails(converters.stringDecimal, "");
  fails(converters.stringDecimal, ".");
  fails(converters.stringDecimal({ maxWholeDigits: 4 }), "12345.34");
  fails(converters.stringDecimal({ decimalPlaces: 2 }), "12.444");
  fails(converters.stringDecimal({ allowNegative: false }), "-45.34");
  failsWithOptions(converters.stringDecimal, "1,23.45", {
    decimalSeparator: ".",
    thousandSeparator: ",",
    ...baseOptions
  });
  failsWithOptions(converters.stringDecimal, ",12345", {
    thousandSeparator: ",",
    ...baseOptions
  });
  failsWithOptions(converters.stringDecimal, "1234,567", {
    thousandSeparator: ",",
    ...baseOptions
  });
  failsWithOptions(converters.stringDecimal, "12.3,456", {
    decimalSeparator: ".",
    thousandSeparator: ",",
    ...baseOptions
  });
  failsWithOptions(converters.stringDecimal, "1.1,1", {
    decimalSeparator: ",",
    thousandSeparator: ".",
    ...baseOptions
  });
  failsWithOptions(converters.stringDecimal, "1,1.1", {
    decimalSeparator: ",",
    thousandSeparator: ".",
    ...baseOptions
  });
  failsWithOptions(converters.stringDecimal, "1234.56", {
    decimalSeparator: ",",
    thousandSeparator: ".",
    renderThousands: true,
    ...baseOptions
  });
});

test("decimal converter for decimal type", () => {
  checkDecimal(converters.decimal, "3", new Decimal("3"));
  checkDecimal(converters.decimal, "3.14", new Decimal("3.14"));
  checkDecimal(converters.decimal, "-3.14", new Decimal("-3.14"));
  checkDecimalWithOptions(converters.decimal, "43,14", new Decimal("43.14"), {
    decimalSeparator: ",",
    ...baseOptions
  });
  fails(converters.decimal, "foo");
  fails(converters.decimal, "1foo");
  fails(converters.decimal, "");
  fails(converters.decimal, ".");
});

test("decimal converter with normalizedDecimalPlaces", () => {
  const options = { normalizedDecimalPlaces: 4 };

  check(converters.stringDecimal(options), "3", "3.0000");
  check(converters.stringDecimal(options), "3.14", "3.1400");
  check(converters.stringDecimal(options), "43.14", "43.1400");
  check(converters.stringDecimal(options), "4313", "4313.0000");
  check(converters.stringDecimal(options), "-3.14", "-3.1400");
  check(converters.stringDecimal(options), "0", "0.0000");
  check(converters.stringDecimal(options), ".14", ".1400");
  check(converters.stringDecimal(options), "14.", "14.0000");
  checkWithOptions(converters.stringDecimal(options), "43,14", "43.1400", {
    decimalSeparator: ",",
    ...baseOptions
  });
  checkWithOptions(
    converters.stringDecimal({ decimalPlaces: 6, normalizedDecimalPlaces: 7 }),
    "4.000,000000",
    "4000.0000000",
    {
      decimalSeparator: ",",
      thousandSeparator: ".",
      ...baseOptions
    }
  );
  checkWithOptions(
    converters.stringDecimal({ decimalPlaces: 2, normalizedDecimalPlaces: 4 }),
    "36.365,21",
    "36365.2100",
    {
      decimalSeparator: ",",
      thousandSeparator: ".",
      renderThousands: true,
      ...baseOptions
    }
  );
});

test("decimal converter with minimalFlexibleDecimals", () => {
  const options = {
    decimalPlaces: 6,
    normalizedDecimalPlaces: 4,
    minimalFlexibleDecimals: 3
  };

  check(converters.stringDecimal(options), "3", "3.000");
  check(converters.stringDecimal(options), "3.14", "3.140");
  check(converters.stringDecimal(options), "43.14", "43.140");
  check(converters.stringDecimal(options), "4313", "4313.000");
  check(converters.stringDecimal(options), "-3.14", "-3.140");
  check(converters.stringDecimal(options), "0", "0.000");
  check(converters.stringDecimal(options), ".14", ".140");
  check(converters.stringDecimal(options), "14.", "14.000");
  check(converters.stringDecimal(options), ".143", ".143");

  // show more decimals because we have more decimals than three
  check(converters.stringDecimal(options), ".1434", ".1434");
  check(converters.stringDecimal(options), ".14345", ".14345");

  checkWithOptions(converters.stringDecimal(options), "43,14", "43.140", {
    decimalSeparator: ",",
    ...baseOptions
  });
  checkWithOptions(
    converters.stringDecimal({ decimalPlaces: 6, normalizedDecimalPlaces: 7 }),
    "4.000,000000",
    "4000.0000000",
    {
      decimalSeparator: ",",
      thousandSeparator: ".",
      ...baseOptions
    }
  );
  checkWithOptions(
    converters.stringDecimal({ decimalPlaces: 2, normalizedDecimalPlaces: 4 }),
    "36.365,21",
    "36365.2100",
    {
      decimalSeparator: ",",
      thousandSeparator: ".",
      renderThousands: true,
      ...baseOptions
    }
  );
});

test("decimal converter with both options", () => {
  checkWithOptions(converters.stringDecimal, "4.314.314,31", "4314314.31", {
    decimalSeparator: ",",
    thousandSeparator: ".",
    ...baseOptions
  });
});

test("decimal converter render with renderThousands false", () => {
  const converter = converters.stringDecimal({});
  const options = {
    decimalSeparator: ",",
    thousandSeparator: ".",
    renderThousands: false,
    ...baseOptions
  };
  const value = "4.314.314,31";
  const processedValue = converter.preprocessRaw(value, options);
  const converted = converter.convert(processedValue, options);
  const rendered = converter.render(
    (converted as ConversionValue<any>).value,
    options
  );
  expect(rendered).toEqual("4314314,31");
});

test("decimal converter render with six decimals", () => {
  const converter = converters.stringDecimal({ decimalPlaces: 6 });
  const options = {
    decimalSeparator: ".",
    thousandSeparator: ",",
    renderThousands: true,
    ...baseOptions
  };
  const value = "4.000000";
  const processedValue = converter.preprocessRaw(value, options);
  const converted = converter.convert(processedValue, options);
  const rendered = converter.render(
    (converted as ConversionValue<any>).value,
    options
  );
  expect(rendered).toEqual("4.000000");
});

test("decimal converter render with six decimals and thousand separators", () => {
  const converter = converters.stringDecimal({ decimalPlaces: 6 });
  const options = {
    decimalSeparator: ".",
    thousandSeparator: ",",
    renderThousands: true,
    ...baseOptions
  };
  const value = "4000000.000000";
  const processedValue = converter.preprocessRaw(value, options);
  const converted = converter.convert(processedValue, options);
  const rendered = converter.render(
    (converted as ConversionValue<any>).value,
    options
  );
  expect(rendered).toEqual("4,000,000.000000");
});

test("decimal converter render with six decimals, only showing three", () => {
  const converter = converters.stringDecimal({ decimalPlaces: 3 });
  const options = {
    decimalSeparator: ",",
    thousandSeparator: ".",
    renderThousands: true,
    ...baseOptions
  };
  const value = "4000.000000";
  const rendered = converter.render(value, options);
  expect(rendered).toEqual("4.000,000");
});

test("decimal converter with thousandSeparator . and no decimalSeparator can't convert", () => {
  let message = false;
  const converter = converters.stringDecimal();
  const options = {
    thousandSeparator: ".",
    renderThousands: true,
    ...baseOptions
  };
  const value = "4.000";
  const processedValue = converter.preprocessRaw(value, options);
  try {
    converter.convert(processedValue, options);
  } catch (e) {
    message = e.message;
  }
  expect(message).toBeTruthy();
});

test("do not convert a normal string with decimal options", () => {
  checkWithOptions(converters.string, "43,14", "43,14", {
    decimalSeparator: ",",
    ...baseOptions
  });
});

test("boolean converter", () => {
  check(converters.boolean, false, false);
  check(converters.boolean, true, true);
});

test("maybe number converter", () => {
  check(converters.maybe(converters.number), "3", 3);
  check(converters.maybe(converters.number), "", undefined);
});

test("maybeNull number converter", () => {
  check(converters.maybeNull(converters.number), "3", 3);
  check(converters.maybeNull(converters.number), "", null);
});

test("maybe decimal converter", () => {
  check(converters.maybe(converters.stringDecimal()), "3.14", "3.14");
  check(converters.maybe(converters.stringDecimal()), "", undefined);
  const c = converters.maybe(converters.stringDecimal());
  expect(c.render(undefined, baseOptions)).toEqual("");
});

test("maybeNull decimal converter", () => {
  check(converters.maybeNull(converters.stringDecimal()), "3.14", "3.14");
  check(converters.maybeNull(converters.stringDecimal()), "", null);
  const c = converters.maybeNull(converters.stringDecimal());
  expect(c.render(null, baseOptions)).toEqual("");
});

test("maybe string converter", () => {
  check(converters.maybe(converters.string), "foo", "foo");
  check(converters.maybe(converters.string), "", undefined);
});

test("maybeNull string converter", () => {
  check(converters.maybeNull(converters.string), "foo", "foo");
  check(converters.maybeNull(converters.string), "", null);
});

test("model converter", () => {
  const M = types.model("M", {
    foo: types.string
  });
  const o = M.create({
    foo: "FOO"
  });
  const converter = converters.model(M);
  const r = converter.convert({ foo: "value" }, baseOptions);
  expect(r).toEqual({ value: { foo: "value" } });
  const r2 = converter.convert(o, baseOptions);
  expect(r2).toEqual({ value: o });
});

test("maybe model converter", () => {
  const M = types.model("M", {
    foo: types.string
  });
  const o = M.create({
    foo: "FOO"
  });
  const converter = converters.maybe(converters.model(M));
  const r = converter.convert({ foo: "value" }, baseOptions);
  expect(r).toEqual({ value: { foo: "value" } });
  const r2 = converter.convert(o, baseOptions);
  expect(r2).toEqual({ value: o });
  // we use null as the sentinel value for raw
  const r3 = converter.convert(null, baseOptions);
  expect(r3).toEqual({ value: undefined });
});

test("maybeNull model converter", () => {
  const M = types.model("M", {
    foo: types.string
  });
  const o = M.create({
    foo: "FOO"
  });
  const converter = converters.maybeNull(converters.model(M));
  const r = converter.convert({ foo: "value" }, baseOptions);
  expect(r).toEqual({ value: { foo: "value" } });
  const r2 = converter.convert(o, baseOptions);
  expect(r2).toEqual({ value: o });
  const r3 = converter.convert(null, baseOptions);
  expect(r3).toEqual({ value: null });
});

test("object converter", () => {
  const M = types.model("M", {
    foo: types.string
  });
  const o = M.create({
    foo: "FOO"
  });
  const converter = converters.object;
  const r = converter.convert({ foo: "value" }, baseOptions);
  expect(r).toEqual({ value: { foo: "value" } });
  const r2 = converter.convert(o, baseOptions);
  expect(r2).toEqual({ value: o });
  const r3 = converter.convert(null, baseOptions);
  expect(r3).toEqual({ value: null });
});

test("dynamic decimal converter", () => {
  const context = { options: { decimalPlaces: 0 } };

  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(
      converters.dynamic(converters.stringDecimal, context => context.options)
    )
  });

  const o = M.create({ foo: "4" });

  const state = form.state(o, { context: context });
  const field = state.field("foo");

  field.setRaw("3.141");
  expect(field.raw).toEqual("3.141");
  expect(field.value).toEqual("4"); // conversion error
  expect(field.error).toEqual("Could not convert");
  context.options = { decimalPlaces: 3 };
  field.setRaw("3.141");
  expect(field.raw).toEqual("3.141");
  expect(field.value).toEqual("3.141"); // conversion succeeds
  expect(field.error).toBeUndefined();
  context.options = { decimalPlaces: 2 };
  expect(field.raw).toEqual("3.141");
  expect(field.value).toEqual("3.141"); // nothing happens until field is touched
  expect(field.error).toBeUndefined();
  field.setRaw("3.141"); // touch field again
  expect(field.raw).toEqual("3.141");
  expect(field.value).toEqual("3.141");
  expect(field.error).toEqual("Could not convert");
});

test("text string array converter", () => {
  const M = types.model("M", {
    foo: types.array(types.string)
  });

  const form = new Form(M, {
    foo: new Field(converters.textStringArray)
  });

  const o = M.create({ foo: ["A", "B", "C"] });

  const state = form.state(o);
  const field = state.field("foo");

  field.setRaw("A\nB\nC");
  expect(field.raw).toEqual("A\nB\nC");
  expect(field.value).toEqual(["A", "B", "C"]);

  field.setRaw("D");
  expect(field.raw).toEqual("D");
  expect(field.value).toEqual(["D"]);

  field.setRaw("1\n2 \n3");
  expect(field.raw).toEqual("1\n2 \n3");
  expect(field.value).toEqual(["1", "2", "3"]);

  field.setRaw("");
  expect(field.raw).toEqual("");
  expect(field.value).toEqual([]);

  field.setRaw("\n");
  expect(field.raw).toEqual("\n");
  expect(field.value).toEqual(["", ""]);

  field.setRaw("   ");
  expect(field.raw).toEqual("   ");
  expect(field.value).toEqual([]);
});

test("render decimal number without decimals with decimal separator", () => {
  // this exposed a dispose bug that occurred when we had a previous state
  // and thus two onPatch event handlers. Now we properly dispose of the
  // previous form state when we attach a new form state to the same
  // node
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(
      converters.dynamic(converters.stringDecimal, context => ({
        allowNegative: false,
        decimalPlaces: getCurrencyDecimals(context.getCurrency())
      }))
    )
  });

  function getCurrencyDecimals(currency: string) {
    if (currency === "EUR") {
      return 2;
    }
    return 4;
  }

  const currency = "EUR";

  const o = M.create({ foo: "12.3456" });

  // this state is essential to replicate the bug, don't remove!
  const previousState = form.state(o, {
    focus: () => undefined,
    converterOptions: {
      decimalSeparator: ",",
      thousandSeparator: ".",
      renderThousands: true
    },
    context: {
      getCurrency: () => currency
    }
  });
  const state = form.state(o, {
    converterOptions: {
      decimalSeparator: ",",
      thousandSeparator: ".",
      renderThousands: true
    },
    context: {
      getCurrency: () => currency
    }
  });
  const field = state.field("foo");

  field.setRaw("12,34");
  expect(field.raw).toEqual("12,34");
  expect(field.value).toEqual("12.34");
  field.setRaw("12,");
  expect(field.raw).toEqual("12,");
  expect(field.value).toEqual("12.");
});

test("obey addZeroes false", () => {
  const M = types.model("M", {
    foo: types.maybeNull(types.string)
  });

  const form = new Form(M, {
    foo: new Field(
      converters.maybeNull(
        converters.stringDecimal({ decimalPlaces: 6, addZeroes: false })
      )
    )
  });

  const o = M.create({ foo: "1" });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.raw).toEqual("1");
});

test("obey addZeroes true", () => {
  const M = types.model("M", {
    foo: types.maybeNull(types.string)
  });

  const form = new Form(M, {
    foo: new Field(
      converters.maybeNull(
        converters.stringDecimal({ decimalPlaces: 6, addZeroes: true })
      )
    )
  });

  const o = M.create({ foo: "1" });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.raw).toEqual("1.000000");
});

test("maybe decimal converter/render for empty", () => {
  const M = types.model("M", {
    foo: types.maybeNull(types.string)
  });

  const form = new Form(M, {
    foo: new Field(
      converters.maybeNull(
        converters.stringDecimal({ decimalPlaces: 6, addZeroes: false })
      )
    )
  });

  const o = M.create({ foo: "" });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.raw).toEqual("");

  field.setRaw("3.1412");
  expect(field.raw).toEqual("3.1412");
  expect(field.value).toEqual("3.1412");

  field.setRaw("");
  expect(field.value).toBeNull();
  field.setRawFromValue();
  expect(field.raw).toEqual("");
});
