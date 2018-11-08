import { configure } from "mobx";
import { types } from "mobx-state-tree";
import { Field, Form, RepeatingForm, SubForm, converters } from "../src";

// "strict" leads to trouble during initialization.
configure({ enforceActions: true });

test("setRaw with required ignore", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string, {
      required: true
    })
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);
  const field = state.field("foo");

  await field.setRaw("");
  expect(field.value).toEqual("FOO");

  await field.setRaw("", { ignoreRequired: true });
  expect(field.value).toEqual("");
  expect(o.foo).toEqual("");
});

test("FormState can be saved ignoring required", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const o = M.create({ foo: "FOO" });

  const form = new Form(M, {
    foo: new Field(converters.string, { required: true })
  });

  let saved = false;

  async function save(data: any) {
    saved = true;
    return null;
  }

  const state = form.state(o, { save });

  const field = state.field("foo");

  // we set the raw to the empty string even though it's required
  await field.setRaw("");
  expect(field.error).toEqual("Required");
  expect(o.foo).toEqual("FOO");

  // now we save, ignoring required
  const saveResult = await state.save({ ignoreRequired: true });
  // we still see the message, even though save succeeded
  expect(field.error).toEqual("Required");
  // but saving actually succeeded
  expect(o.foo).toEqual("");
  expect(saveResult).toBeTruthy();
  expect(saved).toBeTruthy();

  // saving again without ignoreRequired will be an error
  const saveResult1 = await state.save();
  expect(saveResult1).toBeFalsy();
  expect(field.error).toEqual("Required");
});

test("FormState can be saved ignoring external errors", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const o = M.create({ foo: "FOO" });

  const form = new Form(M, {
    foo: new Field(converters.string)
  });

  let saved = false;

  async function save(data: any) {
    saved = true;
    return null;
  }

  const state = form.state(o, {
    save,
    getError: accessor => (accessor.path === "/foo" ? "Wrong!" : undefined)
  });

  const field = state.field("foo");

  // we change a value to trigger the error
  await field.setRaw("BAR");
  expect(field.error).toEqual("Wrong!");
  // this is an external error, so change does happen
  expect(o.foo).toEqual("BAR");

  expect(field.isInternallyValid).toBeTruthy();
  // we are without internal errors
  expect(await state.validate({ ignoreGetError: true })).toBeTruthy();

  // now we save, ignoring external error
  const saveResult = await state.save({ ignoreGetError: true });
  expect(field.error).toEqual("Wrong!");
  expect(o.foo).toEqual("BAR");
  expect(saveResult).toBeTruthy();
  expect(saved).toBeTruthy();

  // but saving again without ignoreGetError will be an error
  const saveResult1 = await state.save();
  expect(saveResult1).toBeFalsy();
  expect(field.error).toEqual("Wrong!");
});

test("FormState can be saved ignoring non-field external errors", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const o = M.create({ foo: "FOO" });

  const form = new Form(M, {
    foo: new Field(converters.string)
  });

  let saved = false;

  async function save(data: any) {
    saved = true;
    return null;
  }

  const state = form.state(o, {
    save,
    getError: accessor => (accessor.path === "" ? "Wrong!" : undefined)
  });

  const field = state.field("foo");

  // we have an internal error
  expect(await state.validate()).toBeFalsy();
  // we can ignore it
  expect(await state.validate({ ignoreGetError: true })).toBeTruthy();

  // now we save, ignoring external error
  const saveResult = await state.save({ ignoreGetError: true });
  expect(state.error).toEqual("Wrong!");
  expect(saveResult).toBeTruthy();
  expect(saved).toBeTruthy();

  // but saving again without ignoreGetError will be an error
  const saveResult1 = await state.save();
  expect(saveResult1).toBeFalsy();
});

test("ignoreGetError repeating indexed accessor non-field external", async () => {
  const N = types.model("N", {
    foo: types.string
  });
  const M = types.model("M", {
    items: types.array(N)
  });

  const o = M.create({ items: [{ foo: "FOO" }] });

  const form = new Form(M, {
    items: new RepeatingForm({ foo: new Field(converters.string) })
  });

  let saved = false;

  async function save(data: any) {
    saved = true;
    return null;
  }

  const state = form.state(o, {
    save,
    getError: accessor => (accessor.path === "/items/0" ? "Wrong!" : undefined)
  });

  // we have an internal error
  expect(await state.validate()).toBeFalsy();
  // we can ignore it
  expect(await state.validate({ ignoreGetError: true })).toBeTruthy();

  // now we save, ignoring external error
  const saveResult = await state.save({ ignoreGetError: true });
  expect(saveResult).toBeTruthy();
  expect(saved).toBeTruthy();

  // but saving again without ignoreGetError will be an error
  const saveResult1 = await state.save();
  expect(saveResult1).toBeFalsy();
});

test("ignoreGetError repeating accessor non-field external", async () => {
  const N = types.model("N", {
    foo: types.string
  });
  const M = types.model("M", {
    items: types.array(N)
  });

  const o = M.create({ items: [{ foo: "FOO" }] });

  const form = new Form(M, {
    items: new RepeatingForm({ foo: new Field(converters.string) })
  });

  let saved = false;

  async function save(data: any) {
    saved = true;
    return null;
  }

  const state = form.state(o, {
    save,
    getError: accessor => (accessor.path === "/items" ? "Wrong!" : undefined)
  });

  // we have an internal error
  expect(await state.validate()).toBeFalsy();
  // we can ignore it
  expect(await state.validate({ ignoreGetError: true })).toBeTruthy();

  // now we save, ignoring external error
  const saveResult = await state.save({ ignoreGetError: true });
  expect(saveResult).toBeTruthy();
  expect(saved).toBeTruthy();

  // but saving again without ignoreGetError will be an error
  const saveResult1 = await state.save();
  expect(saveResult1).toBeFalsy();
});

test("ignoreGetError sub form accessor non-field external", async () => {
  const N = types.model("N", {
    foo: types.string
  });
  const M = types.model("M", {
    item: N
  });

  const o = M.create({ item: { foo: "FOO" } });

  const form = new Form(M, {
    item: new SubForm({ foo: new Field(converters.string) })
  });

  let saved = false;

  async function save(data: any) {
    saved = true;
    return null;
  }

  const state = form.state(o, {
    save,
    getError: accessor => (accessor.path === "/item" ? "Wrong!" : undefined)
  });

  // we have an internal error
  expect(await state.validate()).toBeFalsy();
  // we can ignore it
  expect(await state.validate({ ignoreGetError: true })).toBeTruthy();

  // now we save, ignoring external error
  const saveResult = await state.save({ ignoreGetError: true });
  expect(saveResult).toBeTruthy();
  expect(saved).toBeTruthy();

  // but saving again without ignoreGetError will be an error
  const saveResult1 = await state.save();
  expect(saveResult1).toBeFalsy();
});
