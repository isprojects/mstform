import { types } from "mobx-state-tree";
import { converters, Field, Form, FieldAccessor } from "../src";

test("dynamic based on accessor", () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string,
  });

  const getOptions = (context: any, accessor: FieldAccessor<any, any>) => {
    if (accessor.fieldref === "foo") {
      return { allowNegative: false };
    } else {
      return { allowNegative: true };
    }
  };

  const form = new Form(M, {
    foo: new Field(converters.dynamic(converters.stringDecimal, getOptions)),
    bar: new Field(converters.dynamic(converters.stringDecimal, getOptions)),
  });

  const o = M.create({ foo: "1.2", bar: "3.4" });

  const state = form.state(o);
  const foo = state.field("foo");
  const bar = state.field("bar");

  foo.setRaw("-1.2");
  expect(foo.error).toEqual("Could not convert");

  bar.setRaw("-3.4");
  expect(bar.error).toBeUndefined();
});

test("dynamic converter with maybe", () => {
  const M = types.model("M", {
    foo: types.maybe(types.string),
  });

  const getOptions = (context: any, accessor: FieldAccessor<any, any>) => {
    return { allowNegative: false };
  };

  const form = new Form(M, {
    foo: new Field(
      converters.maybe(converters.dynamic(converters.stringDecimal, getOptions))
    ),
  });

  const o = M.create({ foo: "1.2" });

  const state = form.state(o);
  const foo = state.field("foo");

  foo.setRaw("-1.2");
  expect(foo.error).toEqual("Could not convert");

  foo.setRaw("");
  expect(foo.error).toBeUndefined();
  expect(foo.value).toBeUndefined();
});

test("dynamic converter with maybeNull", () => {
  const M = types.model("M", {
    foo: types.maybeNull(types.string),
  });

  const getOptions = (context: any, accessor: FieldAccessor<any, any>) => {
    return { allowNegative: false };
  };

  const form = new Form(M, {
    foo: new Field(
      converters.maybeNull(
        converters.dynamic(converters.stringDecimal, getOptions)
      )
    ),
  });

  const o = M.create({ foo: "1.2" });

  const state = form.state(o);
  const foo = state.field("foo");

  foo.setRaw("-1.2");
  expect(foo.error).toEqual("Could not convert");

  foo.setRaw("");
  expect(foo.error).toBeUndefined();
  expect(foo.value).toBeNull();
});
