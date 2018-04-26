import {
  Field,
  Validator,
  Converter,
  Renderer,
  ValueGetter,
  ValidationResponse
} from "../src";

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

let getValue: ValueGetter<string>;
getValue = function(value) {
  return value;
};

test("string field", () => {
  const field = new Field<string, string>({ convert, render, getValue });
  field.validators(valid);

  expect(field.process("foo").value).toEqual("foo");
  expect(field.process("foo").error).toEqual(null);

  expect(field.process("wrong").value).toEqual(null);
  expect(field.process("wrong").error).toEqual("WRONG!");
});
