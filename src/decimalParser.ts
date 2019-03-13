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

type ParserOptions = {
  maxWholeDigits: number;
  decimalPlaces: number;
  allowNegative: boolean;
};

type TokenOptions = {
  decimalSeparator: string;
  thousandSeparator: string;
};

type Options = ParserOptions & TokenOptions;

type Accept = (tokenType: TokenType) => boolean;
type Expect = (tokenType: TokenType) => boolean;
type NextToken = () => void;

class Token {
  constructor(public type: TokenType, public value: string) {}
}

export function parseDecimal(s: string, options: Options): string | undefined {
  const tokens = tokenize(s, options);
  if (tokens == null) {
    throw new Error("Unknown tokens");
  }

  const parser = new Parser(tokens, options);

  parser.parse();

  // now that the parser has succeed we can make a simplifying assumption:
  // strings of tokens are now always legitimate.

  if (getWholeDigitAmount(tokens) > options.maxWholeDigits) {
    throw new Error("Too many whole digits");
  }
  if (getDecimalAmount(tokens) > options.decimalPlaces) {
    throw new Error("Too many decimal places");
  }

  // note that the tokenizer has replaced the decimal separator
  // with the standard "." at this point.
  return tokens
    .filter(token => token.type !== TOKEN_THOUSAND_SEPARATOR)
    .map(token => token.value)
    .join("");
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
class Parser {
  tokenIndex = 0;
  currentToken: Token | null | undefined = undefined;

  constructor(public tokens: Token[], public options: Options) {}

  nextToken: NextToken = () => {
    if (this.tokenIndex >= this.tokens.length) {
      this.currentToken = null;
      return;
    }
    const result = this.tokens[this.tokenIndex];
    this.tokenIndex++;
    this.currentToken = result;
  };

  accept: Accept = tokenType => {
    if (this.currentToken != null && this.currentToken.type === tokenType) {
      this.nextToken();
      return true;
    }
    return false;
  };

  expect: Expect = tokenType => {
    if (this.accept(tokenType)) {
      return true;
    }
    throw new Error(`Unexpected symbol: ${this.currentToken}`);
  };

  parse(): void {
    this.nextToken();
    this.decimal();
    if (this.currentToken != null) {
      console.log(this.currentToken);
      throw new Error("Could not parse");
    }
  }

  decimal(): void {
    if (this.options.allowNegative) {
      this.accept(TOKEN_MINUS);
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
      throw new Error("Too many digits");
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
        new Token(TOKEN_THOUSAND_SEPARATOR, TOKEN_THOUSAND_SEPARATOR)
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
