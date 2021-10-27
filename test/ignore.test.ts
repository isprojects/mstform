import { configure } from "mobx";
import { types, Instance } from "mobx-state-tree";
import { Field, Form, RepeatingForm, SubForm, converters } from "../src";

configure({ enforceActions: "always" });

test("setRaw with required ignore", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string, {
      required: true,
    }),
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);
  const field = state.field("foo");

  field.setRaw("");
  expect(field.error).toEqual("Required");
  expect(field.value).toEqual("");

  field.setRaw("", { ignoreRequired: true });
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual("");
  expect(o.foo).toEqual("");
});

test("setRaw with required ignore with automatically required", () => {
  const M = types.model("M", {
    foo: types.number,
  });

  const form = new Form(M, {
    foo: new Field(converters.number),
  });

  const o = M.create({ foo: 1 });

  const state = form.state(o);
  const field = state.field("foo");

  field.setRaw("");
  expect(field.error).toEqual("Required");
  expect(field.value).toEqual(1);

  // we can set ignoreRequired, but it has no impact
  // if the field *has* to be required by definition
  field.setRaw("", { ignoreRequired: true });
  expect(field.error).toEqual("Required");
  expect(field.value).toEqual(1);
  expect(o.foo).toEqual(1);
});

test("FormState can be saved ignoring required", async () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const o = M.create({ foo: "FOO" });

  const form = new Form(M, {
    foo: new Field(converters.string, { required: true }),
  });

  let saved = false;

  async function save(data: any) {
    saved = true;
    return null;
  }

  const state = form.state(o, { backend: { save } });

  const field = state.field("foo");

  // we set the raw to the empty string even though it's required
  field.setRaw("");
  expect(field.error).toEqual("Required");
  expect(o.foo).toEqual("");

  // now we save, ignoring required
  const saveResult = await state.save({ ignoreRequired: true });
  // we expect the required message to be gone after save with ignoreRequired
  expect(field.error).toEqual(undefined);
  // saving actually succeeded
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
    foo: types.string,
  });

  const o = M.create({ foo: "FOO" });

  const form = new Form(M, {
    foo: new Field(converters.string),
  });

  let saved = false;

  async function save(data: any) {
    saved = true;
    return null;
  }

  // we need to define a process as ignoreGetError is enabled automatically
  // otherwise
  async function process(node: Instance<typeof M>, path: string) {
    return {
      updates: [],
      accessUpdates: [],
      errorValidations: [],
      warningValidations: [],
    };
  }

  const state = form.state(o, {
    backend: { save, process },
    getError: (accessor) => (accessor.path === "/foo" ? "Wrong!" : undefined),
  });

  const field = state.field("foo");

  // we change a value to trigger the error
  field.setRaw("BAR");
  expect(field.error).toEqual("Wrong!");
  // this is an external error, so change does happen
  expect(o.foo).toEqual("BAR");

  expect(field.isInternallyValid).toBeTruthy();
  // we are without internal errors
  expect(state.validate({ ignoreGetError: true })).toBeTruthy();

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
    foo: types.string,
  });

  const o = M.create({ foo: "FOO" });

  const form = new Form(M, {
    foo: new Field(converters.string),
  });

  let saved = false;

  async function save(data: any) {
    saved = true;
    return null;
  }

  // we need to define a process as ignoreGetError is enabled automatically
  // otherwise
  async function process(node: Instance<typeof M>, path: string) {
    return {
      updates: [],
      accessUpdates: [],
      errorValidations: [],
      warningValidations: [],
    };
  }

  const state = form.state(o, {
    backend: { save, process },
    getError: (accessor) => (accessor.path === "" ? "Wrong!" : undefined),
  });

  const field = state.field("foo");

  // we have an internal error
  expect(state.validate()).toBeFalsy();
  // we can ignore it
  expect(state.validate({ ignoreGetError: true })).toBeTruthy();

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
    foo: types.string,
  });
  const M = types.model("M", {
    items: types.array(N),
  });

  const o = M.create({ items: [{ foo: "FOO" }] });

  const form = new Form(M, {
    items: new RepeatingForm({ foo: new Field(converters.string) }),
  });

  let saved = false;

  async function save(data: any) {
    saved = true;
    return null;
  }

  // we need to define a process as ignoreGetError is enabled automatically
  // otherwise
  async function process(node: Instance<typeof M>, path: string) {
    return {
      updates: [],
      accessUpdates: [],
      errorValidations: [],
      warningValidations: [],
    };
  }

  const state = form.state(o, {
    backend: { save, process },
    getError: (accessor) =>
      accessor.path === "/items/0" ? "Wrong!" : undefined,
  });

  // we have an internal error
  expect(state.validate()).toBeFalsy();
  // we can ignore it
  expect(state.validate({ ignoreGetError: true })).toBeTruthy();

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
    foo: types.string,
  });
  const M = types.model("M", {
    items: types.array(N),
  });

  const o = M.create({ items: [{ foo: "FOO" }] });

  const form = new Form(M, {
    items: new RepeatingForm({ foo: new Field(converters.string) }),
  });

  let saved = false;

  async function save(data: any) {
    saved = true;
    return null;
  }
  // we need to define a process as ignoreGetError is enabled automatically
  // otherwise
  async function process(node: Instance<typeof M>, path: string) {
    return {
      updates: [],
      accessUpdates: [],
      errorValidations: [],
      warningValidations: [],
    };
  }

  const state = form.state(o, {
    backend: { save, process },
    getError: (accessor) => (accessor.path === "/items" ? "Wrong!" : undefined),
  });

  // we have an internal error
  expect(state.validate()).toBeFalsy();
  // we can ignore it
  expect(state.validate({ ignoreGetError: true })).toBeTruthy();

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
    foo: types.string,
  });
  const M = types.model("M", {
    item: N,
  });

  const o = M.create({ item: { foo: "FOO" } });

  const form = new Form(M, {
    item: new SubForm({ foo: new Field(converters.string) }),
  });

  let saved = false;

  async function save(data: any) {
    saved = true;
    return null;
  }

  // we need to define a process as ignoreGetError is enabled automatically
  // otherwise
  async function process(node: Instance<typeof M>, path: string) {
    return {
      updates: [],
      accessUpdates: [],
      errorValidations: [],
      warningValidations: [],
    };
  }

  const state = form.state(o, {
    backend: { save, process },
    getError: (accessor) => (accessor.path === "/item" ? "Wrong!" : undefined),
  });

  // we have an internal error
  expect(state.validate()).toBeFalsy();
  // we can ignore it
  expect(state.validate({ ignoreGetError: true })).toBeTruthy();

  // now we save, ignoring external error
  const saveResult = await state.save({ ignoreGetError: true });
  expect(saveResult).toBeTruthy();
  expect(saved).toBeTruthy();

  // but saving again without ignoreGetError will be an error
  const saveResult1 = await state.save();
  expect(saveResult1).toBeFalsy();
});

test("FormState can be saved without affecting save status", async () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const o = M.create({ foo: "FOO" });

  const form = new Form(M, {
    foo: new Field(converters.string),
  });

  async function save(data: any) {
    return null;
  }

  const state = form.state(o, {
    backend: { save },
    getError: (accessor) => (accessor.path === "/foo" ? "Wrong!" : undefined),
  });

  // now we save, ignoring save status
  await state.save({ ignoreSaveStatus: true });
  expect(state.saveStatus).toEqual("before");
});
