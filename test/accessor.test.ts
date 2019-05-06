import { configure } from "mobx";
import { types } from "mobx-state-tree";
import { Field, Form, RepeatingForm, converters, FieldAccessor } from "../src";

// "always" leads to trouble during initialization.
configure({ enforceActions: "observed" });

test("accessByPath simple field", () => {
  const M = types.model("M", {
    foo: types.number
  });
  const form = new Form(M, {
    foo: new Field(converters.number)
  });

  const o = M.create({ foo: 3 });

  const state = form.state(o);
  const accessor = state.accessByPath("/foo");
  expect(accessor).toBeInstanceOf(FieldAccessor);
  if (!(accessor instanceof FieldAccessor)) {
    throw new Error("For the typechecker");
  }
  expect(accessor.value).toEqual(3);
});

test("accessByPath repeating form", () => {
  const N = types.model("N", {
    foo: types.number,
    bar: types.number // no field
  });
  const M = types.model("M", {
    entries: types.array(N)
  });

  const form = new Form(M, {
    entries: new RepeatingForm({
      foo: new Field(converters.number)
    })
  });

  const o = M.create({ entries: [{ foo: 3, bar: 4 }] });

  const state = form.state(o);
  const accessor = state.accessByPath("/entries/0/foo");
  expect(accessor).toBeInstanceOf(FieldAccessor);
  if (!(accessor instanceof FieldAccessor)) {
    throw new Error("For the typechecker");
  }
  expect(accessor.value).toEqual(3);

  expect(state.accessByPath("/entries/0/bar")).toBeUndefined();
});

test("acccessByPath which has no field", () => {
  const M = types.model("M", {
    foo: types.number,
    bar: types.number
  });
  // bar is not specified as a field
  const form = new Form(M, {
    foo: new Field(converters.number)
  });

  const o = M.create({ foo: 3, bar: 4 });

  const state = form.state(o);
  const accessor = state.accessByPath("/bar");
  expect(accessor).toBeUndefined();
});
