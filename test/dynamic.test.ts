import { types } from "mobx-state-tree";
import { converters, Field, Form, FieldAccessor } from "../src";

test("dynamic based on accessor", async () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string
  });

  const getOptions = (context: any, accessor: FieldAccessor<any, any>) => {
    if (accessor.fieldref === "foo") {
      return { allowNegative: false };
    } else {
      return { allowNegative: true };
    }
  };

  const form = new Form(M, {
    foo: new Field(converters.dynamic(converters.decimal, getOptions)),
    bar: new Field(converters.dynamic(converters.decimal, getOptions))
  });

  const o = M.create({ foo: "1.2", bar: "3.4" });

  const state = form.state(o);
  const foo = state.field("foo");
  const bar = state.field("bar");

  await foo.setRaw("-1.2");
  expect(foo.error).toEqual("Could not convert");

  await bar.setRaw("-3.4");
  expect(bar.error).toBeUndefined();
});

test("dynamic converter with maybe", async () => {
  const M = types.model("M", {
    foo: types.maybe(types.string)
  });

  const getOptions = (context: any, accessor: FieldAccessor<any, any>) => {
    return { allowNegative: false };
  };

  const form = new Form(M, {
    foo: new Field(
      converters.maybe(converters.dynamic(converters.decimal, getOptions))
    )
  });

  const o = M.create({ foo: "1.2" });

  const state = form.state(o);
  const foo = state.field("foo");

  await foo.setRaw("-1.2");
  expect(foo.error).toEqual("Could not convert");

  await foo.setRaw("");
  expect(foo.error).toBeUndefined();
  expect(foo.value).toBeUndefined();
});

test("dynamic converter with maybeNull", async () => {
  const M = types.model("M", {
    foo: types.maybeNull(types.string)
  });

  const getOptions = (context: any, accessor: FieldAccessor<any, any>) => {
    return { allowNegative: false };
  };

  const form = new Form(M, {
    foo: new Field(
      converters.maybeNull(converters.dynamic(converters.decimal, getOptions))
    )
  });

  const o = M.create({ foo: "1.2" });

  const state = form.state(o);
  const foo = state.field("foo");

  await foo.setRaw("-1.2");
  expect(foo.error).toEqual("Could not convert");

  await foo.setRaw("");
  expect(foo.error).toBeUndefined();
  expect(foo.value).toBeNull();
});
