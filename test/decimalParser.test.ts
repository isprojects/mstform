import { parseDecimal } from "../src/decimalParser";

const options = {
  maxWholeDigits: 5,
  decimalPlaces: 4,
  allowNegative: true,
  decimalSeparator: ".",
  thousandSeparator: ","
};

test("basic parse", () => {
  expect(parseDecimal("100", options)).toEqual("100");
  expect(parseDecimal("-100", options)).toEqual("-100");
  expect(parseDecimal("100.47", options)).toEqual("100.47");
  expect(parseDecimal(".47", options)).toEqual(".47");
  expect(parseDecimal("1.47", options)).toEqual("1.47");
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
});

test("cannot parse double minus", () => {
  expect(() => parseDecimal("--1", options)).toThrow();
});

test("cannot parse single decimal separator", () => {
  expect(() => parseDecimal(".", options)).toThrow();
});
