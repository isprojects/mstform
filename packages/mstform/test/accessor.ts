import { configure, IReactionDisposer } from "mobx";
import { getSnapshot, types } from "mobx-state-tree";
import {
  Converter,
  Field,
  Form,
  RepeatingForm,
  converters,
  FieldAccessor
} from "../src";

// "strict" leads to trouble during initialization. we may want to lift this
// restriction in ispnext in the future as we use MST now, which has its
// own mechanism
configure({ enforceActions: true });

test("accessByPath simple field", async () => {
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

test("accessByPath repeating form", async () => {
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

test("acccessByPath which has no field", async () => {
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
