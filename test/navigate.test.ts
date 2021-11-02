import { configure } from "mobx";
import { types, getType } from "mobx-state-tree";
import {
  Field,
  Form,
  SubForm,
  RepeatingForm,
  converters,
  IFormAccessor,
  IAnyFormAccessor,
} from "../src";

// "always" leads to trouble during initialization.
configure({ enforceActions: "observed" });

test("value for state", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);
  expect(state.value).toBe(o);
});

test("value for sub form", () => {
  const N = types
    .model("N", {
      bar: types.string,
    })
    .views((self) => ({
      something() {
        return self.bar + "X";
      },
    }));

  const M = types.model("M", {
    foo: N,
  });

  const form = new Form(M, {
    foo: new SubForm({
      bar: new Field(converters.string),
    }),
  });

  const o = M.create({ foo: { bar: "BAR" } });

  const state = form.state(o);
  const sub = state.subForm("foo");

  expect(sub.value).toBe(o.foo);
  expect(getType(sub.value)).toBe(N);
  expect(sub.value.something()).toEqual("BARX");
  expect(getType((sub.parent as IAnyFormAccessor).value)).toBe(M);
});

test("value for repeating form", () => {
  const N = types
    .model("N", {
      bar: types.string,
    })
    .views((self) => ({
      something() {
        return self.bar + "X";
      },
    }));

  const M = types.model("M", {
    foo: types.array(N),
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.string),
    }),
  });

  const o = M.create({ foo: [{ bar: "BAR" }] });

  const state = form.state(o);
  const forms = state.repeatingForm("foo");

  expect(forms.value).toEqual(o.foo);

  const first = forms.index(0);

  expect(first.value).toBe(o.foo[0]);
  expect(getType(first.value)).toBe(N);
  expect(first.value.something()).toEqual("BARX");
  const parent = first.parent as IAnyFormAccessor;
  const parentParent = parent.parent as IAnyFormAccessor;
  expect(getType(parent.value)).toMatchObject(types.array(N));
  expect(getType(parentParent.value)).toBe(M);
});
