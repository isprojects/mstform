import { parseDecimal, renderDecimal } from "../src/decimalParser";

const options = {
  maxWholeDigits: 20,
  decimalPlaces: 4,
  allowNegative: true,
  decimalSeparator: ".",
  thousandSeparator: ",",
  renderThousands: true,
  addZeroes: true
};

test("basic parse", () => {
  expect(parseDecimal("100", options)).toEqual("100");
  expect(parseDecimal("-100", options)).toEqual("-100");
  expect(parseDecimal("100.47", options)).toEqual("100.47");
  expect(parseDecimal(".47", options)).toEqual(".47");
  expect(parseDecimal("1.47", options)).toEqual("1.47");
  expect(parseDecimal("123.", options)).toEqual("123.");
});

test("minus handling", () => {
  expect(parseDecimal("-1,000", options)).toEqual("-1000");
  expect(parseDecimal("-.5", options)).toEqual("-.5");
});

test("swapped separators", () => {
  const options = {
    maxWholeDigits: 50,
    decimalPlaces: 4,
    allowNegative: true,
    decimalSeparator: ",",
    thousandSeparator: ".",
    renderThousands: true,
    addZeroes: true
  };
  expect(parseDecimal("100.000", options)).toEqual("100000");
  expect(parseDecimal("100,53", options)).toEqual("100.53");
  expect(parseDecimal("123.456,78", options)).toEqual("123456.78");
  expect(parseDecimal("4.000.000", options)).toEqual("4000000");
});

test("parse thousands", () => {
  expect(parseDecimal("1,000", options)).toEqual("1000");
  expect(parseDecimal("12,000", options)).toEqual("12000");
});

test("parse thousands multiple 3 digits", () => {
  expect(parseDecimal("1,123,000", options)).toEqual("1123000");
});

test("cannot parse unknown tokens", () => {
  expect(() => parseDecimal("foo", options)).toThrow();
  expect(() => parseDecimal("100foo", options)).toThrow();
});

test("cannot parse double minus", () => {
  expect(() => parseDecimal("--1", options)).toThrow();
});

test("cannot parse single decimal separator", () => {
  expect(() => parseDecimal(".", options)).toThrow();
});

test("cannot parse single thousand separator", () => {
  expect(() => parseDecimal(",", options)).toThrow();
});

test("cannot parse broken thousands", () => {
  expect(() => parseDecimal("100,00", options)).toThrow();
  expect(() => parseDecimal(",000", options)).toThrow();
  expect(() => parseDecimal("1,000,000,00", options)).toThrow();
});

test("do not allowNegative", () => {
  const options = {
    maxWholeDigits: 5,
    decimalPlaces: 4,
    allowNegative: false,
    decimalSeparator: ".",
    thousandSeparator: ",",
    renderThousands: true,
    addZeroes: true
  };
  expect(() => parseDecimal("-100", options)).toThrow();
});

test("maxWholeDigits", () => {
  const options = {
    maxWholeDigits: 5,
    decimalPlaces: 4,
    allowNegative: true,
    decimalSeparator: ".",
    thousandSeparator: ",",
    renderThousands: true,
    addZeroes: true
  };
  expect(parseDecimal("12,345", options)).toEqual("12345");
  expect(parseDecimal("-12,345", options)).toEqual("-12345");
  expect(parseDecimal("123.5678", options)).toEqual("123.5678");
  expect(() => parseDecimal("123,456", options)).toThrow();
  expect(() => parseDecimal("-123,456", options)).toThrow();
});

test("decimalPlaces", () => {
  const options = {
    maxWholeDigits: 50,
    decimalPlaces: 4,
    allowNegative: true,
    decimalSeparator: ".",
    thousandSeparator: ",",
    renderThousands: true,
    addZeroes: true
  };
  expect(parseDecimal("12,345.45", options)).toEqual("12345.45");
  expect(parseDecimal(".1234", options)).toEqual(".1234");
  expect(() => parseDecimal(".12345", options)).toThrow();
  expect(() => parseDecimal("-123.12345", options)).toThrow();
});

test("numbers without thousand separators", () => {
  // as a special case we accept numbers without thousand separators too
  expect(parseDecimal("1000", options)).toEqual("1000");
  expect(parseDecimal("12345678", options)).toEqual("12345678");
});

test("render", () => {
  expect(renderDecimal("100", options)).toEqual("100.0000");
  expect(renderDecimal("1234", options)).toEqual("1,234.0000");
  expect(renderDecimal("1.12", options)).toEqual("1.1200");
  expect(renderDecimal(".12", options)).toEqual(".1200");
  expect(renderDecimal(".12345", options)).toEqual(".1234");
  expect(renderDecimal("12345678", options)).toEqual("12,345,678.0000");
  expect(renderDecimal("-1.5", options)).toEqual("-1.5000");
  expect(renderDecimal("-100", options)).toEqual("-100.0000");
});

test("render no renderThousands", () => {
  const options = {
    maxWholeDigits: 50,
    decimalPlaces: 4,
    allowNegative: true,
    decimalSeparator: ".",
    thousandSeparator: ",",
    renderThousands: false,
    addZeroes: true
  };
  expect(renderDecimal("100", options)).toEqual("100.0000");
  expect(renderDecimal("1234", options)).toEqual("1234.0000");
  expect(renderDecimal("1.12", options)).toEqual("1.1200");
  expect(renderDecimal(".12", options)).toEqual(".1200");
  expect(renderDecimal(".12345", options)).toEqual(".1234");
  expect(renderDecimal("12345678", options)).toEqual("12345678.0000");
  expect(renderDecimal("-1.5", options)).toEqual("-1.5000");
  expect(renderDecimal("-100", options)).toEqual("-100.0000");
});

test("render no addZeroes", () => {
  const options = {
    maxWholeDigits: 50,
    decimalPlaces: 4,
    allowNegative: true,
    decimalSeparator: ".",
    thousandSeparator: ",",
    renderThousands: true,
    addZeroes: false
  };
  expect(renderDecimal("100", options)).toEqual("100");
  expect(renderDecimal("1234", options)).toEqual("1,234");
  expect(renderDecimal("1.12", options)).toEqual("1.12");
  expect(renderDecimal(".12", options)).toEqual(".12");
  expect(renderDecimal(".12345", options)).toEqual(".1234");
  expect(renderDecimal("12345678", options)).toEqual("12,345,678");
  expect(renderDecimal("-1.5", options)).toEqual("-1.5");
  expect(renderDecimal("-100", options)).toEqual("-100");
});

test("empty render", () => {
  expect(renderDecimal("", options)).toEqual("");
});

test("empty render no addZeroes", () => {
  const options = {
    maxWholeDigits: 50,
    decimalPlaces: 4,
    allowNegative: true,
    decimalSeparator: ".",
    thousandSeparator: ",",
    renderThousands: true,
    addZeroes: false
  };
  expect(renderDecimal("", options)).toEqual("");
});
