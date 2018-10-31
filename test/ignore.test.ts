import { configure } from "mobx";
import { types } from "mobx-state-tree";
import { Field, Form, converters } from "../src";

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
  expect(field.error).toBeUndefined();
  expect(o.foo).toEqual("");
  expect(saveResult).toBeTruthy();
  expect(saved).toBeTruthy();

  // but saving again without ignoreRequired will be an error
  const saveResult1 = await state.save();
  expect(saveResult1).toBeFalsy();
  expect(field.error).toEqual("Required");
});
