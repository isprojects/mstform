import { configure } from "mobx";
import { types } from "mobx-state-tree";
import {
  Field,
  Form,
  SubForm,
  RepeatingForm,
  converters,
  Converter,
  ConversionError,
} from "../src";

configure({ enforceActions: "always" });

test("context passed to field accessor", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o, { context: "foo" });
  const field = state.field("foo");

  expect(field.context).toEqual("foo");
});

test("context passed to sub form accessor", () => {
  const N = types.model("N", {
    bar: types.string,
  });
  const M = types.model("M", {
    foo: N,
  });

  const form = new Form(M, {
    foo: new SubForm({ bar: new Field(converters.string) }),
  });

  const o = M.create({ foo: { bar: "BAR" } });

  const state = form.state(o, { context: "foo" });
  const subForm = state.subForm("foo");

  expect(subForm.context).toEqual("foo");
});

test("context passed to repeating form accessor", () => {
  const N = types.model("N", {
    bar: types.string,
  });
  const M = types.model("M", {
    foo: types.array(N),
  });

  const form = new Form(M, {
    foo: new RepeatingForm({ bar: new Field(converters.string) }),
  });

  const o = M.create({ foo: [{ bar: "BAR" }] });

  const state = form.state(o, { context: "foo" });
  const repeatingForm = state.repeatingForm("foo");

  expect(repeatingForm.context).toEqual("foo");
});

test("context passed to repeating form indexed accessor", () => {
  const N = types.model("N", {
    bar: types.string,
  });
  const M = types.model("M", {
    foo: types.array(N),
  });

  const form = new Form(M, {
    foo: new RepeatingForm({ bar: new Field(converters.string) }),
  });

  const o = M.create({ foo: [{ bar: "BAR" }] });

  const state = form.state(o, { context: "foo" });
  const repeatingForm = state.repeatingForm("foo");
  const f = repeatingForm.index(0);

  expect(f.context).toEqual("foo");
});

test("context in validate", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string, {
      validators: [(value, context) => value !== context.theValue && "Wrong"],
    }),
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o, { context: { theValue: "correct" } });
  const field = state.field("foo");

  expect(field.raw).toEqual("FOO");
  field.setRaw("BAR");
  expect(field.raw).toEqual("BAR");
  expect(field.error).toEqual("Wrong");
  expect(field.value).toEqual("FOO");
  field.setRaw("correct");
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual("correct");

  const o2 = M.create({ foo: "FOO" });
  const state2 = form.state(o, { context: { theValue: "other" } });

  const field2 = state2.field("foo");

  field2.setRaw("correct");
  expect(field2.error).toEqual("Wrong");
});

test("context in converter", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const myConverter = new Converter<string, string>({
    emptyRaw: "",
    convert(raw, options) {
      if (!raw.startsWith(options.context.prefix)) {
        throw new ConversionError();
      }
      return raw;
    },
    render(value) {
      return value;
    },
    hasChange(currentValue: string, newValue: string): boolean {
      return currentValue !== newValue;
    },
  });

  const form = new Form(M, {
    foo: new Field(myConverter),
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o, { context: { prefix: "X" } });
  const field = state.field("foo");

  field.setRaw("XBAR");
  expect(field.raw).toEqual("XBAR");
  expect(field.error).toBeUndefined();

  field.setRaw("YBAR");
  expect(field.value).toEqual("XBAR");
  expect(field.error).toEqual("Could not convert");
});

test("context in converter in convert", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const myConverter = new Converter<string, string>({
    emptyRaw: "",
    convert(raw: string, options) {
      return options.context.prefix + raw;
    },
    render(value) {
      return value;
    },
    hasChange(currentValue: string, newValue: string): boolean {
      return currentValue !== newValue;
    },
  });

  const form = new Form(M, {
    foo: new Field(myConverter),
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o, { context: { prefix: "X" } });
  const field = state.field("foo");

  field.setRaw("BAR");
  expect(field.error).toBeUndefined();
  expect(field.raw).toEqual("BAR");
  expect(field.value).toEqual("XBAR");
});

test("context in converter in render", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const myConverter = new Converter<string, string>({
    emptyRaw: "",
    convert(raw: string) {
      return raw;
    },
    render(value, options) {
      return options.context.prefix + value;
    },
    hasChange(currentValue: string, newValue: string): boolean {
      return currentValue !== newValue;
    },
  });

  const form = new Form(M, {
    foo: new Field(myConverter),
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o, { context: { prefix: "X" } });
  const field = state.field("foo");

  expect(field.raw).toEqual("XFOO");

  field.setRaw("BAR");
  expect(field.error).toBeUndefined();
  expect(field.raw).toEqual("BAR");
  expect(field.value).toEqual("BAR");
});

test("requiredError", () => {
  const M = types.model("M", {
    foo: types.number,
  });

  const form = new Form(M, {
    foo: new Field(converters.number, {
      required: true,
      requiredError: "Required!",
    }),
  });

  const o = M.create({ foo: 3 });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("3");
  expect(field.value).toEqual(3);
  field.setRaw("");
  expect(field.error).toEqual("Required!");
  expect(field.value).toEqual(3);
});

test("requiredError dynamic with context", () => {
  const M = types.model("M", {
    foo: types.number,
  });

  const form = new Form(M, {
    foo: new Field(converters.number, {
      required: true,
      requiredError: (context: any) => "Required" + context,
    }),
  });

  const o = M.create({ foo: 3 });

  const state = form.state(o, { context: "!!" });

  const field = state.field("foo");

  expect(field.raw).toEqual("3");
  expect(field.value).toEqual(3);
  field.setRaw("");
  expect(field.error).toEqual("Required!!");
  expect(field.value).toEqual(3);
});

test("conversionError dynamic with context", () => {
  const M = types.model("M", {
    foo: types.number,
  });

  const form = new Form(M, {
    foo: new Field(converters.number, {
      conversionError: (context: any) => "Not a number" + context,
    }),
  });

  const o = M.create({ foo: 3 });

  const state = form.state(o, { context: "!!" });

  const field = state.field("foo");

  expect(field.raw).toEqual("3");
  field.setRaw("4");
  expect(field.raw).toEqual("4");
  expect(field.value).toEqual(4);
  expect(field.error).toBeUndefined();
  field.setRaw("not a number");
  expect(field.value).toEqual(4);
  expect(field.error).toEqual("Not a number!!");
});

test("converter options in decimal converter in convert", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.stringDecimal()),
  });

  const o = M.create({ foo: "4300.20" });

  const state = form.state(o, {
    converterOptions: { decimalSeparator: "," },
  });
  const field = state.field("foo");

  field.setRaw("5300,20");
  expect(field.error).toBeUndefined();
  expect(field.raw).toEqual("5300,20");
  expect(field.value).toEqual("5300.20");
});

test("converter options in decimal converter in render", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.stringDecimal()),
  });

  const o = M.create({ foo: "1234567.89" });

  const state = form.state(o, {
    converterOptions: { decimalSeparator: "," },
  });
  const field = state.field("foo");

  expect(field.raw).toEqual("1234567,89");
});

test("converter options in number converter in convert", () => {
  const M = types.model("M", {
    foo: types.number,
  });

  const form = new Form(M, {
    foo: new Field(converters.number),
  });

  const o = M.create({ foo: 4300.2 });

  const state = form.state(o, {
    converterOptions: { decimalSeparator: "," },
  });
  const field = state.field("foo");

  field.setRaw("5300,20");
  expect(field.error).toBeUndefined();
  expect(field.raw).toEqual("5300,20");
  expect(field.value).toEqual(5300.2);
});

test("converter options in number converter in render", () => {
  const M = types.model("M", {
    foo: types.number,
  });

  const form = new Form(M, {
    foo: new Field(converters.number),
  });

  const o = M.create({ foo: 1234567 });

  const state = form.state(o, {
    converterOptions: { thousandSeparator: ",", renderThousands: true },
  });
  const field = state.field("foo");

  expect(field.raw).toEqual("1,234,567");
});
