import { configure, autorun, observable, toJS } from "mobx";
import { types, applySnapshot, onPatch, Instance } from "mobx-state-tree";
import { Field, Form, RepeatingForm, converters } from "../src";

// "always" leads to trouble during initialization.
configure({ enforceActions: "observed" });

test("a simple form", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string, {
      validators: [(value) => value !== "correct" && "Wrong"],
    }),
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.raw).toEqual("FOO");
  field.setRaw("BAR");
  expect(field.raw).toEqual("BAR");
  expect(field.error).toEqual("Wrong");
  expect(field.value).toEqual("FOO");
  field.setRaw("correct");
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual("correct");

  expect(field.node).toBe(state.node);
});

test("a simple form with array field", () => {
  const M = types.model("M", {
    foo: types.array(types.string),
  });

  const form = new Form(M, {
    foo: new Field(converters.stringArray, {
      validators: [
        (value) => (value.length !== 1 || value[0] !== "correct") && "Wrong",
      ],
    }),
  });

  const o = M.create({ foo: ["FOO"] });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.raw).toEqual(["FOO"]);
  expect(Array.isArray(field.raw)).toBeTruthy();
  field.setRaw(["BAR", "QUX"]);
  expect(field.raw).toEqual(["BAR", "QUX"]);
  expect(Array.isArray(field.raw)).toBeTruthy();
  expect(field.error).toEqual("Wrong");
  expect(field.value).toEqual(["FOO"]);
  field.setRaw(["correct"]);
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual(["correct"]);
});

test("number input", () => {
  const M = types.model("M", {
    foo: types.number,
  });

  const form = new Form(M, {
    foo: new Field(converters.number),
  });

  const o = M.create({ foo: 3 });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("3");
  field.setRaw("4");
  expect(field.raw).toEqual("4");
  expect(field.value).toEqual(4);
  expect(field.error).toBeUndefined();
  field.setRaw("not a number");
  expect(field.value).toEqual(4);
  expect(field.error).toEqual("Could not convert");
});

test("conversion failure with message", () => {
  const M = types.model("M", {
    foo: types.number,
  });

  const form = new Form(M, {
    foo: new Field(converters.number, { conversionError: "Not a number" }),
  });

  const o = M.create({ foo: 3 });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("3");
  field.setRaw("4");
  expect(field.raw).toEqual("4");
  expect(field.value).toEqual(4);
  expect(field.error).toBeUndefined();
  field.setRaw("not a number");
  expect(field.value).toEqual(4);
  expect(field.error).toEqual("Not a number");
});

test("repeating form", () => {
  const N = types.model("N", {
    bar: types.string,
  });
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
  const oneForm = forms.index(0);

  const field = oneForm.field("bar");

  expect(field.raw).toEqual("BAR");
  field.setRaw("QUX");
  expect(field.raw).toEqual("QUX");
  expect(field.value).toEqual("QUX");

  expect(field.node).toBe(o.foo[0]);
});

test("repeating form with conversion", () => {
  const N = types.model("N", {
    bar: types.number,
  });
  const M = types.model("M", {
    foo: types.array(N),
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.number),
    }),
  });

  const o = M.create({ foo: [{ bar: 3 }] });

  const state = form.state(o);

  const forms = state.repeatingForm("foo");
  const oneForm = forms.index(0);
  const field = oneForm.field("bar");

  expect(field.raw).toEqual("3");
  field.setRaw("4");
  expect(field.raw).toEqual("4");
  expect(field.value).toEqual(4);
  field.setRaw("not a number");
});

test("repeating form push", () => {
  const N = types.model("N", {
    bar: types.string,
  });
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
  expect(forms.length).toBe(1);
  forms.push({ bar: "QUX" });
  expect(forms.length).toBe(2);

  const oneForm = forms.index(1);
  const field = oneForm.field("bar");

  // in add mode
  expect(field.raw).toEqual("");

  expect(forms.index(0).field("bar").raw).toEqual("BAR");
});

test("repeating form push, with default fieldrefs", () => {
  const N = types.model("N", {
    bar: types.string,
  });
  const M = types.model("M", {
    foo: types.array(N),
  });

  let changeCount = 0;

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.string, {
        change: () => {
          changeCount++;
        },
      }),
    }),
  });

  const o = M.create({ foo: [{ bar: "BAR" }] });

  const state = form.state(o);

  const forms = state.repeatingForm("foo");
  expect(forms.length).toBe(1);
  forms.push({ bar: "QUX" }, ["bar"]);
  expect(forms.length).toBe(2);

  const oneForm = forms.index(1);
  const field = oneForm.field("bar");

  // not in add mode
  expect(field.raw).toEqual("QUX");

  expect(forms.index(0).field("bar").raw).toEqual("BAR");
  // no change events
  expect(changeCount).toBe(0);
});

test("repeating form insert", () => {
  const N = types.model("N", {
    bar: types.string,
  });
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
  expect(forms.length).toBe(1);
  forms.insert(0, { bar: "QUX" });
  expect(forms.length).toBe(2);

  const oneForm = forms.index(0);
  const field = oneForm.field("bar");

  // this thing is in add mode
  expect(field.addMode).toBeTruthy();
  expect(field.raw).toEqual("");

  field.setRaw("FLURB");
  expect(field.addMode).toBeFalsy();
  expect(field.raw).toEqual("FLURB");
  expect(field.value).toEqual("FLURB");
});

test("repeating form insert with default fieldrefs", () => {
  const N = types.model("N", {
    bar: types.string,
  });
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
  expect(forms.length).toBe(1);
  forms.insert(0, { bar: "QUX" }, ["bar"]);
  expect(forms.length).toBe(2);

  const oneForm = forms.index(0);
  const field = oneForm.field("bar");

  // bar is not in add mode
  expect(field.addMode).toBeFalsy();
  expect(field.raw).toEqual("QUX");

  field.setRaw("FLURB");
  expect(field.addMode).toBeFalsy();
  expect(field.raw).toEqual("FLURB");
  expect(field.value).toEqual("FLURB");
});

test("repeating form applySnapshot shouldn't trigger addMode", () => {
  const N = types.model("N", {
    bar: types.string,
  });
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
  expect(forms.length).toBe(1);
  const oneForm = forms.index(0);

  const field = oneForm.field("bar");
  expect(field.addMode).toBeFalsy();

  applySnapshot(o, { foo: [{ bar: "BAZ" }] });
  const oneForm2 = forms.index(0);
  const field2 = oneForm2.field("bar");
  expect(field2.addMode).toBeFalsy();
});

test("repeating form remove", () => {
  const N = types.model("N", {
    bar: types.string,
  });
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
  expect(forms.length).toBe(1);
  forms.remove(o.foo[0]);
  expect(forms.length).toBe(0);
});

test("repeating form remove and insert clears errors", () => {
  const N = types.model("N", {
    bar: types.string,
  });
  const M = types.model("M", {
    foo: types.array(N),
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.string, {
        validators: [(value) => value !== "correct" && "wrong"],
      }),
    }),
  });

  const o = M.create({ foo: [{ bar: "correct" }] });

  const state = form.state(o);

  const forms = state.repeatingForm("foo");
  const field0 = forms.index(0).field("bar");
  field0.setRaw("incorrect");
  expect(field0.error).toEqual("wrong");

  forms.remove(o.foo[0]);

  forms.push({ bar: "correct" });
  const field1 = forms.index(0).field("bar");
  expect(field1.error).toBeUndefined();
});

test("repeating form tougher remove clear raw", () => {
  const N = types.model("N", {
    bar: types.string,
  });
  const M = types.model("M", {
    foo: types.array(N),
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.string, {
        validators: [(value) => "always wrong"],
      }),
    }),
  });

  const o = M.create({ foo: [{ bar: "A" }, { bar: "B" }] });

  const state = form.state(o);

  const forms = state.repeatingForm("foo");
  const field0 = forms.index(0).field("bar");

  field0.setRaw("A*");
  const field1 = forms.index(1).field("bar");
  field1.setRaw("B*");
  forms.remove(o.foo[0]);
  const field0again = forms.index(0).field("bar");
  expect(field0again.raw).toEqual("B*");
});

test("repeating form insert should retain raw too", () => {
  const N = types.model("N", {
    bar: types.string,
  });
  const M = types.model("M", {
    foo: types.array(N),
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.string, {
        validators: [(value) => "always wrong"],
      }),
    }),
  });

  const o = M.create({ foo: [{ bar: "A" }, { bar: "B" }] });

  const state = form.state(o);

  const forms = state.repeatingForm("foo");
  const field0 = forms.index(0).field("bar");
  field0.setRaw("A*");
  const field1 = forms.index(1).field("bar");
  field1.setRaw("B*");

  forms.insert(0, N.create({ bar: "C" }));

  const field0again = forms.index(0).field("bar");
  expect(field0again.raw).toEqual("");
  expect(field0again.addMode).toBeTruthy();

  const field1again = forms.index(1).field("bar");
  const field2again = forms.index(2).field("bar");

  expect(field1again.addMode).toBeFalsy();
  expect(field1again.raw).toEqual("A*");

  expect(field2again.addMode).toBeFalsy();
  expect(field2again.raw).toEqual("B*");
});

test("repeating form nested remove", () => {
  const N = types.model("N", {
    bar: types.string,
  });
  const M = types.model("M", {
    n_entries: types.array(N),
  });
  const L = types.model("L", {
    m_entries: types.array(M),
  });

  const form = new Form(L, {
    m_entries: new RepeatingForm({
      n_entries: new RepeatingForm({
        bar: new Field(converters.string),
      }),
    }),
  });

  const o = L.create({ m_entries: [{ n_entries: [{ bar: "BAR" }] }] });

  const state = form.state(o);

  const mForms = state.repeatingForm("m_entries");
  expect(mForms.length).toBe(1);
  mForms.remove(o.m_entries[0]);
  expect(mForms.length).toBe(0);
});

test("accessors should retain index order after insert", () => {
  const N = types.model("N", {
    bar: types.string,
  });
  const M = types.model("M", {
    foo: types.array(N),
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.string),
    }),
  });

  const o = M.create({ foo: [{ bar: "A" }, { bar: "B" }] });

  const state = form.state(o);

  const forms = state.repeatingForm("foo");
  forms.insert(0, N.create({ bar: "inserted" }));
  expect(forms.accessors.map((accessor) => accessor.path)).toEqual([
    "/foo/0",
    "/foo/1",
    "/foo/2",
  ]);
});

test("repeating form validate", () => {
  const N = types.model("N", {
    bar: types.string,
  });
  const M = types.model("M", {
    foo: types.array(N),
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.string, {
        validators: [(value) => value !== "correct" && "Wrong"],
      }),
    }),
  });

  const o = M.create({ foo: [{ bar: "incorrect" }] });

  const state = form.state(o);

  const forms = state.repeatingForm("foo");
  const field = forms.index(0).field("bar");
  expect(field.raw).toEqual("incorrect");
  expect(field.error).toBeUndefined();
  const result = state.validate();
  expect(result).toBeFalsy();
  expect(field.error).toEqual("Wrong");

  field.setRaw("correct");
  expect(field.error).toBeUndefined();
  const result2 = state.validate();
  expect(result2).toBeTruthy();
});

test("repeating form multiple entries validate", () => {
  const N = types.model("N", {
    bar: types.string,
  });
  const M = types.model("M", {
    foo: types.array(N),
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.string, {
        validators: [(value) => value !== "correct" && "Wrong"],
      }),
    }),
  });

  const o = M.create({
    foo: [{ bar: "incorrect" }, { bar: "Also incorrect" }],
  });

  const state = form.state(o);

  const forms = state.repeatingForm("foo");
  const field = forms.index(0).field("bar");
  expect(field.raw).toEqual("incorrect");
  expect(field.error).toBeUndefined();
  const result = state.validate();
  expect(result).toBeFalsy();
  expect(field.error).toEqual("Wrong");

  field.setRaw("correct");
  expect(field.error).toBeUndefined();
  const result2 = state.validate();
  expect(result2).toBeFalsy();

  forms.index(1).field("bar").setRaw("correct");
  const result3 = state.validate();
  expect(result3).toBeTruthy();
});

test("not required with maybe", () => {
  const M = types.model("M", {
    foo: types.maybe(types.number),
  });

  const form = new Form(M, {
    foo: new Field(converters.maybe(converters.number), {
      required: false,
    }),
  });

  const o = M.create({ foo: undefined });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("");
  expect(field.value).toBeUndefined();
  field.setRaw("3");
  expect(field.raw).toEqual("3");
  expect(field.value).toEqual(3);
  field.setRaw("");
  expect(field.error).toBeUndefined();
  expect(field.value).toBeUndefined();
});

test("not required with maybeNull", () => {
  const M = types.model("M", {
    foo: types.maybeNull(types.number),
  });

  const form = new Form(M, {
    foo: new Field(converters.maybeNull(converters.number), {
      required: false,
    }),
  });

  const o = M.create({ foo: null });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("");
  expect(field.value).toBeNull();
  field.setRaw("3");
  expect(field.raw).toEqual("3");
  expect(field.value).toEqual(3);
  field.setRaw("");
  expect(field.error).toBeUndefined();
  expect(field.value).toBeNull();
});

test("required", () => {
  const M = types.model("M", {
    foo: types.number,
  });

  const form = new Form(M, {
    foo: new Field(converters.number, {
      required: true,
    }),
  });

  const o = M.create({ foo: 3 });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("3");
  expect(field.value).toEqual(3);
  field.setRaw("");
  expect(field.error).toEqual("Required");
  expect(field.value).toEqual(3);
});

test("required with requiredError", () => {
  const M = types.model("M", {
    foo: types.number,
  });

  const form = new Form(M, {
    foo: new Field(converters.number, {
      required: true,
    }),
  });

  const o = M.create({ foo: 3 });

  const state = form.state(o, { requiredError: "Verplicht" });

  const field = state.field("foo");

  expect(field.raw).toEqual("3");
  expect(field.value).toEqual(3);
  field.setRaw("");
  expect(field.error).toEqual("Verplicht");
  expect(field.value).toEqual(3);
});

test("required with context in requiredError", () => {
  const M = types.model("M", {
    foo: types.number,
  });

  const form = new Form(M, {
    foo: new Field(converters.number, {
      required: true,
    }),
  });

  const o = M.create({ foo: 3 });

  const state = form.state(o, {
    context: "!",
    requiredError: (context) => "Verplicht" + context,
  });

  const field = state.field("foo");

  expect(field.raw).toEqual("3");
  expect(field.value).toEqual(3);
  field.setRaw("");
  expect(field.error).toEqual("Verplicht!");
  expect(field.value).toEqual(3);
});

test("required with requiredError on state and on field", () => {
  const M = types.model("M", {
    foo: types.number,
  });

  const form = new Form(M, {
    foo: new Field(converters.number, {
      required: true,
      requiredError: "This is required",
    }),
  });

  const o = M.create({ foo: 3 });

  const state = form.state(o, {
    context: "!",
    requiredError: "This is not required",
  });

  const field = state.field("foo");

  expect(field.raw).toEqual("3");
  expect(field.value).toEqual(3);
  field.setRaw("");
  expect(field.error).toEqual("This is required");
  expect(field.value).toEqual(3);
});

test("required for number is implied", () => {
  const M = types.model("M", {
    foo: types.number,
  });

  const form = new Form(M, {
    foo: new Field(converters.number, {}),
  });

  const o = M.create({ foo: 3 });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("3");
  expect(field.value).toEqual(3);
  field.setRaw("");
  expect(field.error).toEqual("Required");
  expect(field.value).toEqual(3);
});

test("required with string", () => {
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

  expect(field.value).toEqual("FOO");

  field.setRaw("");
  expect(field.error).toEqual("Required");
  expect(field.value).toEqual("");
});

test("required with string and whitespace", () => {
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

  field.setRaw("   ");
  expect(field.error).toEqual("Required");
});

test("required with number and whitespace", () => {
  const M = types.model("M", {
    foo: types.number,
  });

  const form = new Form(M, {
    foo: new Field(converters.number, {
      required: true,
    }),
  });

  const o = M.create({ foo: 3 });

  const state = form.state(o);

  const field = state.field("foo");

  field.setRaw("  ");
  expect(field.error).toEqual("Required");
});

test("required with boolean has no effect", () => {
  const M = types.model("M", {
    foo: types.boolean,
  });

  const form = new Form(M, {
    foo: new Field(converters.boolean, {
      required: true,
    }),
  });

  const o = M.create({ foo: false });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.required).toBeFalsy();
  field.setRaw(false);
  expect(field.error).toBeUndefined();
});

test("required with maybe", () => {
  const M = types.model("M", {
    foo: types.maybe(types.number),
  });

  const form = new Form(M, {
    foo: new Field(converters.maybe(converters.number), {
      required: true,
    }),
  });

  const o = M.create({ foo: undefined });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("");
  expect(field.value).toBeUndefined();
  field.setRaw("3");
  expect(field.raw).toEqual("3");
  expect(field.value).toEqual(3);
  field.setRaw("");
  expect(field.error).toEqual("Required");
  expect(field.value).toBeUndefined();
});

test("required with maybeNull", () => {
  const M = types.model("M", {
    foo: types.maybeNull(types.number),
  });

  const form = new Form(M, {
    foo: new Field(converters.maybeNull(converters.number), {
      required: true,
    }),
  });

  const o = M.create({ foo: null });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("");
  expect(field.value).toBeNull();
  field.setRaw("3");
  expect(field.raw).toEqual("3");
  expect(field.value).toEqual(3);
  field.setRaw("");
  expect(field.error).toEqual("Required");
  expect(field.value).toBeNull();
});

test("setting value on model will update form", () => {
  const M = types
    .model("M", {
      foo: types.string,
    })
    .actions((self) => ({
      update(value: string) {
        self.foo = value;
      },
    }));

  const form = new Form(M, {
    foo: new Field(converters.string),
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("FOO");
  o.update("BAR");
  expect(field.raw).toEqual("BAR");

  // the raw is also immediately updated
  field.setRaw("QUX");
  o.update("BACK");
  expect(field.raw).toEqual("BACK");
});

test("model converter", () => {
  const R = types.model("R", {
    id: types.identifier,
    bar: types.string,
  });

  const M = types.model("M", {
    foo: types.reference(R),
  });

  const Root = types.model("Root", {
    entries: types.array(R),
    instance: M,
  });

  const root = Root.create({
    entries: [
      { id: "1", bar: "correct" },
      { id: "2", bar: "incorrect" },
    ],
    instance: { foo: "1" },
  });

  const form = new Form(M, {
    foo: new Field(converters.model(R), {
      validators: [(value) => value.bar !== "correct" && "Wrong"],
    }),
  });

  const r1 = root.entries[0];
  const r2 = root.entries[1];

  const o = root.instance;

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.raw).toEqual(r1);
  field.setRaw(r2);
  expect(field.raw).toEqual(r2);
  expect(field.error).toEqual("Wrong");
  expect(field.value).toEqual(r1);
  field.setRaw(r1);
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual(r1);

  // required is implied
  field.setRaw(null);
  expect(field.error).toEqual("Required");
});

test("model converter with validate does not throw", () => {
  const R = types.model("R", {
    id: types.identifier,
    bar: types.string,
  });

  const M = types.model("M", {
    foo: types.reference(R),
  });

  const Root = types.model("Root", {
    entries: types.array(R),
    instance: M,
  });

  const root = Root.create({
    entries: [
      { id: "1", bar: "correct" },
      { id: "2", bar: "incorrect" },
    ],
    instance: { foo: "1" },
  });

  const form = new Form(M, {
    foo: new Field(converters.model(R)),
  });

  const r2 = root.entries[1];

  const o = root.instance;

  const state = form.state(o);
  const field = state.field("foo");

  field.setRaw(r2);
  expect(field.value).toBe(r2);
  state.validate();
});

test("model converter maybe", () => {
  const R = types.model("R", {
    id: types.identifier,
    bar: types.string,
  });

  const M = types.model("M", {
    foo: types.maybe(types.reference(R)),
  });

  const Root = types.model("Root", {
    entries: types.array(R),
    instance: M,
  });

  const root = Root.create({
    entries: [
      { id: "1", bar: "correct" },
      { id: "2", bar: "incorrect" },
    ],
    instance: { foo: "1" },
  });

  const form = new Form(M, {
    foo: new Field(converters.maybe(converters.model(R)), {
      validators: [
        (value) => {
          if (value == null) {
            return false;
          }
          return value.bar !== "correct" && "Wrong";
        },
      ],
    }),
  });

  const r1 = root.entries[0];
  const r2 = root.entries[1];

  const o = root.instance;

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.raw).toEqual(r1);
  field.setRaw(r2);
  expect(field.raw).toEqual(r2);
  expect(field.error).toEqual("Wrong");
  expect(field.value).toEqual(r1);
  field.setRaw(r1);
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual(r1);
  field.setRaw(null);
  expect(field.error).toBeUndefined();
  expect(field.value).toBeUndefined();
});

test("model converter maybeNull", () => {
  const R = types.model("R", {
    id: types.identifier,
    bar: types.string,
  });

  const M = types.model("M", {
    foo: types.maybeNull(types.reference(R)),
  });

  const Root = types.model("Root", {
    entries: types.array(R),
    instance: M,
  });

  const root = Root.create({
    entries: [
      { id: "1", bar: "correct" },
      { id: "2", bar: "incorrect" },
    ],
    instance: { foo: "1" },
  });

  const form = new Form(M, {
    foo: new Field(converters.maybeNull(converters.model(R)), {
      validators: [
        (value) => {
          if (value == null) {
            return false;
          }
          return value.bar !== "correct" && "Wrong";
        },
      ],
    }),
  });

  const r1 = root.entries[0];
  const r2 = root.entries[1];

  const o = root.instance;

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.raw).toEqual(r1);
  field.setRaw(r2);
  expect(field.raw).toEqual(r2);
  expect(field.error).toEqual("Wrong");
  expect(field.value).toEqual(r1);
  field.setRaw(r1);
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual(r1);
  field.setRaw(null);
  expect(field.error).toBeUndefined();
  expect(field.value).toBeNull();
});

test("add mode for flat form, string", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
  });

  const o = M.create({ foo: "" });

  const state = form.state(o, { addMode: true });
  const field = state.field("foo");

  expect(field.addMode).toBeTruthy();
  expect(() => field.value).toThrow();
  expect(field.raw).toEqual("");
  field.setRaw("FOO");
  expect(field.addMode).toBeFalsy();
  expect(field.value).toEqual("FOO");
  expect(field.raw).toEqual("FOO");
});

test("add mode for flat form, string and required", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string, { required: true }),
  });

  const o = M.create({ foo: "" });

  const state = form.state(o, { addMode: true });
  const field = state.field("foo");

  expect(field.addMode).toBeTruthy();
  expect(() => field.value).toThrow();
  expect(field.raw).toEqual("");
  expect(field.setRaw(""));
  expect(field.error).toEqual("Required");
  field.setRaw("FOO");
  expect(field.addMode).toBeFalsy();
  expect(field.value).toEqual("FOO");
  expect(field.raw).toEqual("FOO");
});

test("add mode for flat form, maybe string", () => {
  const M = types.model("M", {
    foo: types.maybe(types.string),
  });

  const form = new Form(M, {
    foo: new Field(converters.maybe(converters.string)),
  });

  const o = M.create({ foo: undefined });

  const state = form.state(o, { addMode: true });
  const field = state.field("foo");

  expect(() => field.value).toThrow();
  expect(field.addMode).toBeTruthy();
  expect(field.raw).toEqual("");
  field.setRaw("FOO");
  expect(field.value).toEqual("FOO");
  expect(field.raw).toEqual("FOO");
  expect(field.addMode).toBeFalsy();
  field.setRaw("");
  expect(field.value).toBeUndefined();
  expect(field.addMode).toBeFalsy();
});

test("add mode for flat form, maybeNull string", () => {
  const M = types.model("M", {
    foo: types.maybeNull(types.string),
  });

  const form = new Form(M, {
    foo: new Field(converters.maybeNull(converters.string)),
  });

  const o = M.create({ foo: null });

  const state = form.state(o, { addMode: true });
  const field = state.field("foo");

  expect(() => field.value).toThrow();
  expect(field.addMode).toBeTruthy();
  expect(field.raw).toEqual("");
  field.setRaw("FOO");
  expect(field.value).toEqual("FOO");
  expect(field.raw).toEqual("FOO");
  expect(field.addMode).toBeFalsy();
  field.setRaw("");
  expect(field.value).toEqual(null);
  expect(field.addMode).toBeFalsy();
});

test("add mode for flat form, number", () => {
  const M = types.model("M", {
    foo: types.number,
  });

  const form = new Form(M, {
    foo: new Field(converters.number),
  });

  const o = M.create({ foo: 0 });

  const state = form.state(o, { addMode: true });
  const field = state.field("foo");

  expect(() => field.value).toThrow();
  expect(field.addMode).toBeTruthy();
  expect(field.raw).toEqual("");
  field.setRaw("3");
  expect(field.value).toEqual(3);
  expect(field.raw).toEqual("3");
  expect(field.addMode).toBeFalsy();
});

test("add mode for flat form, maybeNull number", () => {
  const M = types.model("M", {
    foo: types.maybeNull(types.number),
  });

  const form = new Form(M, {
    foo: new Field(converters.maybeNull(converters.number)),
  });

  const o = M.create({ foo: null });

  const state = form.state(o, { addMode: true });
  const field = state.field("foo");

  expect(field.addMode).toBeTruthy();
  expect(() => field.value).toThrow();
  expect(field.raw).toEqual("");
  field.setRaw("");
  expect(field.value).toEqual(null);
  expect(field.addMode).toBeFalsy();
  field.setRaw("3");
  expect(field.value).toEqual(3);
  expect(field.raw).toEqual("3");
  expect(field.addMode).toBeFalsy();
});

test("add mode for flat form, number, defaults", () => {
  const M = types.model("M", {
    foo: types.number,
  });

  const form = new Form(M, {
    foo: new Field(converters.number),
  });

  const o = M.create({ foo: 0 });

  const state = form.state(o, { addMode: true, addModeDefaults: ["foo"] });
  const field = state.field("foo");

  expect(field.value).toBe(0);
  expect(field.addMode).toBeFalsy();
  expect(field.raw).toEqual("0");
  field.setRaw("3");
  expect(field.value).toEqual(3);
  expect(field.raw).toEqual("3");
  expect(field.addMode).toBeFalsy();
});

test("model converter in add mode", () => {
  const R = types.model("R", {
    id: types.identifier,
    bar: types.string,
  });

  const M = types.model("M", {
    foo: types.reference(R),
  });

  const Root = types.model("Root", {
    entries: types.array(R),
    instance: M,
  });

  const root = Root.create({
    entries: [
      { id: "1", bar: "correct" },
      { id: "2", bar: "incorrect" },
    ],
    instance: { foo: "1" },
  });

  const form = new Form(M, {
    foo: new Field(converters.model(R), {
      required: true,
      validators: [(value) => value.bar !== "correct" && "Wrong"],
    }),
  });

  const r1 = root.entries[0];
  const r2 = root.entries[1];

  const o = root.instance;

  const state = form.state(o, { addMode: true });
  const field = state.field("foo");

  expect(field.addMode).toBeTruthy();
  expect(field.raw).toEqual(null);
  field.setRaw(r2);
  expect(field.raw).toEqual(r2);
  expect(field.error).toEqual("Wrong");
  expect(field.value).toBe(r1);
  expect(field.addMode).toBeFalsy();
  field.setRaw(r1);
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual(r1);
  expect(field.addMode).toBeFalsy();

  field.setRaw(null);
  expect(field.error).toEqual("Required");
});

test("add mode for repeating push", () => {
  const N = types.model("N", {
    bar: types.number,
  });

  const M = types.model("M", {
    foo: types.array(N),
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.number),
    }),
  });

  const o = M.create({ foo: [{ bar: 0 }] });

  const state = form.state(o);
  const repeating = state.repeatingForm("foo");
  repeating.push({ bar: 1 });
  const field0 = repeating.index(0).field("bar");
  expect(field0.addMode).toBeFalsy();
  expect(field0.raw).toEqual("0");

  const field1 = repeating.index(1).field("bar");
  expect(field1.addMode).toBeTruthy();
  expect(field1.raw).toEqual("");
  expect(() => field1.value).toThrow();
  field1.setRaw("3");
  expect(field1.value).toEqual(3);
  expect(field1.raw).toEqual("3");
  expect(field1.addMode).toBeFalsy();
});

test("add mode for repeating push, whole form add mode", () => {
  const N = types.model("N", {
    bar: types.number,
  });

  const M = types.model("M", {
    foo: types.array(N),
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.number),
    }),
  });

  const o = M.create({ foo: [{ bar: 0 }] });

  const state = form.state(o, { addMode: true });
  const repeating = state.repeatingForm("foo");
  repeating.push({ bar: 1 });
  const field0 = repeating.index(0).field("bar");
  expect(field0.addMode).toBeTruthy();
  expect(field0.raw).toEqual("");

  const field1 = repeating.index(1).field("bar");
  expect(field1.addMode).toBeTruthy();
  expect(field1.raw).toEqual("");
  expect(() => field1.value).toThrow();
  field1.setRaw("3");
  expect(field1.value).toEqual(3);
  expect(field1.raw).toEqual("3");
  expect(field1.addMode).toBeFalsy();
});

test("add mode for repeating insert", () => {
  const N = types.model("N", {
    bar: types.number,
  });

  const M = types.model("M", {
    foo: types.array(N),
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.number),
    }),
  });

  const o = M.create({ foo: [{ bar: 0 }] });

  const state = form.state(o);
  const repeating = state.repeatingForm("foo");
  repeating.insert(0, { bar: 1 });
  const field0 = repeating.index(0).field("bar");
  expect(field0.addMode).toBeTruthy();
  expect(field0.raw).toEqual("");
  expect(() => field0.value).toThrow();

  const field1 = repeating.index(1).field("bar");
  expect(field1.addMode).toBeFalsy();

  field0.setRaw("3");
  expect(field0.value).toEqual(3);
  expect(field0.raw).toEqual("3");
  expect(field0.addMode).toBeFalsy();
});

test("add mode validate", () => {
  const M = types.model("M", {
    foo: types.number,
  });

  const form = new Form(M, {
    foo: new Field(converters.number),
  });

  const o = M.create({ foo: 0 });

  const state = form.state(o, { addMode: true });

  const v = state.validate();
  expect(v).toBeFalsy();

  const field = state.field("foo");
  expect(field.raw).toBe("");
  expect(field.error).toBe("Required");
});

test("a form with a disabled field", () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string),
  });

  const o = M.create({ foo: "FOO", bar: "BAR" });

  const state = form.state(o, {
    isDisabled: (accessor) => accessor.path.startsWith("/foo"),
  });
  const fooField = state.field("foo");
  const barField = state.field("bar");

  expect(fooField.disabled).toBeTruthy();
  expect(fooField.enabled).toBeFalsy();
  expect(barField.disabled).toBeFalsy();
  expect(barField.enabled).toBeTruthy();
});

test("test enabled property interactions on form", () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string,
    zulu: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string),
    zulu: new Field(converters.string),
  });

  const o = M.create({ foo: "FOO", bar: "BAR", zulu: "zulu" });

  const state = form.state(o, {
    isDisabled: (accessor) =>
      accessor.path.startsWith("/foo") || accessor.path.startsWith("/bar"),
    isReadOnly: (accessor) =>
      accessor.path.startsWith("/foo") || accessor.path.startsWith("/bar"),
    isHidden: (accessor) =>
      accessor.path.startsWith("/foo") || accessor.path.startsWith("/bar"),
    isEnabled: (accessor) => accessor.path.startsWith("/foo"),
  });
  const fooField = state.field("foo");
  const barField = state.field("bar");
  const zuluField = state.field("zulu");

  expect(fooField.disabled).toBeTruthy();
  expect(fooField.enabled).toBeTruthy();

  expect(barField.disabled).toBeTruthy();
  expect(barField.hidden).toBeTruthy();
  expect(barField.readOnly).toBeTruthy();
  expect(barField.enabled).toBeFalsy();

  expect(zuluField.disabled).toBeFalsy();
  expect(zuluField.hidden).toBeFalsy();
  expect(zuluField.readOnly).toBeFalsy();
  expect(zuluField.enabled).toBeTruthy();
});

test("a form with a repeating disabled field", () => {
  const N = types.model("N", {
    bar: types.string,
  });
  const M = types.model("M", {
    foo: types.array(N),
  });

  const form = new Form(M, {
    foo: new RepeatingForm({ bar: new Field(converters.string) }),
  });

  const o = M.create({ foo: [{ bar: "BAR" }] });

  const state = form.state(o, {
    isDisabled: (accessor) => accessor.path === "/foo",
  });
  const repeating = state.repeatingForm("foo");

  expect(repeating.disabled).toBeTruthy();
  expect(repeating.index(0).field("bar").disabled).toBeTruthy();
  expect(repeating.index(0).field("bar").enabled).toBeFalsy();
});

test("a form with a hidden field", () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string),
  });

  const o = M.create({ foo: "FOO", bar: "BAR" });

  const state = form.state(o, {
    isHidden: (accessor) => accessor.path.startsWith("/foo"),
  });
  const fooField = state.field("foo");
  const barField = state.field("bar");

  expect(fooField.hidden).toBeTruthy();
  expect(barField.hidden).toBeFalsy();
});

test("a form with a dynamic required that touches value", () => {
  // there was a very weird bug:
  // the value of foo stays empty even though we update the raw
  // this is triggered by a combination of three things:
  // * isRequired touches acccessor.value
  // * accessor.required is touched
  // * this happens *within an autorun*

  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
  });

  const o = M.create({ foo: "" });

  const state = form.state(o, {
    isRequired: (accessor) => {
      // all we do is touch accessor.value
      const touched = accessor.value;
      return false;
    },
  });
  const fooField = state.field("foo");
  const disposer = autorun(() => {
    const required = fooField.required;
  });
  fooField.setRaw("BLAH");

  expect(fooField.value).toEqual("BLAH");
  expect(o.foo).toEqual("BLAH");

  disposer();
});

test("a hard required trumps dynamic required", () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string, { required: true }),
  });

  const o = M.create({ foo: "FOO", bar: "BAR" });

  let touched = false;

  const state = form.state(o, {
    isRequired: (accessor) => accessor.path.startsWith("/foo"),
  });
  const fooField = state.field("foo");
  const barField = state.field("bar");

  expect(fooField.required).toBeTruthy();
  expect(barField.required).toBeTruthy();
});

test("a form with a readOnly field", () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string),
  });

  const o = M.create({ foo: "FOO", bar: "BAR" });

  const state = form.state(o, {
    isReadOnly: (accessor) => accessor.path.startsWith("/foo"),
  });
  const fooField = state.field("foo");
  const barField = state.field("bar");

  expect(fooField.readOnly).toBeTruthy();
  expect(fooField.inputProps.readOnly).toBeTruthy();
  expect(fooField.enabled).toBeFalsy();

  expect(barField.readOnly).toBeFalsy();
  expect(barField.inputProps.readOnly).toBeUndefined();
  expect(barField.enabled).toBeTruthy();
});

test("extra validation", () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string),
  });

  const o = M.create({ foo: "FOO", bar: "BAR" });

  const state = form.state(o, {
    extraValidation: (accessor, value) => {
      if (accessor.path === "/foo") {
        return value === "Wrong" ? "Wrong!" : false;
      }
      return false;
    },
  });
  const fooField = state.field("foo");
  const barField = state.field("bar");

  fooField.setRaw("Wrong");
  expect(fooField.error).toEqual("Wrong!");
  barField.setRaw("Wrong");
  expect(barField.error).toBeUndefined();
});

test("boolean converter", () => {
  const N = types.model("N", {
    bar: types.boolean,
  });
  const M = types.model("M", {
    foo: types.array(N),
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.boolean),
    }),
  });

  const o = M.create({ foo: [] });

  const state = form.state(o);
  const forms = state.repeatingForm("foo");
  forms.push({ bar: false });
  expect(forms.length).toBe(1);
  const field = forms.index(0).field("bar");
  expect(field.raw).toEqual(false);
});

test("converter and raw update", () => {
  // we update the raw when the value is set
  // a converter may not be exactly preserving all input,
  // for instance the number converter turns the string 0.20
  // into 0.2. this would mean that when you type 0.20 it
  // could immediately update the raw to 0.2, which isn't desired
  const M = types.model("M", {
    foo: types.number,
  });

  const form = new Form(M, {
    foo: new Field(converters.number),
  });

  const o = M.create({ foo: 0 });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.raw).toEqual("0");
  field.setRaw("0.20");
  // the value is retained, even though render would result in 0.2
  expect(field.raw).toEqual("0.20");
  expect(field.value).toEqual(0.2);
});

test("raw update and errors", () => {
  // could immediately update the raw to 0.2, which isn't desired
  const M = types
    .model("M", {
      foo: types.number,
    })
    .actions((self) => ({
      update(value: number) {
        self.foo = value;
      },
    }));

  const form = new Form(M, {
    foo: new Field(converters.number, {
      validators: [(value) => (value > 10 ? "Wrong" : false)],
    }),
  });

  const o = M.create({ foo: 0 });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.raw).toEqual("0");
  field.setRaw("20");
  expect(field.error).toEqual("Wrong");

  o.update(5);

  expect(field.raw).toEqual("5");
  expect(field.error).toBeUndefined();

  o.update(21);

  expect(field.raw).toEqual("21");
  expect(field.error).toEqual("Wrong");
});

test("raw update and references", () => {
  const N = types.model("N", { id: types.identifier, bar: types.number });

  const M = types
    .model("M", {
      foo: types.maybeNull(types.reference(N)),
    })
    .actions((self) => ({
      update(value: Instance<typeof N>) {
        self.foo = value;
      },
    }));

  const Root = types.model({
    rs: types.array(N),
    m: M,
  });

  const form = new Form(M, {
    foo: new Field(converters.object),
  });

  const r = Root.create({
    rs: [
      { id: "a", bar: 1 },
      { id: "b", bar: 2 },
    ],
    m: { foo: null },
  });
  r.m.update(r.rs[0]);

  const state = form.state(r.m);
  const field = state.field("foo");

  expect(field.raw).toEqual(r.rs[0]);
  r.m.update(r.rs[1]);

  expect(field.raw).toEqual(r.rs[1]);
});

test("raw update and add form", () => {
  // could immediately update the raw to 0.2, which isn't desired
  const M = types
    .model("M", {
      foo: types.number,
    })
    .actions((self) => ({
      update(value: number) {
        self.foo = value;
      },
    }));

  const form = new Form(M, {
    foo: new Field(converters.number),
  });

  const o = M.create({ foo: 0 });

  const state = form.state(o, { addMode: true });
  const field = state.field("foo");

  expect(field.raw).toEqual("");

  // updating a value to the same value shouldn't have an effect
  // on raw
  o.update(0);

  expect(field.addMode).toBeTruthy();
  expect(field.raw).toEqual("");

  // updating the value to a different value will have effect on raw
  o.update(1);
  expect(field.addMode).toBeFalsy();
  expect(field.raw).toEqual("1");

  // we can change raw directly
  field.setRaw("20");
  expect(field.raw).toEqual("20");
  expect(field.addMode).toBeFalsy();

  // even while in add mode, an update to the raw should be an update`
  o.update(21);

  expect(field.raw).toEqual("21");
});

test("raw update and limited amount of patches", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
  });

  const o = M.create({ foo: "first" });
  const state = form.state(o);
  const field = state.field("foo");

  const patches: any = [];
  onPatch(o, (patch) => {
    patches.push(patch);
  });

  applySnapshot(o, { foo: "second" });

  expect(patches).toEqual([
    {
      op: "replace",
      path: "/foo",
      value: "second",
    },
  ]);

  applySnapshot(o, { foo: "second" });

  // no patch detected as no value changed
  expect(patches).toEqual([
    {
      op: "replace",
      path: "/foo",
      value: "second",
    },
  ]);
});

test("raw update and multiple accessors", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
  });

  const o = M.create({ foo: "first" });
  const state = form.state(o);
  const field = state.field("foo");
  const field2 = state.field("foo");

  const patches: any = [];
  onPatch(o, (patch) => {
    patches.push(patch);
  });

  applySnapshot(o, { foo: "second" });

  expect(patches).toEqual([
    {
      op: "replace",
      path: "/foo",
      value: "second",
    },
  ]);

  applySnapshot(o, { foo: "second" });

  // no patch detected as no value changed
  expect(patches).toEqual([
    {
      op: "replace",
      path: "/foo",
      value: "second",
    },
  ]);
});

test("focus hook", () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string),
  });

  const o = M.create({ foo: "FOO", bar: "BAR" });

  const focused: any[] = [];

  const state = form.state(o, {
    focus: (ev, accessor) => {
      focused.push({
        raw: accessor.raw,
        value: accessor.value,
        name: accessor.name,
      });
    },
  });

  const fooField = state.field("foo");
  expect(fooField.inputProps.onFocus).toBeDefined();

  fooField.handleFocus(null);

  const barField = state.field("bar");
  barField.handleFocus(null);

  expect(focused).toEqual([
    { name: "foo", raw: "FOO", value: "FOO" },
    { name: "bar", raw: "BAR", value: "BAR" },
  ]);

  // no focus hook
  const state2 = form.state(o);
  const fooField2 = state2.field("foo");
  expect(fooField2.inputProps.onFocus).toBeUndefined();
});

test("blur hook", () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string),
  });

  const o = M.create({ foo: "FOO", bar: "BAR" });

  const blurred: any[] = [];

  const state = form.state(o, {
    blur: (ev, accessor) => {
      blurred.push({
        raw: accessor.raw,
        value: accessor.value,
        name: accessor.name,
      });
    },
  });

  const fooField = state.field("foo");
  expect(fooField.inputProps.onBlur).toBeDefined();

  fooField.handleBlur(null);

  const barField = state.field("bar");
  barField.handleBlur(null);

  expect(blurred).toEqual([
    { name: "foo", raw: "FOO", value: "FOO" },
    { name: "bar", raw: "BAR", value: "BAR" },
  ]);

  // no blur hook
  const state2 = form.state(o);
  const fooField2 = state2.field("foo");
  expect(fooField2.inputProps.onBlur).toBeUndefined();
});

test("update hook", () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string),
  });

  const o = M.create({ foo: "FOO", bar: "BAR" });

  const updated: any[] = [];

  const state = form.state(o, {
    update: (accessor) => {
      updated.push({
        raw: accessor.raw,
        value: accessor.value,
        name: accessor.name,
      });
    },
  });

  const fooField = state.field("foo");
  const barField = state.field("bar");
  fooField.setRaw("FOO!");
  barField.setRaw("BAR!");

  expect(updated).toEqual([
    { name: "foo", raw: "FOO!", value: "FOO!" },
    { name: "bar", raw: "BAR!", value: "BAR!" },
  ]);
});

test("string is trimmed", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
  });

  const o = M.create({ foo: "  FOO" });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.raw).toEqual("  FOO");
  field.setRaw("  FOO");
  expect(field.value).toEqual("FOO");

  field.setRaw("BAR  ");
  expect(field.raw).toEqual("BAR  ");
  expect(field.value).toEqual("BAR");
  field.setRaw("  BAR");
  expect(field.value).toEqual("BAR");
});

test("form with thousandSeparator . and empty decimalSeparator invalid", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const o = M.create({ foo: "3000" });

  const form = new Form(M, {
    foo: new Field(converters.stringDecimal()),
  });

  expect(() => {
    form.state(o, {
      converterOptions: { thousandSeparator: "." },
    });
  }).toThrow();
});

test("form with thousandSeparator and decimalSeparator same value invalid", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const o = M.create({ foo: "3000" });

  const form = new Form(M, {
    foo: new Field(converters.stringDecimal()),
  });

  expect(() => {
    form.state(o, {
      converterOptions: {
        thousandSeparator: ",",
        decimalSeparator: ",",
      },
    });
  }).toThrow();
});

test("blur hook with postprocess", () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string,
  });

  const form = new Form(M, {
    foo: new Field(
      converters.stringDecimal({ decimalPlaces: 2, addZeroes: true }),
      {
        postprocess: true,
      }
    ),
    bar: new Field(converters.string),
  });

  const o = M.create({ foo: "4314314", bar: "BAR" });

  const state = form.state(o, {
    converterOptions: {
      thousandSeparator: ".",
      decimalSeparator: ",",
      renderThousands: true,
    },
  });

  const fooField = state.field("foo");
  expect(fooField.inputProps.onBlur).toBeDefined();
  fooField.setRaw("4314314");
  fooField.handleBlur(null);
  expect(fooField.raw).toEqual("4.314.314,00");

  const barField = state.field("bar");
  expect(barField.inputProps.onBlur).toBeUndefined();
});

test("blur hook no postprocess with error", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(
      converters.stringDecimal({ decimalPlaces: 2, addZeroes: true }),
      {
        postprocess: true,
      }
    ),
  });

  const o = M.create({ foo: "4314314" });

  const state = form.state(o, {
    converterOptions: {
      thousandSeparator: ".",
      decimalSeparator: ",",
      renderThousands: true,
    },
  });

  const fooField = state.field("foo");
  expect(fooField.inputProps.onBlur).toBeDefined();
  fooField.setRaw("4314314,0000");
  fooField.handleBlur(null);
  expect(fooField.raw).toEqual("4314314,0000");
});

test("blur hook with postprocess maybe field", () => {
  const M = types.model("M", {
    foo: types.maybeNull(types.string),
  });

  const form = new Form(M, {
    foo: new Field(
      converters.maybeNull(
        converters.stringDecimal({ decimalPlaces: 2, addZeroes: true })
      ),
      {
        postprocess: true,
      }
    ),
  });

  const o = M.create({ foo: "4314314" });

  const state = form.state(o, {
    converterOptions: {
      thousandSeparator: ".",
      decimalSeparator: ",",
      renderThousands: true,
    },
  });

  const fooField = state.field("foo");
  expect(fooField.inputProps.onBlur).toBeDefined();
  fooField.setRaw("4314314");
  fooField.handleBlur(null);
  expect(fooField.raw).toEqual("4.314.314,00");
});

test("setValueAndUpdateRaw", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const o = M.create({ foo: "" });

  const form = new Form(M, {
    foo: new Field(converters.stringDecimal()),
  });

  const state = form.state(o, {
    converterOptions: {
      thousandSeparator: ".",
      decimalSeparator: ",",
      renderThousands: true,
    },
  });

  // Setting the raw directly would update the value without relying on other event handlers
  const field = state.field("foo");

  field.setRaw("1234,56");
  expect(field.raw).toEqual("1234,56");
  expect(field.value).toEqual("1234.56");

  // Instead, we set the value and update the raw based on the value
  field.setValueAndUpdateRaw("6543.21");
  expect(field.raw).toEqual("6.543,21");
  expect(field.value).toEqual("6543.21");
});

test("repeatingField disabled when repeatingForm disabled", () => {
  const N = types.model("N", {
    repeatingField: types.string,
  });

  const M = types.model("M", {
    repeating: types.array(N),
  });

  const form = new Form(M, {
    repeating: new RepeatingForm({
      repeatingField: new Field(converters.string),
    }),
  });

  const o = M.create({
    repeating: [{ repeatingField: "REPEATING_FIELD" }],
  });

  const state = form.state(o, {
    isDisabled: (accessor) => accessor.path === "/repeating",
  });

  const repeating = state.repeatingForm("repeating");
  const repeatingIndex = repeating.index(0);
  const repeatingField = repeatingIndex.field("repeatingField");

  expect(repeating.disabled).toBeTruthy();
  expect(repeatingIndex.disabled).toBeTruthy();
  expect(repeatingField.disabled).toBeTruthy();
});

test("repeatingField disabled when repeatingForm in repeatingForm is disabled", () => {
  const O = types.model("O", {
    repeatingField: types.string,
  });

  const N = types.model("N", {
    repeating2: types.array(O),
  });

  const M = types.model("M", {
    repeating: types.array(N),
  });

  const form = new Form(M, {
    repeating: new RepeatingForm({
      repeating2: new RepeatingForm({
        repeatingField: new Field(converters.string),
      }),
    }),
  });

  const o = M.create({
    repeating: [{ repeating2: [{ repeatingField: "REPEATING_FIELD" }] }],
  });

  const state = form.state(o, {
    isDisabled: (accessor) => accessor.path === "/repeating",
  });

  const repeating = state.repeatingForm("repeating");
  const repeatingIndex = repeating.index(0);
  const repeating2 = repeatingIndex.repeatingForm("repeating2");
  const repeating2Index = repeating2.index(0);
  const repeatingField = repeating2Index.field("repeatingField");

  expect(repeating.disabled).toBeTruthy();
  expect(repeatingIndex.disabled).toBeTruthy();
  expect(repeating2.disabled).toBeTruthy();
  expect(repeating2Index.disabled).toBeTruthy();
  expect(repeatingField.disabled).toBeTruthy();
});

test("field disabled when form disabled", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
  });

  const o = M.create({
    foo: "FOO",
  });

  const state = form.state(o, {
    isDisabled: (accessor) => accessor.path === "",
  });

  const formAccessor = state;
  const foo = state.field("foo");

  expect(formAccessor.disabled).toBeTruthy();
  expect(foo.disabled).toBeTruthy();
});

test("inputAllowed", () => {
  const N = types.model("N", {
    hiddenRepeatingField: types.string,
  });

  const M = types.model("M", {
    disabledField: types.string,
    readOnlyField: types.string,
    repeatingForm: types.array(N),
  });

  const form = new Form(M, {
    disabledField: new Field(converters.string),
    readOnlyField: new Field(converters.string),
    repeatingForm: new RepeatingForm({
      hiddenRepeatingField: new Field(converters.string),
    }),
  });

  const o = M.create({
    disabledField: "DISABLED",
    readOnlyField: "READ_ONLY",
    repeatingForm: [{ hiddenRepeatingField: "HIDDEN_REPEATING_FIELD" }],
  });

  const state = form.state(o, {
    isDisabled: (accessor) => accessor.path === "/disabledField",
    isHidden: (accessor) =>
      accessor.path === "/repeatingForm/0/hiddenRepeatingField",
    isReadOnly: (accessor) => accessor.path === "/readOnlyField",
  });

  const formAccessor = state;
  const disabledField = state.field("disabledField");
  const readOnlyField = state.field("readOnlyField");
  const repeatingForm = state.repeatingForm("repeatingForm");
  const repeatingIndex = repeatingForm.index(0);
  const hiddenRepeatingField = repeatingIndex.field("hiddenRepeatingField");

  expect(formAccessor.inputAllowed).toBeTruthy();
  expect(disabledField.inputAllowed).toBeFalsy();
  expect(readOnlyField.inputAllowed).toBeFalsy();
  expect(repeatingForm.inputAllowed).toBeTruthy();
  expect(repeatingIndex.inputAllowed).toBeTruthy();
  expect(hiddenRepeatingField.inputAllowed).toBeFalsy();
});

test("isEmpty on fields", () => {
  const M = types.model("M", {
    string: types.string,
    maybeNullString: types.maybeNull(types.string),
    boolean: types.boolean,
    textStringArray: types.array(types.string),
    decimal: types.string,
    stringArray: types.array(types.string),
  });

  const form = new Form(M, {
    string: new Field(converters.string),
    maybeNullString: new Field(converters.maybeNull(converters.string)),
    boolean: new Field(converters.boolean),
    textStringArray: new Field(converters.textStringArray),
    stringArray: new Field(converters.stringArray),
    decimal: new Field(converters.stringDecimal({ decimalPlaces: 2 })),
  });

  const o = M.create({
    string: "",
    maybeNullString: null,
    boolean: false,
    textStringArray: ["Q"],
    decimal: "0.00",
    stringArray: undefined,
  });

  const state = form.state(o);

  const stringField = state.field("string");
  const maybeNullStringField = state.field("maybeNullString");
  const booleanField = state.field("boolean");
  const textStringArrayField = state.field("textStringArray");
  const stringArrayField = state.field("stringArray");
  const decimalField = state.field("decimal");

  // String
  expect(stringField.isEmpty).toBe(true);

  stringField.setRaw("TEST");
  expect(stringField.isEmpty).toBe(false);

  stringField.setRaw("");
  expect(stringField.isEmpty).toBe(true);

  // Maybe null string
  expect(maybeNullStringField.isEmpty).toBe(true);

  maybeNullStringField.setRaw("TEST");
  expect(maybeNullStringField.isEmpty).toBe(false);

  maybeNullStringField.setRaw("");
  expect(maybeNullStringField.isEmpty).toBe(true);

  // Boolean
  expect(booleanField.isEmpty).toBe(false);
  booleanField.setRaw(true);
  expect(booleanField.isEmpty).toBe(false);

  // textStringArray
  expect(textStringArrayField.isEmpty).toBe(false);

  textStringArrayField.setRaw("");
  expect(textStringArrayField.isEmpty).toBe(true);

  textStringArrayField.setRaw("A\nB\nC");
  expect(textStringArrayField.isEmpty).toBe(false);

  // stringArray
  expect(stringArrayField.isEmpty).toBe(true);
  stringArrayField.setRaw([]);
  expect(stringArrayField.isEmpty).toBe(true);
  stringArrayField.setRaw(["abc", "def"]);
  expect(stringArrayField.isEmpty).toBe(false);

  // decimal
  expect(decimalField.isEmpty).toBe(false);

  decimalField.setRaw("");
  expect(decimalField.isEmpty).toBe(false);

  decimalField.setRaw("123.0");
  expect(decimalField.isEmpty).toBe(false);
});

test("isEmptyAndRequired on fields", () => {
  const M = types.model("M", {
    string: types.string,
    maybeNullString: types.maybeNull(types.string),
    boolean: types.boolean,
    textStringArray: types.array(types.string),
    stringArray: types.array(types.string),
    decimal: types.string,
    requiredString: types.string,
    requiredMaybeNullString: types.maybeNull(types.string),
    requiredBoolean: types.boolean,
    requiredTextStringArray: types.array(types.string),
    requiredStringArray: types.array(types.string),
    requiredDecimal: types.string,
  });

  const form = new Form(M, {
    string: new Field(converters.string),
    maybeNullString: new Field(converters.maybeNull(converters.string)),
    boolean: new Field(converters.boolean),
    textStringArray: new Field(converters.textStringArray),
    stringArray: new Field(converters.stringArray),
    decimal: new Field(converters.stringDecimal({ decimalPlaces: 2 })),
    requiredString: new Field(converters.string, {
      required: true,
    }),
    requiredMaybeNullString: new Field(
      converters.maybeNull(converters.string),
      {
        required: true,
      }
    ),
    requiredBoolean: new Field(converters.boolean, {
      required: true,
    }),
    requiredTextStringArray: new Field(converters.textStringArray, {
      required: true,
    }),
    requiredStringArray: new Field(converters.stringArray, { required: true }),
    requiredDecimal: new Field(converters.stringDecimal({ decimalPlaces: 2 }), {
      required: true,
    }),
  });

  const o = M.create({
    string: "",
    maybeNullString: null,
    boolean: false,
    textStringArray: ["Q"],
    stringArray: undefined,
    decimal: "0.00",
    requiredString: "",
    requiredMaybeNullString: null,
    requiredBoolean: false,
    requiredTextStringArray: ["Q"],
    requiredStringArray: undefined,
    requiredDecimal: "0.00",
  });

  const state = form.state(o);

  const stringField = state.field("string");
  const maybeNullStringField = state.field("maybeNullString");
  const booleanField = state.field("boolean");
  const textStringArrayField = state.field("textStringArray");
  const stringArrayField = state.field("stringArray");
  const decimalField = state.field("decimal");

  const requiredStringField = state.field("requiredString");
  const requiredMaybeNullStringField = state.field("requiredMaybeNullString");
  const requiredBooleanField = state.field("requiredBoolean");
  const requiredTextStringArrayField = state.field("requiredTextStringArray");
  const requiredStringArrayField = state.field("requiredStringArray");
  const requiredDecimalField = state.field("requiredDecimal");

  // String
  expect(stringField.isEmptyAndRequired).toBe(false);

  stringField.setRaw("TEST");
  expect(stringField.isEmptyAndRequired).toBe(false);

  stringField.setRaw("");
  expect(stringField.isEmptyAndRequired).toBe(false);

  // Maybe null string
  expect(maybeNullStringField.isEmptyAndRequired).toBe(false);

  maybeNullStringField.setRaw("TEST");
  expect(maybeNullStringField.isEmptyAndRequired).toBe(false);

  maybeNullStringField.setRaw("");
  expect(maybeNullStringField.isEmptyAndRequired).toBe(false);

  // Boolean
  expect(booleanField.isEmptyAndRequired).toBe(false);
  booleanField.setRaw(true);
  expect(booleanField.isEmptyAndRequired).toBe(false);

  // textStringArray
  expect(textStringArrayField.isEmptyAndRequired).toBe(false);

  textStringArrayField.setRaw("");
  expect(textStringArrayField.isEmptyAndRequired).toBe(false);

  textStringArrayField.setRaw("A\nB\nC");
  expect(textStringArrayField.isEmptyAndRequired).toBe(false);

  // stringArray
  expect(stringArrayField.isEmptyAndRequired).toBe(false);
  stringArrayField.setRaw([]);
  expect(stringArrayField.isEmptyAndRequired).toBe(false);
  stringArrayField.setRaw(["abc", "def"]);
  expect(stringArrayField.isEmptyAndRequired).toBe(false);

  // decimal
  expect(decimalField.isEmptyAndRequired).toBe(false);

  decimalField.setRaw("");
  expect(decimalField.isEmptyAndRequired).toBe(false);

  decimalField.setRaw("123.0");
  expect(decimalField.isEmptyAndRequired).toBe(false);

  // Required
  // String
  expect(requiredStringField.isEmptyAndRequired).toBe(true);

  requiredStringField.setRaw("TEST");
  expect(requiredStringField.isEmptyAndRequired).toBe(false);

  requiredStringField.setRaw("");
  expect(requiredStringField.isEmptyAndRequired).toBe(true);

  // Maybe null string
  expect(requiredMaybeNullStringField.isEmptyAndRequired).toBe(true);

  requiredMaybeNullStringField.setRaw("TEST");
  expect(requiredMaybeNullStringField.isEmptyAndRequired).toBe(false);

  requiredMaybeNullStringField.setRaw("");
  expect(requiredMaybeNullStringField.isEmptyAndRequired).toBe(true);

  // Boolean
  expect(requiredBooleanField.isEmptyAndRequired).toBe(false);
  requiredBooleanField.setRaw(true);
  expect(requiredBooleanField.isEmptyAndRequired).toBe(false);

  // textStringArray
  expect(requiredTextStringArrayField.isEmptyAndRequired).toBe(false);

  requiredTextStringArrayField.setRaw("");
  expect(requiredTextStringArrayField.isEmptyAndRequired).toBe(true);

  requiredTextStringArrayField.setRaw("A\nB\nC");
  expect(requiredTextStringArrayField.isEmptyAndRequired).toBe(false);

  // stringArray
  expect(requiredStringArrayField.isEmptyAndRequired).toBe(true);
  requiredStringArrayField.setRaw([]);
  expect(requiredStringArrayField.isEmptyAndRequired).toBe(true);
  requiredStringArrayField.setRaw(["abc", "def"]);
  expect(requiredStringArrayField.isEmptyAndRequired).toBe(false);

  // decimal
  expect(requiredDecimalField.isEmptyAndRequired).toBe(false);

  requiredDecimalField.setRaw("");
  expect(requiredDecimalField.isEmptyAndRequired).toBe(false);

  requiredDecimalField.setRaw("123.0");
  expect(requiredDecimalField.isEmptyAndRequired).toBe(false);
});

test("clearAllValidations", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string, {
      validators: [(value) => value !== "correct" && "Wrong"],
    }),
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.raw).toEqual("FOO");
  field.setRaw("BAR");
  expect(field.raw).toEqual("BAR");
  expect(field.error).toEqual("Wrong");
  state.clearAllValidations();
  expect(field.error).toBeUndefined();
});

test("a simple form with literalString converter", () => {
  const M = types.model("M", {
    foo: types.union(types.literal("foo"), types.literal("bar")),
  });

  const form = new Form(M, {
    foo: new Field(converters.literalString<"foo" | "bar">()),
  });

  const o = M.create({ foo: "foo" });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.raw).toEqual("foo");
  field.setRaw("bar");
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual("bar");

  expect(field.node).toBe(state.node);
});

test("isdirty form and field in addmode", async () => {
  async function mySave(node: Instance<typeof M>) {
    return null;
  }
  async function process(node: Instance<typeof M>, path: string) {
    return {
      updates: [],
      accessUpdates: [],
      errorValidations: [],
      warningValidations: [],
    };
  }
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o, {
    backend: { save: mySave, process: process },
    addMode: true,
    getError: (accessor) => {
      return accessor.path === "/foo" ? "Wrong!" : undefined;
    },
  });
  const field = state.field("foo");

  expect(field.isDirty).toBeFalsy();
  expect(state.isDirty).toBeFalsy();
  field.setRaw("correct");
  expect(state.isDirty).toBeTruthy();
  expect(field.isDirty).toBeTruthy();

  field.setRaw("FOO");
  expect(field.isDirty).toBeFalsy();
  expect(state.isDirty).toBeFalsy();

  field.setRaw("correct");
  // save with ignoring messages
  await state.save({ ignoreGetError: true });
  expect(field.isDirty).toBeFalsy();
  expect(state.isDirty).toBeFalsy();

  field.setRaw("FOO");
  // save without ignoring messages
  await state.save();
  expect(field.isDirty).toBeTruthy();
  expect(state.isDirty).toBeTruthy();
});

test("isdirty form and field in addmode and addmodedefaults", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o, { addMode: true, addModeDefaults: ["foo"] });
  const field = state.field("foo");

  expect(field.value).toBe("FOO");
  expect(field.isDirty).toBeFalsy();
  expect(state.isDirty).toBeFalsy();
  field.setRaw("correct");
  expect(state.isDirty).toBeTruthy();
  expect(field.isDirty).toBeTruthy();

  field.setRaw("FOO");
  expect(field.isDirty).toBeFalsy();
  expect(state.isDirty).toBeFalsy();
});

test("form with reference and addmodedefaults isDirty check", () => {
  const R = types.model("R", {
    id: types.identifier,
    bar: types.string,
  });

  const M = types.model("M", {
    foo: types.reference(R),
  });

  const Root = types.model("Root", {
    entries: types.array(R),
    instance: M,
  });

  const root = Root.create({
    entries: [
      { id: "1", bar: "correct" },
      { id: "2", bar: "incorrect" },
    ],
    instance: { foo: "1" },
  });

  const form = new Form(M, {
    foo: new Field(converters.model(R)),
  });

  const r1 = root.entries[0];
  const r2 = root.entries[1];

  const o = root.instance;

  const state = form.state(o, { addMode: true, addModeDefaults: ["foo"] });
  const field = state.field("foo");

  expect(field.value).toBe(r1);

  expect(field.isDirty).toBeFalsy();
  expect(state.isDirty).toBeFalsy();
  field.setRaw(r2);
  expect(field.isDirty).toBeTruthy();
  expect(state.isDirty).toBeTruthy();

  field.setRaw(r1);
  expect(field.isDirty).toBeFalsy();
  expect(state.isDirty).toBeFalsy();
});

test("isdirty form and field", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.isDirty).toBeFalsy();
  expect(state.isDirty).toBeFalsy();
  field.setRaw("correct");
  expect(state.isDirty).toBeTruthy();
  expect(field.isDirty).toBeTruthy();

  field.setRaw("FOO");
  expect(field.isDirty).toBeFalsy();
  expect(state.isDirty).toBeFalsy();
});

test("isdirty form and field array field", () => {
  const M = types
    .model("M", {
      foo: types.array(types.string),
    })
    .actions((self) => ({
      addFoo() {
        self.foo.push(`${self.foo.length}`);
      },
      clear() {
        self.foo.clear();
      },
    }));

  const form = new Form(M, {
    foo: new Field(converters.textStringArray),
  });

  const o = M.create({ foo: [] });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.isDirty).toBeFalsy();
  expect(state.isDirty).toBeFalsy();
  o.addFoo();
  expect(state.isDirty).toBeTruthy();
  expect(field.isDirty).toBeTruthy();

  o.clear();
  expect(field.isDirty).toBeFalsy();
  expect(state.isDirty).toBeFalsy();
});

test("repeating form new row isDirty", async () => {
  async function mySave(node: Instance<typeof M>) {
    return null;
  }
  const N = types.model("N", {
    bar: types.string,
  });
  const M = types.model("M", {
    foo: types.array(N),
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.string),
    }),
  });

  const o = M.create({ foo: [] });

  const state = form.state(o, { backend: { save: mySave } });

  const forms = state.repeatingForm("foo");

  expect(state.isDirty).toBeFalsy();
  forms.push(N.create({ bar: "bla" }));
  expect(state.isDirty).toBeTruthy();

  await state.save();
  expect(state.isDirty).toBeFalsy();
});

test("repeating form existing row isDirty", () => {
  const N = types.model("N", {
    bar: types.string,
  });
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
  const oneForm = forms.index(0);

  const field = oneForm.field("bar");

  expect(field.isDirty).toBeFalsy();
  expect(state.isDirty).toBeFalsy();
  field.setRaw("QUX");
  expect(field.isDirty).toBeTruthy();
  expect(state.isDirty).toBeTruthy();
});

test("repeating form add row isDirty", () => {
  const N = types.model("N", {
    bar: types.string,
  });
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

  expect(state.isDirty).toBeFalsy();
  const newRecord = N.create({ bar: "FOO" });
  forms.push(newRecord);
  expect(state.isDirty).toBeTruthy();

  forms.remove(newRecord);
  expect(state.isDirty).toBeFalsy();
});

test("form with reference isDirty check", () => {
  const R = types.model("R", {
    id: types.identifier,
    bar: types.string,
  });

  const M = types.model("M", {
    foo: types.reference(R),
  });

  const Root = types.model("Root", {
    entries: types.array(R),
    instance: M,
  });

  const root = Root.create({
    entries: [
      { id: "1", bar: "correct" },
      { id: "2", bar: "incorrect" },
    ],
    instance: { foo: "1" },
  });

  const form = new Form(M, {
    foo: new Field(converters.model(R)),
  });

  const r1 = root.entries[0];
  const r2 = root.entries[1];

  const o = root.instance;

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.isDirty).toBeFalsy();
  expect(state.isDirty).toBeFalsy();
  field.setRaw(r2);
  expect(field.isDirty).toBeTruthy();
  expect(state.isDirty).toBeTruthy();

  field.setRaw(r1);
  expect(field.isDirty).toBeFalsy();
  expect(state.isDirty).toBeFalsy();
});

test("update field textStringArray via store action", () => {
  const M = types
    .model("M", {
      foo: types.array(types.string),
    })
    .actions((self) => ({
      update() {
        self.foo.replace(["BAR"]);
      },
      add() {
        self.foo.push("FOO");
      },
      remove() {
        self.foo.remove("FOO");
      },
    }));

  const form = new Form(M, {
    foo: new Field(converters.textStringArray, { required: true }),
  });
  const o = M.create({ foo: ["FOO"] });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("FOO");
  expect(o.foo).toEqual(["FOO"]);
  expect(field.value).toEqual(["FOO"]);

  o.update();

  expect(o.foo).toEqual(["BAR"]);
  expect(field.raw).toEqual("BAR");
  expect(field.value).toEqual(["BAR"]);

  o.add();

  expect(o.foo).toEqual(["BAR", "FOO"]);
  expect(field.raw).toEqual("BAR\nFOO");
  expect(field.value).toEqual(["BAR", "FOO"]);

  o.remove();

  expect(o.foo).toEqual(["BAR"]);
  expect(field.raw).toEqual("BAR");
  expect(field.value).toEqual(["BAR"]);
});

test("update field textStringArray after change", () => {
  const M = types
    .model("M", {
      foo: types.array(types.string),
    })
    .actions((self) => ({
      update() {
        self.foo.replace(["BAR"]);
      },
    }));

  const form = new Form(M, {
    foo: new Field(converters.textStringArray, { required: true }),
  });
  const o = M.create({ foo: ["FOO"] });

  const state = form.state(o);

  const field = state.field("foo");

  field.setValueAndUpdateRaw(observable.array(["FOO2"]));

  expect(field.raw).toEqual("FOO2");
  expect(o.foo).toEqual(["FOO2"]);
  expect(field.value).toEqual(["FOO2"]);

  o.update();

  expect(o.foo).toEqual(["BAR"]);
  expect(field.raw).toEqual("BAR");
  expect(field.value).toEqual(["BAR"]);
});

test("update field textStringArray via store action in repeating form", () => {
  const N = types
    .model("N", {
      bar: types.array(types.string),
    })
    .actions((self) => ({
      update() {
        self.bar.replace(["BAR"]);
      },
      add() {
        self.bar.push("FOO");
      },
      remove() {
        self.bar.remove("FOO");
      },
    }));

  const M = types.model("M", {
    foo: types.array(N),
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.textStringArray, { required: true }),
    }),
  });

  const o = M.create({ foo: [{ bar: ["FOO"] }] });

  const state = form.state(o);

  const forms = state.repeatingForm("foo");
  const oneForm = forms.index(0);

  const field = oneForm.field("bar");

  expect(field.raw).toEqual("FOO");
  expect(o.foo[0].bar).toEqual(["FOO"]);
  expect(field.value).toEqual(["FOO"]);

  o.foo[0].update();

  expect(o.foo[0].bar).toEqual(["BAR"]);
  expect(field.raw).toEqual("BAR");
  expect(field.value).toEqual(["BAR"]);

  o.foo[0].add();

  expect(o.foo[0].bar).toEqual(["BAR", "FOO"]);
  expect(field.raw).toEqual("BAR\nFOO");
  expect(field.value).toEqual(["BAR", "FOO"]);

  o.foo[0].remove();

  expect(o.foo[0].bar).toEqual(["BAR"]);
  expect(field.raw).toEqual("BAR");
  expect(field.value).toEqual(["BAR"]);

  o.foo[0].remove();

  expect(o.foo[0].bar).toEqual(["BAR"]);
  expect(field.raw).toEqual("BAR");
  expect(field.value).toEqual(["BAR"]);
});
