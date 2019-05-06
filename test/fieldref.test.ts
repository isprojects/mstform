import { types } from "mobx-state-tree";

import { Form, Field, RepeatingForm, SubForm, converters } from "../src";
import { pathToFieldref } from "../src/utils";

test("path to fieldref", () => {
  expect(pathToFieldref("foo")).toEqual("foo");
  expect(pathToFieldref("foo/bar")).toEqual("foo.bar");
  expect(pathToFieldref("foo/1/bar")).toEqual("foo[].bar");
  expect(pathToFieldref("")).toEqual("");
  expect(pathToFieldref("/foo")).toEqual("foo");
});

test("fieldref", () => {
  const N = types.model("N", {
    repeatingField: types.string
  });
  const Sub = types.model("Sub", {
    subField: types.string
  });
  const M = types.model("M", {
    field: types.string,
    repeating: types.array(N),
    sub: Sub
  });

  const form = new Form(M, {
    field: new Field(converters.string),
    repeating: new RepeatingForm({
      repeatingField: new Field(converters.string)
    }),
    sub: new SubForm({
      subField: new Field(converters.string)
    })
  });

  const o = M.create({
    field: "FIELD",
    repeating: [{ repeatingField: "REPEATING_FIELD" }],
    sub: { subField: "SUB FIELD" }
  });

  const state = form.state(o);

  const field = state.field("field");
  const repeating = state.repeatingForm("repeating");
  const repeatingIndex = repeating.index(0);
  const repeatingField = repeatingIndex.field("repeatingField");
  const sub = state.subForm("sub");
  const subField = sub.field("subField");

  expect(state.fieldref).toEqual("");
  expect(field.fieldref).toEqual("field");
  expect(repeating.fieldref).toEqual("repeating");
  expect(repeatingIndex.fieldref).toEqual("repeating[]");
  expect(repeatingField.fieldref).toEqual("repeating[].repeatingField");
  expect(sub.fieldref).toEqual("sub");
  expect(subField.fieldref).toEqual("sub.subField");
});
