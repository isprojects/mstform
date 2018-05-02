import { types } from "mobx-state-tree";
import {
  Field,
  Validator,
  Converter,
  Renderer,
  ValueGetter,
  ConversionError,
  ValidationResponse,
  Form,
  FormState,
  StringField,
  ObjectField,
  Repeating,
  RepeatingForm
} from "../src";

let getValue: ValueGetter<string>;
getValue = function(value) {
  return value;
};

let conversionError: ConversionError;
conversionError = function() {
  return "Conversion error";
};

test("string field", async () => {
  let convert: Converter<string, string>;
  convert = function(value: string): string {
    return value;
  };

  let render: Renderer<string, string>;
  render = function(value: string): string {
    return value;
  };

  let valid: Validator<string>;
  valid = function(value: string): ValidationResponse {
    if (value === "wrong") {
      return "WRONG!";
    }
  };

  const field = new Field<string, string>(
    convert,
    render,
    getValue,
    conversionError
  );
  field.validators(valid);
  let r = await field.process("foo");

  expect(r.value).toEqual("foo");
  expect(r.error).toEqual(null);

  r = await field.process("wrong");
  expect(r.value).toEqual(null);
  expect(r.error).toEqual("WRONG!");
});

test("async validator", async () => {
  let convert: Converter<string, string>;
  convert = function(value: string): string {
    return value;
  };

  let render: Renderer<string, string>;
  render = function(value: string): string {
    return value;
  };

  let valid: Validator<string>;
  valid = async function(value: string): Promise<ValidationResponse> {
    if (value === "wrong") {
      return "WRONG!";
    }
  };

  const field = new Field<string, string>(
    convert,
    render,
    getValue,
    conversionError
  );
  field.validators(valid);

  let r = await field.process("foo");

  expect(r.value).toEqual("foo");
  expect(r.error).toEqual(null);

  r = await field.process("wrong");
  expect(r.value).toEqual(null);
  expect(r.error).toEqual("WRONG!");
});

test("string field empty string validator is okay", async () => {
  let convert: Converter<string, string>;
  convert = function(value: string): string {
    return value;
  };

  let render: Renderer<string, string>;
  render = function(value: string): string {
    return value;
  };

  let valid: Validator<string>;
  valid = function(value: string): ValidationResponse {
    return "";
  };

  const field = new Field<string, string>(
    convert,
    render,
    getValue,
    conversionError
  );
  field.validators(valid);

  let r = await field.process("foo");

  expect(r.value).toEqual("foo");
  expect(r.error).toEqual(null);
});

test("number field", async () => {
  let convert: Converter<string, number>;
  convert = function(value: string): number | undefined {
    const result = parseInt(value, 10);
    if (isNaN(result)) {
      return undefined;
    }
    return result;
  };

  let render: Renderer<number, string>;
  render = function(value: number): string {
    return value.toString();
  };

  let valid: Validator<number>;
  valid = function(value: number): ValidationResponse {
    if (value > 5) {
      return "WRONG!";
    }
  };

  const field = new Field<string, number>(
    convert,
    render,
    getValue,
    conversionError
  );
  field.validators(valid);

  let r = await field.process("5");
  expect(r.value).toEqual(5);
  r = await field.process("foo");
  expect(r.error).toEqual("Conversion error");

  r = await field.process("7");

  expect(r.value).toEqual(null);
  expect(r.error).toEqual("WRONG!");
});

test("number field with raw validators", async () => {
  let convert: Converter<string, number>;
  convert = function(value: string): number | undefined {
    const result = parseInt(value, 10);
    if (isNaN(result)) {
      return undefined;
    }
    return result;
  };

  let render: Renderer<number, string>;
  render = function(value: number): string {
    return value.toString();
  };

  let rawValid: Validator<string>;
  rawValid = function(value: string): ValidationResponse {
    if (value === "123") {
      return "The number";
    }
  };
  let valid: Validator<number>;
  valid = function(value: number): ValidationResponse {
    if (value > 5) {
      return "WRONG!";
    }
  };

  const field = new Field<string, number>(
    convert,
    render,
    getValue,
    conversionError
  );
  field.rawValidators(rawValid);
  field.validators(valid);

  let r = await field.process("5");

  expect(r.value).toEqual(5);

  r = await field.process("foo");
  expect(r.error).toEqual("Conversion error");

  r = await field.process("7");
  expect(r.value).toEqual(null);
  expect(r.error).toEqual("WRONG!");

  r = await field.process("123");
  expect(r.value).toEqual(null);
  expect(r.error).toEqual("The number");
});

test("FormState simple", async () => {
  let convert: Converter<string, string>;
  convert = function(value: string): string {
    return value;
  };

  let render: Renderer<string, string>;
  render = function(value: string): string {
    return value;
  };

  const M = types.model("M", {
    foo: types.string
  });

  const o = M.create({ foo: "FOO" });

  const form = new Form({
    foo: new Field<string, string>(convert, render, getValue, conversionError)
  });
  const fs = form.create(o);

  expect(fs.node).toBe(o);
  const fooField = fs.access("foo");
  expect(fooField.path).toEqual("foo");
  expect(fooField.raw).toEqual("FOO");
  await fooField.handleChange("BAR");
  expect(o.foo).toEqual("BAR");
  //await fooField.inputProps.onChange(event("BAR"));
  //expect(o.foo).toEqual("BAR");
});

function fakeEvent(value) {
  return { target: { value } };
}

test("FormState StringField", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const o = M.create({ foo: "FOO" });
  const form = new Form({
    foo: new StringField()
  });
  const fs = new FormState(form, o);

  expect(fs.node).toBe(o);
  const fooField = fs.access("foo");
  expect(fooField.path).toEqual("foo");
  expect(fooField.raw).toEqual("FOO");
  await fooField.handleChange(fakeEvent("BAR"));
  expect(o.foo).toEqual("BAR");
});

test("FormState ObjectField", async () => {
  const M = types.model("M", {
    foo: types.array(types.string)
  });

  const o = M.create({ foo: ["FOO"] });
  const form = new Form({
    foo: new ObjectField()
  });
  const fs = new FormState(form, o);

  expect(fs.node).toBe(o);
  const fooField = fs.access("foo");
  expect(fooField.path).toEqual("foo");
  expect(fooField.raw).toEqual(["FOO"]);
  await fooField.handleChange(["BAR", "BAZ"]);
  expect(o.foo.slice()).toEqual(["BAR", "BAZ"]);
});

test("FormState fields", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const o = M.create({ foo: "FOO" });
  const form = new Form({
    foo: new StringField()
  });
  const fs = new FormState(form, o);

  expect(fs.node).toBe(o);
  const fooField = fs.fields.foo;

  expect(fooField.path).toEqual("foo");
  expect(fooField.raw).toEqual("FOO");
  await fooField.handleChange(fakeEvent("BAR"));
  expect(o.foo).toEqual("BAR");
});

// test("FormState repeating", async () => {
//   const N = types.model("N", {
//     bar: types.string
//   });
//   const M = types.model("M", {
//     foo: types.array(N)
//   });

//   const o = M.create({ foo: [{ bar: "BAR" }] });

//   const form = new Form({
//     foo: new RepeatingForm(
//       new Form({
//         bar: new StringField()
//       })
//     )
//   });

//   const fs = new FormState(form, o);
//   // fs.access("foo") ought not to work
//   const fooField = fs.repeatingFormAccess("foo");
//   const barField = fooField.index(0).access("bar");
// });
