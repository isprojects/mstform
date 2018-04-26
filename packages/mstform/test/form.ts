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
