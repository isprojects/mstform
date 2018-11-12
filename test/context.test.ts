import { configure } from "mobx";
import { types } from "mobx-state-tree";
import { Field, Form, SubForm, RepeatingForm, converters } from "../src";

// "always" leads to trouble during initialization.
configure({ enforceActions: "observed" });

test("context passed to field accessor", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string)
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o, { context: "foo" });
  const field = state.field("foo");

  expect(field.context).toEqual("foo");
});

test("context passed to sub form accessor", async () => {
  const N = types.model("N", {
    bar: types.string
  });
  const M = types.model("M", {
    foo: N
  });

  const form = new Form(M, {
    foo: new SubForm({ bar: new Field(converters.string) })
  });

  const o = M.create({ foo: { bar: "BAR" } });

  const state = form.state(o, { context: "foo" });
  const subForm = state.subForm("foo");

  expect(subForm.context).toEqual("foo");
});

test("context passed to repeating form accessor", async () => {
  const N = types.model("N", {
    bar: types.string
  });
  const M = types.model("M", {
    foo: types.array(N)
  });

  const form = new Form(M, {
    foo: new RepeatingForm({ bar: new Field(converters.string) })
  });

  const o = M.create({ foo: [{ bar: "BAR" }] });

  const state = form.state(o, { context: "foo" });
  const repeatingForm = state.repeatingForm("foo");

  expect(repeatingForm.context).toEqual("foo");
});

test("context passed to repeating form indexed accessor", async () => {
  const N = types.model("N", {
    bar: types.string
  });
  const M = types.model("M", {
    foo: types.array(N)
  });

  const form = new Form(M, {
    foo: new RepeatingForm({ bar: new Field(converters.string) })
  });

  const o = M.create({ foo: [{ bar: "BAR" }] });

  const state = form.state(o, { context: "foo" });
  const repeatingForm = state.repeatingForm("foo");
  const f = repeatingForm.index(0);

  expect(f.context).toEqual("foo");
});
