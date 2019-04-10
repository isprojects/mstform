import { types } from "mobx-state-tree";
import { converters, Field, Form } from "../src";

test("dynamic based on accessor", async () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string
  });

  const getOptions = (context: any, accessor: any) => {
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

// test("map conversion error types", () => {
//   const form = new Form(M, {
//     foo: new Field(converters.decimal(), {
//       conversionError: (context, errorType) => { return "Foo"}
//     })
//   }, {}, {conversionErrors: { converters.decimal: (context, errorType) => ({})});
// });

// is there a way to create decimal options that are global for the whole form?
// for instance whether to use a . or , for the decimal separator.
