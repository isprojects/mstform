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

  const parser = new Parser(tokens);

  parser.parse();

  return tokens
    .filter(token => token.type !== TOKEN_THOUSAND_SEPARATOR)
    .map(token => token.value)
    .join("");
}

// Grammar
// decimal = {minus} absoluteDecimal
// absoluteDecimal = whole
//                 | whole decimalSeparator {fraction}
//                 | decimalSeparator fraction
// whole = threeOrLessDigits | threeOrLessDigits thousandSeparator moreWholeDigits
// moreWholeDigits = threeDigits | threeDigits thousandSeparator moreWholeDigits
// fraction = digit | digit fraction

class Parser {
  tokenIndex = 0;
  currentToken: Token | null | undefined = undefined;

  constructor(public tokens: Token[]) {}

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
    this.accept(TOKEN_MINUS);
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
      this.moreWholeDigits();
    }
  }

  threeOrLessDigits(): void {
    let count = 1;
    this.expect(TOKEN_DIGIT);
    while (this.accept(TOKEN_DIGIT)) {
      count++;
    }
    if (count > 3) {
      throw new Error("Too many digits");
    }
  }

  moreWholeDigits(): void {
    this.expect(TOKEN_DIGIT);
    this.expect(TOKEN_DIGIT);
    this.expect(TOKEN_DIGIT);
    // if (this.accept(TOKEN_THOUSAND_SEPARATOR)) {
    //   this.moreWholeDigits();
    // }
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
