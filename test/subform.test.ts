import { configure } from "mobx";
import { getSnapshot, types, applySnapshot, onPatch } from "mobx-state-tree";
import { Converter, Field, Form, RepeatingForm, converters } from "../src";

// "strict" leads to trouble during initialization.
configure({ enforceActions: true });

test("a sub form", async () => {
  const N = types.model("N", {
    bar: types.string
  });

  const M = types.model("M", {
    foo: types.string,
    sub: N
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
    sub: new Form(N, {
      bar: new Field(converters.string)
    })
  });

  const o = M.create({ foo: "FOO", sub: { bar: "BAR" } });

  const state = form.state(o);
  const fooField = state.field("foo");
  const barField = state.subForm("sub").field("bar");

  expect(fooField.raw).toEqual("FOO");
  await fooField.setRaw("FOO!");
  expect(fooField.raw).toEqual("FOO!");
  expect(fooField.value).toEqual("FOO!");
  expect(o.foo).toEqual("FOO!");

  expect(barField.raw).toEqual("BAR");
  await barField.setRaw("BAR!");
  expect(barField.value).toEqual("BAR!");
  expect(o.sub.bar).toEqual("BAR!");
});
