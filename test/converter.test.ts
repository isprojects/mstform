import { configure } from "mobx";
import { types } from "mobx-state-tree";
import { Field, Form, converters, FieldAccessor } from "../src";
import { ConversionValue, Converter, ConversionError } from "../src/converter";

configure({ enforceActions: "always" });

const options = {
  // a BIG lie. but we don't really have an accessor in these
  // tests and it's safe to leave it null, even though in
  // the integrated code accessor always *does* exist
  accessor: null as unknown as FieldAccessor<any, any>,
};

test("simple converter", () => {
  const converter = new Converter<string, string>({
    emptyRaw: "",
    emptyValue: "",
    convert: (raw) => raw,
    render: (value) => value,
  });

  const result = converter.convert("foo", options);
  expect(result).toBeInstanceOf(ConversionValue);
  expect((result as ConversionValue<string>).value).toEqual("foo");

  // the string "ConversionError" is a valid text to convert
  const result2 = converter.convert("ConversionError", options);
  expect(result2).toBeInstanceOf(ConversionValue);
  expect((result2 as ConversionValue<string>).value).toEqual("ConversionError");
});

test("converter emptyImpossible and emptyValue", () => {
  expect(
    () =>
      new Converter<string, string>({
        emptyRaw: "",
        emptyValue: "",
        emptyImpossible: true,
        convert: (raw) => raw,
        render: (value) => value,
      })
  ).toThrow();
});

test("converter to integer", () => {
  const converter = new Converter<string, number>({
    emptyRaw: "",
    emptyImpossible: true,
    convert: (raw) => {
      if (!/^\d+$/.test(raw)) {
        throw new ConversionError();
      }
      return parseInt(raw, 10);
    },
    render: (value) => value.toString(),
  });

  const result = converter.convert("3", options);
  expect(result).toBeInstanceOf(ConversionValue);
  expect((result as ConversionValue<number>).value).toEqual(3);

  const result2 = converter.convert("not a number", options);
  expect(result2).toBeInstanceOf(ConversionError);
});

test("converter maybeNull with converter options", () => {
  const M = types.model("M", {
    foo: types.maybeNull(types.string),
  });

  const form = new Form(M, {
    foo: new Field(converters.maybeNull(converters.stringDecimal())),
  });

  const o = M.create({ foo: "36365.21" });

  const state = form.state(o, {
    converterOptions: {
      decimalSeparator: ",",
      thousandSeparator: ".",
      renderThousands: true,
    },
  });
  const field = state.field("foo");
  field.setRaw("36.365,20");
  expect(field.error).toBeUndefined();
  expect(field.raw).toEqual("36.365,20");
  expect(field.value).toEqual("36365.20");
});

test("convert can throw ConversionError", () => {
  const converter = new Converter<string, string>({
    emptyRaw: "",
    emptyValue: "",
    convert: (raw) => {
      throw new ConversionError();
    },
    render: (value) => value,
  });

  const result = converter.convert("foo", options);
  expect(result).toBeInstanceOf(ConversionError);
});

test("non-ConversionError bubbles up", () => {
  const converter = new Converter<string, string>({
    emptyRaw: "",
    emptyValue: "",
    convert: (raw) => {
      throw new Error("Unexpected failure");
    },
    render: (value) => value,
  });

  expect(() => converter.convert("foo", options)).toThrow();
});
