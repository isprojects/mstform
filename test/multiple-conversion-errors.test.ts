import { configure } from "mobx";
import { types } from "mobx-state-tree";
import { Field, Form, converters } from "../src";

// "always" leads to trouble during initialization.
configure({ enforceActions: "observed" });

test("conversion failure with multiple messages", () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(
      converters.decimal({
        allowNegative: false,
        decimalPlaces: 4,
        maxWholeDigits: 4
      }),
      {
        conversionError: {
          default: "Not a number",
          tooManyDecimalPlaces: "Too many decimal places",
          tooManyWholeDigits: "Too many whole digits",
          cannotBeNegative: "Cannot be negative"
        }
      }
    )
  });

  const o = M.create({ foo: "3.14" });

  const state = form.state(o, {
    converterOptions: {
      decimalSeparator: ",",
      thousandSeparator: ".",
      renderThousands: true
    }
  });

  const field = state.field("foo");

  field.setRaw("-44");
  expect(field.error).toEqual("Cannot be negative");

  field.setRaw("1,12345");
  expect(field.error).toEqual("Too many decimal places");

  field.setRaw("12345,1");
  expect(field.error).toEqual("Too many whole digits");

  field.setRaw("34.4567,1");
  expect(field.error).toEqual("Not a number");

  field.setRaw("123ab");
  expect(field.error).toEqual("Not a number");
});

test("conversion failure with multiple messages, context", () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(
      converters.decimal({
        allowNegative: false,
        decimalPlaces: 4,
        maxWholeDigits: 4
      }),
      {
        conversionError: {
          default: context => "Not a number" + context.extra,
          tooManyDecimalPlaces: context =>
            "Too many decimal places" + context.extra,
          tooManyWholeDigits: context =>
            "Too many whole digits" + context.extra,
          cannotBeNegative: context => "Cannot be negative" + context.extra
        }
      }
    )
  });

  const o = M.create({ foo: "3.14" });

  const state = form.state(o, {
    converterOptions: {
      decimalSeparator: ",",
      thousandSeparator: ".",
      renderThousands: true
    },
    context: {
      extra: "!!"
    }
  });

  const field = state.field("foo");

  field.setRaw("-44");
  expect(field.error).toEqual("Cannot be negative!!");

  field.setRaw("1,12345");
  expect(field.error).toEqual("Too many decimal places!!");

  field.setRaw("12345,1");
  expect(field.error).toEqual("Too many whole digits!!");

  field.setRaw("123ab");
  expect(field.error).toEqual("Not a number!!");
});
