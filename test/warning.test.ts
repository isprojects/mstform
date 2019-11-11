import { configure } from "mobx";
import { types, Instance } from "mobx-state-tree";
import {
  Field,
  Form,
  IFormAccessor,
  FieldAccessor,
  RepeatingForm,
  RepeatingFormAccessor,
  SubForm,
  converters
} from "../src";

// "always" leads to trouble during initialization.
configure({ enforceActions: "observed" });

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
    backend: { save: async () => null },
    getWarning: (accessor: any) =>
      accessor.path === "/foo" ? "Please reconsider" : undefined
  });
  const fooField = state.field("foo");
  const barField = state.field("bar");

  expect(fooField.raw).toEqual("FOO");
  expect(fooField.isWarningFree).toBeFalsy();
  expect(fooField.warning).toEqual("Please reconsider");
  expect(barField.raw).toEqual("BAR");
  expect(barField.isWarningFree).toBeTruthy();
  expect(barField.warning).toBeUndefined();
  expect(state.isWarningFree).toBeFalsy();

  // warnings don't make a form invalid
  const result2 = state.validate();
  expect(result2).toBeTruthy();

  const isSaved = await state.save();
  // warnings are not cleared by a save...
  expect(fooField.warning).toEqual("Please reconsider");
  // ...and don't prevent a save
  expect(isSaved).toBeTruthy();
});

test("a simple error", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string)
  });

  const o = M.create({ foo: "FOO" });

  // we need to define a process as ignoreGetError is enabled automatically
  // otherwise
  async function process(node: Instance<typeof M>, path: string) {
    return {
      updates: [],
      accessUpdates: [],
      errorValidations: [],
      warningValidations: []
    };
  }

  const state = form.state(o, {
    backend: { save: async () => null, process },
    getError: (accessor: any) =>
      accessor.path === "/foo" ? "Wrong" : undefined
  });
  const fooField = state.field("foo");

  const result2 = state.validate();
  expect(result2).toBeFalsy();

  const isSaved = await state.save();

  expect(fooField.raw).toEqual("FOO");
  expect(fooField.error).toEqual("Wrong");
  expect(state.isWarningFree).toBeTruthy();
  expect(isSaved).toBeFalsy();
});

test("client side errors trumps getError", () => {
  const M = types.model("M", {
    foo: types.string
  });

  // The validator expects "correct"
  const form = new Form(M, {
    foo: new Field(converters.string, {
      validators: [value => value !== "correct" && "Wrong"]
    })
  });

  const o = M.create({ foo: "not correct" });

  // the getErrors expects uppercase
  const state = form.state(o, {
    getError: (accessor: any) =>
      accessor instanceof FieldAccessor &&
      accessor.raw !== accessor.raw.toUpperCase()
        ? "Not uppercase"
        : undefined
  });
  const field = state.field("foo");
  // The getErrors hook already fills in the error
  expect(field.error).toEqual("Not uppercase");
  // Form validation should trump the old error
  const result1 = state.validate();
  expect(field.error).toEqual("Wrong");
  expect(result1).toBeFalsy();

  field.setRaw("correct");
  const result2 = state.validate();
  // We fix one error, the other remains
  expect(field.error).toEqual("Not uppercase");
  expect(result2).toBeFalsy();
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
    getError: (accessor: any) =>
      accessor.path === "/foo" ? "Wrong" : undefined,
    getWarning: (accessor: any) =>
      accessor.path === "/foo" ? "Please reconsider" : undefined
  });
  const fooField = state.field("foo");

  expect(fooField.raw).toEqual("FOO");
  expect(fooField.error).toEqual("Wrong");
  expect(fooField.warning).toEqual("Please reconsider");
  expect(fooField.isWarningFree).toBeFalsy();
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
    getWarning: (accessor: any) =>
      accessor.path === "/foo/1/bar" ? "Please reconsider" : undefined
  });

  const forms = state.repeatingForm("foo");
  const barField1 = forms.index(0).field("bar");
  const barField2 = forms.index(1).field("bar");

  expect(barField1.raw).toEqual("correct");
  expect(barField1.isWarningFree).toBeTruthy();
  expect(barField1.warning).toBeUndefined();
  expect(barField2.raw).toEqual("incorrect");
  expect(barField2.isWarningFree).toBeFalsy();
  expect(barField2.warning).toEqual("Please reconsider");
  expect(forms.isWarningFree).toBeFalsy();
  expect(state.isWarningFree).toBeFalsy();
});

test("warning in subform field", () => {
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
    getWarning: (accessor: any) =>
      accessor.path === "/sub/bar" ? "Please reconsider" : undefined
  });

  const fooField = state.field("foo");
  const subForm = state.subForm("sub");
  const barField = state.subForm("sub").field("bar");
  expect(fooField.raw).toEqual("FOO");
  expect(fooField.isWarningFree).toBeTruthy();
  expect(fooField.warning).toBeUndefined();
  expect(barField.raw).toEqual("BAR");
  expect(barField.isWarningFree).toBeFalsy();
  expect(barField.warning).toEqual("Please reconsider");
  expect(subForm.isWarningFree).toBeFalsy();
  expect(state.isWarningFree).toBeFalsy();
});

test("error on repeating form", () => {
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

  const o = M.create({ foo: [] });

  const state = form.state(o, {
    getError: (accessor: any) =>
      accessor instanceof RepeatingFormAccessor && accessor.length === 0
        ? "Empty"
        : undefined
  });

  const result1 = state.validate();

  const repeatingForms = state.repeatingForm("foo");

  expect(repeatingForms.error).toEqual("Empty");
  expect(state.isWarningFree).toBeTruthy();
  expect(result1).toBeFalsy();

  repeatingForms.push({ bar: "BAR" });
  const result2 = state.validate();

  expect(repeatingForms.error).toBeUndefined();
  expect(result2).toBeTruthy();
});

test("warning on repeating form", () => {
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

  const o = M.create({ foo: [] });

  const state = form.state(o, {
    getWarning: (accessor: any) => {
      if (accessor instanceof RepeatingFormAccessor) {
        expect(accessor.path).toEqual("/foo");
      }
      return accessor instanceof RepeatingFormAccessor && accessor.length === 0
        ? "Empty"
        : undefined;
    }
  });

  const repeatingForms = state.repeatingForm("foo");

  expect(repeatingForms.isWarningFree).toBeFalsy();
  expect(repeatingForms.warning).toEqual("Empty");
  expect(state.isWarningFree).toBeFalsy();

  repeatingForms.push({ bar: "BAR" });
  state.validate();

  expect(repeatingForms.isWarningFree).toBeTruthy();
  expect(repeatingForms.warning).toBeUndefined();
  expect(state.isWarningFree).toBeTruthy();
});

test("error on indexed repeating form", () => {
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
    getError: (accessor: any) =>
      accessor.path === "/foo/1" ? "Error" : undefined
  });

  const result = state.validate();

  const forms = state.repeatingForm("foo");
  const fooForm1 = forms.index(0);
  const fooForm2 = forms.index(1);

  expect(fooForm1.error).toBeUndefined();
  expect(fooForm2.error).toEqual("Error");
  expect(state.isWarningFree).toBeTruthy();
  expect(result).toBeFalsy();
});

test("warning on indexed repeating form", () => {
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
    getWarning: (accessor: any) =>
      accessor.path === "/foo/1" ? "Warning" : undefined
  });

  const forms = state.repeatingForm("foo");
  const fooForm1 = forms.index(0);
  const fooForm2 = forms.index(1);

  expect(fooForm1.isWarningFree).toBeTruthy();
  expect(fooForm1.warning).toBeUndefined();
  expect(fooForm2.isWarningFree).toBeFalsy();
  expect(fooForm2.warning).toEqual("Warning");
  expect(forms.isWarningFree).toBeFalsy();
  expect(state.isWarningFree).toBeFalsy();
});

test("error on subform", () => {
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
    getError: (accessor: any) =>
      accessor.path === "/sub" ? "Error" : undefined
  });

  const result = state.validate();

  const subForms = state.subForm("sub");

  expect(subForms.error).toEqual("Error");
  expect(state.isWarningFree).toBeTruthy();
  expect(result).toBeFalsy();
});

test("warning on subform", () => {
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
    getWarning: (accessor: any) =>
      accessor.path === "/sub" ? "Warning" : undefined
  });

  const subform = state.subForm("sub");

  expect(subform.warning).toEqual("Warning");
  expect(subform.isWarningFree).toBeFalsy();
  expect(state.isWarningFree).toBeFalsy();
});

test("error on formstate", () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string)
  });

  const o = M.create({ foo: "FOO" });

  let usedAccessor: IFormAccessor<any, any> | undefined = undefined;

  const state = form.state(o, {
    getError: (accessor: any) => {
      usedAccessor = accessor;
      return "Error";
    }
  });

  const result = state.validate();

  expect(state.error).toEqual("Error");
  expect(state.isWarningFree).toBeTruthy();
  expect(result).toBeFalsy();
  expect(usedAccessor).toBe(state);
});

test("warning on formstate", () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string)
  });

  const o = M.create({ foo: "FOO" });

  let usedAccessor: IFormAccessor<any, any> | undefined = undefined;

  const state = form.state(o, {
    getWarning: (accessor: any) => {
      usedAccessor = accessor;
      return "Warning";
    }
  });

  expect(state.warning).toEqual("Warning");
  expect(state.isWarningFree).toBeFalsy();
  expect(usedAccessor).toBe(state);
});
