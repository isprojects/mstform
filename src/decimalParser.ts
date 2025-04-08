import {
  StateConverterOptions,
  StateConverterOptionsWithContext,
} from "./converter";

type TOKEN_MINUS = "-";
type TOKEN_DECIMAL_SEPARATOR = ".";
type TOKEN_THOUSAND_SEPARATOR = ",";
type TOKEN_WHITESPACE = " ";
type TOKEN_DIGIT = "0";

const TOKEN_MINUS: TOKEN_MINUS = "-";
const TOKEN_DECIMAL_SEPARATOR: TOKEN_DECIMAL_SEPARATOR = ".";
const TOKEN_THOUSAND_SEPARATOR: TOKEN_THOUSAND_SEPARATOR = ",";
const TOKEN_WHITESPACE: TOKEN_WHITESPACE = " ";
const TOKEN_DIGIT: TOKEN_DIGIT = "0";

type TokenType =
  | TOKEN_MINUS
  | TOKEN_DECIMAL_SEPARATOR
  | TOKEN_THOUSAND_SEPARATOR
  | TOKEN_WHITESPACE
  | TOKEN_DIGIT;

const DIGIT = new RegExp("\\d");
const WHITESPACE = new RegExp("\\s");

function isDigit(c: string): boolean {
  return DIGIT.test(c);
}

function isWhitespace(c: string): boolean {
  return WHITESPACE.test(c);
}

export type DecimalOptions = {
  maxWholeDigits: number;
  decimalPlaces: number;
  addZeroes: boolean;
  allowNegative: boolean;
  normalizedDecimalPlaces?: number;
  maxZeroesPadding?: number;
  zeroIsEmpty?: boolean;
};

type TokenOptions = {
  decimalSeparator: string;
  thousandSeparator: string;
  renderThousands: boolean;
};

type Options = DecimalOptions & TokenOptions;

type Accept = (tokenType: TokenType) => boolean;
type Expect = (tokenType: TokenType) => boolean;
type NextToken = () => void;

class Token {
  constructor(
    public type: TokenType,
    public value: string,
  ) {}
}

function thousands(wholeDigits: string, thousandSeparator: string): string {
  return wholeDigits.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);
}

function trimDecimals(decimalDigits: string, decimalPlaces: number): string {
  // remove all trailing zeroes
  // reverse loop until there are no trailing zeroes anymore
  const result = decimalDigits.split("");
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i] === "0") {
      result[i] = "";
    } else {
      break;
    }
  }
  return result.join("").slice(0, decimalPlaces);
}

function addZeroes(decimalDigits: string, decimalPlaces: number): string {
  return decimalDigits + "0".repeat(decimalPlaces - decimalDigits.length);
}

export class DecimalParserError {
  constructor(public type: string) {}
}

export function renderDecimal(s: string, options: Options): string {
  if (s.length === 0) {
    return s;
  }
  const parts = s.split(".");
  let wholeDigits = parts.length === 2 ? parts[0] : s;
  let decimalDigits = parts.length === 2 ? parts[1] : "";
  const hasMinus = wholeDigits[0] === "-";
  if (hasMinus) {
    wholeDigits = wholeDigits.slice(1);
  }

  wholeDigits = options.renderThousands
    ? thousands(wholeDigits, options.thousandSeparator)
    : wholeDigits;

  decimalDigits = trimDecimals(decimalDigits, options.decimalPlaces);
  if (options.addZeroes) {
    let decimalPlaces = options.decimalPlaces;
    if (options.maxZeroesPadding != null) {
      decimalPlaces = options.maxZeroesPadding;
    }
    if (decimalPlaces - decimalDigits.length > 0) {
      decimalDigits = addZeroes(decimalDigits, decimalPlaces);
    }
  }

  const result =
    decimalDigits.length > 0
      ? wholeDigits + options.decimalSeparator + decimalDigits
      : wholeDigits;

  if (hasMinus) {
    return "-" + result;
  }
  return result;
}

export function parseDecimal(s: string, options: Options): string {
  const tokens = tokenize(s, options);
  if (tokens == null) {
    throw new DecimalParserError("default");
  }

  const parser = new Parser(tokens, options);

  parser.parse();

  // now that the parser has succeed we can make a simplifying assumption:
  // strings of tokens are now always legitimate.

  if (getWholeDigitAmount(tokens) > options.maxWholeDigits) {
    throw new DecimalParserError("tooManyWholeDigits");
  }
  if (getDecimalAmount(tokens) > options.decimalPlaces) {
    throw new DecimalParserError("tooManyDecimalPlaces");
  }

  // note that the tokenizer has replaced the decimal separator
  // with the standard "." at this point.
  const converted = tokens
    .filter((token) => token.type !== TOKEN_THOUSAND_SEPARATOR)
    .map((token) => token.value)
    .join("");
  if (options.normalizedDecimalPlaces == null) {
    return converted;
  }
  return normalize(converted, options.normalizedDecimalPlaces);
}

function normalize(decimal: string, amount: number): string {
  const parts = decimal.split(".");
  const beforePeriod = parts[0];
  const decimals = parts.length === 2 ? parts[1] : "";
  return beforePeriod + "." + addZeroes(decimals, amount);
}

function getWholeDigitAmount(tokens: Token[]): number {
  let result = 0;
  for (const token of tokens) {
    if (token.type === TOKEN_DIGIT) {
      result++;
    } else if (token.type === TOKEN_DECIMAL_SEPARATOR) {
      break;
    }
  }
  return result;
}

function getDecimalAmount(tokens: Token[]): number {
  let result = 0;
  let inDecimals = false;
  for (const token of tokens) {
    if (token.type === TOKEN_DECIMAL_SEPARATOR) {
      inDecimals = true;
      continue;
    } else if (inDecimals && token.type === TOKEN_DIGIT) {
      result++;
    }
  }
  return result;
}

// This is a recursive descent parser
// https://en.wikipedia.org/wiki/Recursive_descent_parser
// The reason I didn't use PEG.js to generate a parser instead is
// because PEG.js doesn't easily allow parameterized parsers,
// which we need with our thousand and decimal separators.
// We can handle this in our tokenizer.
// (We could however use PEG if we cleverly translated the tokens
// beforehand, but this was about as easy to work out)
class Parser {
  tokenIndex = 0;
  currentToken: Token | null | undefined = undefined;

  constructor(
    public tokens: Token[],
    public options: Options,
  ) {}

  nextToken: NextToken = () => {
    if (this.tokenIndex >= this.tokens.length) {
      this.currentToken = null;
      return;
    }
    const result = this.tokens[this.tokenIndex];
    this.tokenIndex++;
    this.currentToken = result;
  };

  accept: Accept = (tokenType) => {
    if (this.currentToken != null && this.currentToken.type === tokenType) {
      this.nextToken();
      return true;
    }
    return false;
  };

  expect: Expect = (tokenType) => {
    if (this.accept(tokenType)) {
      return true;
    }
    throw new DecimalParserError("default");
  };

  parse(): void {
    this.nextToken();
    this.decimal();
    if (this.currentToken != null) {
      throw new DecimalParserError("default");
    }
  }

  decimal(): void {
    if (this.accept(TOKEN_MINUS)) {
      if (!this.options.allowNegative) {
        throw new DecimalParserError("cannotBeNegative");
      }
    }

    this.absoluteDecimal();
  }

  absoluteDecimal(): void {
    if (this.accept(TOKEN_DECIMAL_SEPARATOR)) {
      this.expect(TOKEN_DIGIT);
      this.fraction();
    } else {
      this.whole();
      if (this.accept(TOKEN_DECIMAL_SEPARATOR)) {
        this.fraction();
      }
    }
  }

  whole(): void {
    this.threeOrLessDigits();
    while (this.accept(TOKEN_THOUSAND_SEPARATOR)) {
      this.threeDigits();
    }
  }

  threeOrLessDigits(): void {
    let count = 1;
    this.expect(TOKEN_DIGIT);
    while (this.accept(TOKEN_DIGIT)) {
      count++;
    }
    if (
      this.currentToken != null &&
      this.currentToken.type !== TOKEN_DECIMAL_SEPARATOR &&
      count > 3
    ) {
      throw new DecimalParserError("default");
    }
  }

  threeDigits(): void {
    this.expect(TOKEN_DIGIT);
    this.expect(TOKEN_DIGIT);
    this.expect(TOKEN_DIGIT);
  }

  fraction(): void {
    while (this.accept(TOKEN_DIGIT)) {
      /* fine */
    }
  }
}

function tokenize(s: string, options: TokenOptions): Token[] | undefined {
  const result = [];
  for (const c of s) {
    if (c === "-") {
      result.push(new Token(TOKEN_MINUS, c));
    } else if (c === options.decimalSeparator) {
      result.push(new Token(TOKEN_DECIMAL_SEPARATOR, TOKEN_DECIMAL_SEPARATOR));
    } else if (c === options.thousandSeparator) {
      result.push(
        new Token(TOKEN_THOUSAND_SEPARATOR, TOKEN_THOUSAND_SEPARATOR),
      );
    } else if (isDigit(c)) {
      result.push(new Token(TOKEN_DIGIT, c));
    } else if (isWhitespace(c)) {
      result.push(new Token(TOKEN_WHITESPACE, c));
    } else {
      return undefined;
    }
  }
  return result;
}

export function checkConverterOptions(
  converterOptions: StateConverterOptions | StateConverterOptionsWithContext,
): void {
  if (
    converterOptions.thousandSeparator === "." &&
    converterOptions.decimalSeparator == null
  ) {
    throw new Error(
      "Can't set thousandSeparator to . without setting decimalSeparator.",
    );
  }
  if (
    converterOptions.thousandSeparator === converterOptions.decimalSeparator &&
    converterOptions.thousandSeparator != null
  ) {
    throw new Error(
      "Can't set thousandSeparator and decimalSeparator to the same value.",
    );
  }
}
