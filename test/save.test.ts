import { getSnapshot, types, Instance } from "mobx-state-tree";
import { Field, Form, converters } from "../src";

test("FormState can be saved", async () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const o = M.create({ foo: "FOO" });

  const form = new Form(M, {
    foo: new Field(converters.string, {}),
  });

  async function save(node: Instance<typeof M>) {
    if (node.foo === "") {
      return {
        errorValidations: [
          { id: "dummy", messages: [{ path: "/foo", message: "Wrong" }] },
        ],
      };
    }
    return null;
  }

  const state = form.state(o, { backend: { save } });

  const field = state.field("foo");

  // do something not allowed
  field.setRaw("");

  // we don't see any client-side validation errors
  expect(field.error).toBeUndefined();
  expect(o.foo).toEqual("");
  // now communicate with the server by doing the save
  const saveResult0 = await state.save();
  expect(saveResult0).toBe(false);
  expect(field.error).toEqual("Wrong");

  // correct things
  field.setRaw("BAR");
  expect(o.foo).toEqual("BAR");
  // editing does not wipe out external errors
  expect(field.error).toEqual("Wrong");

  const saveResult1 = await state.save();
  expect(saveResult1).toBe(true);

  expect(field.error).toBeUndefined();
});

test("save argument can be snapshotted", async () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const o = M.create({ foo: "FOO" });

  const form = new Form(M, {
    foo: new Field(converters.string, {}),
  });

  let snapshot;

  async function save(node: Instance<typeof M>) {
    snapshot = getSnapshot(node);
    return null;
  }

  const state = form.state(o, { backend: { save } });

  await state.save();

  expect(snapshot).toEqual({ foo: "FOO" });
});

test("inline save argument can be snapshotted", async () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const o = M.create({ foo: "FOO" });

  const form = new Form(M, {
    foo: new Field(converters.string, {}),
  });

  let snapshot;

  const state = form.state(o, {
    backend: {
      save: async (node) => {
        snapshot = getSnapshot(node);
        return null;
      },
    },
  });

  await state.save();

  expect(snapshot).toEqual({ foo: "FOO" });
});

test("required with save", async () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string, {
      required: true,
    }),
  });

  const o = M.create({ foo: "" });

  const state = form.state(o, { backend: { save: async () => null } });

  const field = state.field("foo");

  expect(field.raw).toEqual("");
  expect(field.error).toBeUndefined();

  await state.save();

  expect(field.error).toEqual("Required");
});

test("dynamic required with save", async () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string),
  });

  const o = M.create({ foo: "", bar: "" });

  const state = form.state(o, {
    isRequired: () => true,
    backend: { save: async () => null },
  });

  const fooField = state.field("foo");
  const barField = state.field("bar");

  expect(fooField.raw).toEqual("");
  expect(fooField.error).toBeUndefined();
  expect(barField.error).toBeUndefined();

  await state.save();

  expect(fooField.error).toEqual("Required");
  expect(barField.error).toEqual("Required");
});

test("no validation before save", async () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string, {
      validators: [(value) => value !== "correct" && "Wrong"],
    }),
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o, {
    validation: { beforeSave: "no" },
    backend: { save: async () => null },
  });

  const field = state.field("foo");

  // no validation messages before save
  expect(field.raw).toEqual("FOO");
  field.setRaw("incorrect");
  expect(field.raw).toEqual("incorrect");
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual("FOO");
  field.setRaw("correct");
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual("correct");
  field.setRaw("incorrect");
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual("correct");

  const isSaved = await state.save();
  // immediate validation after save
  expect(field.error).toEqual("Wrong");
  expect(isSaved).toBeFalsy();
  field.setRaw("correct");
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual("correct");
  field.setRaw("incorrect");
  expect(field.error).toEqual("Wrong");
});

test("no validation after save either", async () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string, {
      validators: [
        (value) => value !== "correct" && value !== "clientcorrect" && "Wrong",
      ],
    }),
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o, {
    backend: {
      save: async (node) => {
        if (node.foo !== "correct") {
          return {
            errorValidations: [
              {
                id: "dummy",
                messages: [{ path: "/foo", message: "Server wrong" }],
              },
            ],
          };
        }
        return null;
      },
    },
    validation: {
      beforeSave: "no",
      afterSave: "no",
    },
  });

  const field = state.field("foo");

  // no validation messages before save
  expect(field.raw).toEqual("FOO");
  field.setRaw("incorrect");
  expect(field.raw).toEqual("incorrect");
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual("FOO");
  field.setRaw("correct");
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual("correct");
  field.setRaw("incorrect");
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual("correct");

  let isSaved = await state.save();
  expect(state.saveStatus).toEqual("rightAfter");
  // only a single validation after save
  expect(field.error).toEqual("Wrong");
  expect(isSaved).toBeFalsy();
  // after this we don't see inline errors anymore
  field.setRaw("correct");
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual("correct");
  field.setRaw("incorrect");
  expect(field.error).toBeUndefined();

  // we save again, and this time get a server-side error
  field.setRaw("clientcorrect"); // no client-side problems
  isSaved = await state.save();
  expect(isSaved).toBeFalsy();
  expect(field.error).toEqual("Server wrong");
});

test("a form with a dynamic required field", async () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string),
  });

  const o = M.create({ foo: "FOO", bar: "BAR" });

  let touched = false;

  async function save(data: any) {
    touched = true;
    if (data.foo === "") {
      return {
        errorValidations: [
          {
            id: "dummy",
            messages: [{ path: "/foo", message: "Required by save" }],
          },
        ],
      };
    }
    return null;
  }

  const state = form.state(o, {
    isRequired: (accessor) => accessor.path.startsWith("/foo"),
    backend: { save },
  });
  const fooField = state.field("foo");
  const barField = state.field("bar");

  expect(fooField.required).toBeTruthy();
  expect(barField.required).toBeFalsy();

  // do something not allowed
  fooField.setRaw("");
  // we should see a problem immediately
  expect(fooField.error).toEqual("Required");

  // now communicate with the server by doing the save
  const saved = await state.save();
  expect(touched).toBeFalsy();
  // cannot save as we didn't validate
  expect(saved).toBe(false);
  // still same client-side validation errors
  expect(fooField.error).toEqual("Required");

  // correct things
  fooField.setRaw("BAR");
  // editing always wipes out the errors
  expect(fooField.error).toBeUndefined();

  const saved2 = await state.save();
  expect(fooField.error).toBeUndefined();
  expect(saved2).toBeTruthy();
  expect(touched).toBeTruthy();
});

test("string is trimmed and save", async () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const o = M.create({ foo: "  FOO" });

  const form = new Form(M, {
    foo: new Field(converters.string),
  });

  let saved = null;
  async function save(data: any) {
    saved = data;
    return null;
  }

  const state = form.state(o, { backend: { save } });

  const field = state.field("foo");

  await state.save();
  expect(field.value).toEqual("FOO");
  expect(saved).toEqual({ foo: "FOO" });
});

test("stringArray required save", async () => {
  const M = types.model("M", {
    stringArray: types.array(types.string),
  });

  const form = new Form(M, {
    stringArray: new Field(converters.stringArray, { required: true }),
  });

  const o = M.create({ stringArray: [] });

  const state = form.state(o, {
    isRequired: () => true,
    backend: { save: async () => null },
  });

  const stringArrayField = state.field("stringArray");

  expect(stringArrayField.raw).toEqual([]);
  expect(stringArrayField.error).toBeUndefined();

  await state.save();

  expect(stringArrayField.error).toEqual("Required");
});

test("textStringArray required save", async () => {
  const M = types.model("M", {
    textStringArray: types.array(types.string),
  });

  const form = new Form(M, {
    textStringArray: new Field(converters.textStringArray, { required: true }),
  });

  const o = M.create({ textStringArray: [""] });

  const state = form.state(o, {
    isRequired: () => true,
    backend: { save: async () => null },
  });

  const textStringArray = state.field("textStringArray");

  expect(textStringArray.raw).toEqual("");
  expect(textStringArray.error).toBeUndefined();

  await state.save();

  expect(textStringArray.error).toEqual("Required");
});
