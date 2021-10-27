import { configure } from "mobx";
import { types } from "mobx-state-tree";
import {
  Field,
  Form,
  RepeatingForm,
  RepeatingFormAccessor,
  RepeatingFormIndexedAccessor,
  converters,
  FieldAccessor,
  Group,
} from "../src";

configure({ enforceActions: "always" });

test("accessByPath simple field", () => {
  const M = types.model("M", {
    foo: types.number,
  });
  const form = new Form(M, {
    foo: new Field(converters.number),
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
    bar: types.number, // no field
  });
  const M = types.model("M", {
    entries: types.array(N),
  });

  const form = new Form(M, {
    entries: new RepeatingForm({
      foo: new Field(converters.number),
    }),
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
    bar: types.number,
  });
  // bar is not specified as a field
  const form = new Form(M, {
    foo: new Field(converters.number),
  });

  const o = M.create({ foo: 3, bar: 4 });

  const state = form.state(o);
  const accessor = state.accessByPath("/bar");
  expect(accessor).toBeUndefined();
});

test("groups with repeatingform error on top-level", async () => {
  const N = types.model("N", {
    bar: types.string,
  });
  const M = types.model("M", {
    foo: types.array(N),
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.string),
    }),
  });

  const o = M.create({ foo: [] });

  const state = form.state(o, {
    getError: (accessor: any) =>
      accessor instanceof RepeatingFormAccessor && accessor.length === 0
        ? "Cannot be empty"
        : undefined,
    getWarning: (accessor: any) =>
      accessor instanceof RepeatingFormAccessor
        ? "Some some reason this is insufficient"
        : undefined,
  });

  const repeatingForm = state.repeatingForm("foo");

  expect(repeatingForm.isValid).toBeFalsy();
  expect(repeatingForm.isWarningFree).toBeFalsy();
});

test("groups with indexed repeatingform error on top-level", async () => {
  const N = types.model("N", {
    bar: types.string,
  });
  const M = types.model("M", {
    foo: types.array(N),
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.string),
    }),
  });

  const o = M.create({ foo: [{ bar: "BAR" }] });

  const state = form.state(o, {
    getError: (accessor: any) =>
      accessor instanceof RepeatingFormIndexedAccessor
        ? "For some reason this is wrong"
        : undefined,
    getWarning: (accessor: any) =>
      accessor instanceof RepeatingFormIndexedAccessor
        ? "Some some reason this is insufficient"
        : undefined,
  });

  const repeatingForm = state.repeatingForm("foo");
  const indexedRepeatingForm = repeatingForm.index(0);

  expect(indexedRepeatingForm.isValid).toBeFalsy();
  expect(indexedRepeatingForm.isWarningFree).toBeFalsy();
});
