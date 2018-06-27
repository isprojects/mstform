import { configure } from "mobx";
import { types } from "mobx-state-tree";
import { converters, normalizers, Form, Field } from "../src";
configure({ enforceActions: true });

test("object normalizer", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.object, { normalizer: normalizers.object })
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.inputProps.value).toEqual("FOO");
  expect(field.inputProps.checked).toBeUndefined();
  await field.inputProps.onChange("BAR");
  expect(field.raw).toEqual("BAR");
});

test("value normalizer", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.object, { normalizer: normalizers.value })
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.inputProps.value).toEqual("FOO");
  expect(field.inputProps.checked).toBeUndefined();
  await field.inputProps.onChange({ target: { value: "BAR" } });
  expect(field.raw).toEqual("BAR");
});

test("checked normalizer", async () => {
  const M = types.model("M", {
    foo: types.boolean
  });

  const form = new Form(M, {
    foo: new Field(converters.object, { normalizer: normalizers.checked })
  });

  const o = M.create({ foo: true });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.inputProps.checked).toEqual(true);
  expect(field.inputProps.value).toBeUndefined();
  await field.inputProps.onChange({ target: { checked: false } });
  expect(field.raw).toEqual(false);
});

test("custom normalizer", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.object, {
      normalizer: accessor => {
        return {
          weird: accessor.raw,
          onChange: accessor.handleChange
        };
      }
    })
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.inputProps.weird).toEqual("FOO");
  await field.inputProps.onChange("BAR");
  expect(field.raw).toEqual("BAR");
});

test("default value normalizer for string converter", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string)
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.inputProps.value).toEqual("FOO");
  expect(field.inputProps.checked).toBeUndefined();
  await field.inputProps.onChange({ target: { value: "BAR" } });
  expect(field.raw).toEqual("BAR");
});

test("default value normalizer for maybe string converter", async () => {
  const M = types.model("M", {
    foo: types.maybe(types.string)
  });

  const form = new Form(M, {
    foo: new Field(converters.maybe(converters.string))
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.inputProps.value).toEqual("FOO");
  expect(field.inputProps.checked).toBeUndefined();
  await field.inputProps.onChange({ target: { value: "BAR" } });
  expect(field.raw).toEqual("BAR");
});

test("default checked normalizer for boolean converter", async () => {
  const M = types.model("M", {
    foo: types.boolean
  });

  const form = new Form(M, {
    foo: new Field(converters.boolean)
  });

  const o = M.create({ foo: true });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.inputProps.checked).toEqual(true);
  expect(field.inputProps.value).toBeUndefined();
  await field.inputProps.onChange({ target: { checked: false } });
  expect(field.raw).toEqual(false);
});

test("default object normalizer", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.object)
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.inputProps.value).toEqual("FOO");
  expect(field.inputProps.checked).toBeUndefined();
  await field.inputProps.onChange("BAR");
  expect(field.raw).toEqual("BAR");
});

test("default object normalizer for maybe converter", async () => {
  const M = types.model("M", {
    foo: types.maybe(types.string)
  });

  const form = new Form(M, {
    foo: new Field(converters.object)
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.inputProps.value).toEqual("FOO");
  expect(field.inputProps.checked).toBeUndefined();
  await field.inputProps.onChange("BAR");
  expect(field.raw).toEqual("BAR");
});
