import { configure } from "mobx";
import { types } from "mobx-state-tree";
import { Field, Form, RepeatingForm, SubForm, converters } from "../src";

// "strict" leads to trouble during initialization.
configure({ enforceActions: true });

test("a simple warning", async () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string)
  });

  const o = M.create({ foo: "FOO", bar: "BAR" });

  const state = form.state(o, {
    getWarning: accessor =>
      accessor.path === "/foo" ? "Please reconsider" : undefined
  });
  const fooField = state.field("foo");
  const barField = state.field("bar");

  expect(fooField.raw).toEqual("FOO");
  expect(fooField.warning).toEqual("Please reconsider");
  expect(barField.raw).toEqual("BAR");
  expect(barField.warning).toBeUndefined();
  expect(state.isWarningFree).toBeFalsy();

  await state.save();
  // warnings are not cleared by a save
  expect(fooField.warning).toEqual("Please reconsider");
});

test("a simple error", () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string)
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o, {
    getError: accessor => (accessor.path === "/foo" ? "Wrong" : undefined)
  });
  const fooField = state.field("foo");

  expect(fooField.raw).toEqual("FOO");
  expect(fooField.error).toEqual("Wrong");
  expect(state.isWarningFree).toBeTruthy();
});

test("both errors and warnings", () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string)
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o, {
    getError: accessor => (accessor.path === "/foo" ? "Wrong" : undefined),
    getWarning: accessor =>
      accessor.path === "/foo" ? "Please reconsider" : undefined
  });
  const fooField = state.field("foo");

  expect(fooField.raw).toEqual("FOO");
  expect(fooField.error).toEqual("Wrong");
  expect(fooField.warning).toEqual("Please reconsider");
  expect(state.isWarningFree).toBeFalsy();
});

test("warning in repeating form", () => {
  const N = types.model("N", {
    bar: types.string
  });
  const M = types.model("M", {
    foo: types.array(N)
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.string)
    })
  });

  const o = M.create({ foo: [{ bar: "correct" }, { bar: "incorrect" }] });

  const state = form.state(o, {
    getWarning: accessor =>
      accessor.raw === "incorrect" ? "Please reconsider" : undefined
  });

  const forms = state.repeatingForm("foo");
  const barField1 = forms.index(0).field("bar");
  const barField2 = forms.index(1).field("bar");

  expect(barField1.raw).toEqual("correct");
  expect(barField1.warning).toBeUndefined();
  expect(barField2.raw).toEqual("incorrect");
  expect(barField2.warning).toEqual("Please reconsider");
  expect(state.isWarningFree).toBeFalsy();
});

test("warning in subform", () => {
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

  const state = form.state(o, {
    getWarning: accessor =>
      accessor.path === "/sub/bar" ? "Please reconsider" : undefined
  });

  const fooField = state.field("foo");
  const barField = state.subForm("sub").field("bar");
  expect(fooField.raw).toEqual("FOO");
  expect(fooField.warning).toBeUndefined();
  expect(barField.raw).toEqual("BAR");
  expect(barField.warning).toEqual("Please reconsider");
  expect(state.isWarningFree).toBeFalsy();
});
