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
