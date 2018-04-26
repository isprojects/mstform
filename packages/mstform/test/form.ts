import {
  Field,
  Validator,
  Converter,
  Renderer,
  ValueGetter,
  ConversionError,
  ValidationResponse
} from "../src";

let getValue: ValueGetter<string>;
getValue = function(value) {
  return value;
};

let conversionError: ConversionError;
conversionError = function() {
  return "Conversion error";
};

test("string field", () => {
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

  expect(field.process("foo").value).toEqual("foo");
  expect(field.process("foo").error).toEqual(null);

  expect(field.process("wrong").value).toEqual(null);
  expect(field.process("wrong").error).toEqual("WRONG!");
});

test("string field empty string validator is okay", () => {
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

  expect(field.process("foo").value).toEqual("foo");
  expect(field.process("foo").error).toEqual(null);
});

test("number field", () => {
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

  expect(field.process("5").value).toEqual(5);
  expect(field.process("foo").error).toEqual("Conversion error");

  expect(field.process("7").value).toEqual(null);
  expect(field.process("7").error).toEqual("WRONG!");
});

test("number field with raw validators", () => {
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

  expect(field.process("5").value).toEqual(5);
  expect(field.process("foo").error).toEqual("Conversion error");

  expect(field.process("7").value).toEqual(null);
  expect(field.process("7").error).toEqual("WRONG!");
  expect(field.process("123").value).toEqual(null);
  expect(field.process("123").error).toEqual("The number");
});
