import { configure } from "mobx";
import { types } from "mobx-state-tree";
import { Field, Form, SubForm, converters } from "../src";

// "always" leads to trouble during initialization.
configure({ enforceActions: "observed" });

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
    sub: new SubForm({
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

test("sub form validation", async () => {
  const N = types.model("N", {
    bar: types.string
  });

  const M = types.model("M", {
    foo: types.string,
    sub: N
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
    sub: new SubForm({
      bar: new Field(converters.string, { required: true })
    })
  });

  const o = M.create({ foo: "FOO", sub: { bar: "BAR" } });

  const state = form.state(o);
  const fooField = state.field("foo");
  const barField = state.subForm("sub").field("bar");

  await barField.setRaw("");

  expect(state.isValid).toBeFalsy();

  await barField.setRaw("BAR!");

  expect(state.isValid).toBeTruthy();
});

test("SubField disabled when SubForm disabled", async () => {
  const N = types.model("N", {
    subField: types.string
  });

  const M = types.model("M", {
    subForm: N
  });

  const form = new Form(M, {
    subForm: new SubForm({
      subField: new Field(converters.string)
    })
  });

  const o = M.create({
    subForm: { subField: "SUB_FIELD" }
  });

  const state = form.state(o, {
    isDisabled: accessor => accessor.path === "/subForm"
  });

  const subForm = state.subForm("subForm");
  const subField = state.subForm("subForm").field("subField");

  expect(subForm.disabled).toBeTruthy();
  expect(subField.disabled).toBeTruthy();
});

test("SubField disabled when SubForm in a SubForm is disabled", async () => {
  const O = types.model("O", {
    subField: types.string
  });

  const N = types.model("N", {
    subForm2: O
  });

  const M = types.model("M", {
    subForm: N
  });

  const form = new Form(M, {
    subForm: new SubForm({
      subForm2: new SubForm({
        subField: new Field(converters.string)
      })
    })
  });

  const o = M.create({
    subForm: { subForm2: { subField: "SUB_FIELD" } }
  });

  const state = form.state(o, {
    isDisabled: accessor => accessor.path === "/subForm"
  });

  const subForm = state.subForm("subForm");
  const subForm2 = state.subForm("subForm").subForm("subForm2");
  const subField = state
    .subForm("subForm")
    .subForm("subForm2")
    .field("subField");

  expect(subForm.disabled).toBeTruthy();
  expect(subForm2.disabled).toBeTruthy();
  expect(subField.disabled).toBeTruthy();
});
