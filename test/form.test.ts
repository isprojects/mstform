import { configure, autorun } from "mobx";
import {
  getSnapshot,
  types,
  applySnapshot,
  onPatch,
  Instance
} from "mobx-state-tree";
import { Converter, Field, Form, RepeatingForm, converters } from "../src";

// "always" leads to trouble during initialization.
configure({ enforceActions: "observed" });

test("a simple form", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string, {
      validators: [value => value !== "correct" && "Wrong"]
    })
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.raw).toEqual("FOO");
  await field.setRaw("BAR");
  expect(field.raw).toEqual("BAR");
  expect(field.error).toEqual("Wrong");
  expect(field.value).toEqual("FOO");
  await field.setRaw("correct");
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual("correct");

  expect(field.node).toBe(state.node);
});

test("a simple form with array field", async () => {
  const M = types.model("M", {
    foo: types.array(types.string)
  });

  const form = new Form(M, {
    foo: new Field(converters.stringArray, {
      validators: [
        value => (value.length !== 1 || value[0] !== "correct") && "Wrong"
      ]
    })
  });

  const o = M.create({ foo: ["FOO"] });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.raw).toEqual(["FOO"]);
  expect(Array.isArray(field.raw)).toBeTruthy();
  await field.setRaw(["BAR", "QUX"]);
  expect(field.raw).toEqual(["BAR", "QUX"]);
  expect(Array.isArray(field.raw)).toBeTruthy();
  expect(field.error).toEqual("Wrong");
  expect(field.value).toEqual(["FOO"]);
  await field.setRaw(["correct"]);
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual(["correct"]);
});

test("number input", async () => {
  const M = types.model("M", {
    foo: types.number
  });

  const form = new Form(M, {
    foo: new Field(converters.number)
  });

  const o = M.create({ foo: 3 });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("3");
  await field.setRaw("4");
  expect(field.raw).toEqual("4");
  expect(field.value).toEqual(4);
  expect(field.error).toBeUndefined();
  await field.setRaw("not a number");
  expect(field.value).toEqual(4);
  expect(field.error).toEqual("Could not convert");
});

test("conversion failure with message", async () => {
  const M = types.model("M", {
    foo: types.number
  });

  const form = new Form(M, {
    foo: new Field(converters.number, { conversionError: "Not a number" })
  });

  const o = M.create({ foo: 3 });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("3");
  await field.setRaw("4");
  expect(field.raw).toEqual("4");
  expect(field.value).toEqual(4);
  expect(field.error).toBeUndefined();
  await field.setRaw("not a number");
  expect(field.value).toEqual(4);
  expect(field.error).toEqual("Not a number");
});

test("repeating form", async () => {
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

  const o = M.create({ foo: [{ bar: "BAR" }] });

  const state = form.state(o);

  const forms = state.repeatingForm("foo");
  const oneForm = forms.index(0);

  const field = oneForm.field("bar");

  expect(field.raw).toEqual("BAR");
  await field.setRaw("QUX");
  expect(field.raw).toEqual("QUX");
  expect(field.value).toEqual("QUX");

  expect(field.node).toBe(o.foo[0]);
});

test("repeating form with conversion", async () => {
  const N = types.model("N", {
    bar: types.number
  });
  const M = types.model("M", {
    foo: types.array(N)
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.number)
    })
  });

  const o = M.create({ foo: [{ bar: 3 }] });

  const state = form.state(o);

  const forms = state.repeatingForm("foo");
  const oneForm = forms.index(0);
  const field = oneForm.field("bar");

  expect(field.raw).toEqual("3");
  await field.setRaw("4");
  expect(field.raw).toEqual("4");
  expect(field.value).toEqual(4);
  await field.setRaw("not a number");
});

test("repeating form push", async () => {
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

test("repeating form insert", async () => {
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

  await field.setRaw("FLURB");
  expect(field.addMode).toBeFalsy();
  expect(field.raw).toEqual("FLURB");
  expect(field.value).toEqual("FLURB");
});

test("repeating form applySnapshot shouldn't trigger addMode", async () => {
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

test("repeating form remove", async () => {
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

  const o = M.create({ foo: [{ bar: "BAR" }] });

  const state = form.state(o);

  const forms = state.repeatingForm("foo");
  expect(forms.length).toBe(1);
  forms.remove(o.foo[0]);
  expect(forms.length).toBe(0);
});

test("repeating form remove and insert clears errors", async () => {
  const N = types.model("N", {
    bar: types.string
  });
  const M = types.model("M", {
    foo: types.array(N)
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.string, {
        validators: [value => value !== "correct" && "wrong"]
      })
    })
  });

  const o = M.create({ foo: [{ bar: "correct" }] });

  const state = form.state(o);

  const forms = state.repeatingForm("foo");
  const field0 = forms.index(0).field("bar");
  await field0.setRaw("incorrect");
  expect(field0.error).toEqual("wrong");

  forms.remove(o.foo[0]);

  forms.push({ bar: "correct" });
  const field1 = forms.index(0).field("bar");
  expect(field1.error).toBeUndefined();
});

test("repeating form tougher remove clear raw", async () => {
  const N = types.model("N", {
    bar: types.string
  });
  const M = types.model("M", {
    foo: types.array(N)
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.string, {
        validators: [value => "always wrong"]
      })
    })
  });

  const o = M.create({ foo: [{ bar: "A" }, { bar: "B" }] });

  const state = form.state(o);

  const forms = state.repeatingForm("foo");
  const field0 = forms.index(0).field("bar");

  await field0.setRaw("A*");
  const field1 = forms.index(1).field("bar");
  await field1.setRaw("B*");
  forms.remove(o.foo[0]);
  const field0again = forms.index(0).field("bar");
  expect(field0again.raw).toEqual("B*");
});

test("repeating form insert should retain raw too", async () => {
  const N = types.model("N", {
    bar: types.string
  });
  const M = types.model("M", {
    foo: types.array(N)
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.string, {
        validators: [value => "always wrong"]
      })
    })
  });

  const o = M.create({ foo: [{ bar: "A" }, { bar: "B" }] });

  const state = form.state(o);

  const forms = state.repeatingForm("foo");
  const field0 = forms.index(0).field("bar");
  await field0.setRaw("A*");
  const field1 = forms.index(1).field("bar");
  await field1.setRaw("B*");

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

test("repeating form nested remove", async () => {
  const N = types.model("N", {
    bar: types.string
  });
  const M = types.model("M", {
    n_entries: types.array(N)
  });
  const L = types.model("L", {
    m_entries: types.array(M)
  });

  const form = new Form(L, {
    m_entries: new RepeatingForm({
      n_entries: new RepeatingForm({
        bar: new Field(converters.string)
      })
    })
  });

  const o = L.create({ m_entries: [{ n_entries: [{ bar: "BAR" }] }] });

  const state = form.state(o);

  const mForms = state.repeatingForm("m_entries");
  expect(mForms.length).toBe(1);
  mForms.remove(o.m_entries[0]);
  expect(mForms.length).toBe(0);
});

test("accessors should retain index order after insert", async () => {
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

  const o = M.create({ foo: [{ bar: "A" }, { bar: "B" }] });

  const state = form.state(o);

  const forms = state.repeatingForm("foo");
  forms.insert(0, N.create({ bar: "inserted" }));
  expect(forms.accessors.map(accessor => accessor.path)).toEqual([
    "/foo/0",
    "/foo/1",
    "/foo/2"
  ]);
});

test("async validation in converter", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const done: any[] = [];

  const converter = new Converter<string, string>({
    emptyRaw: "",
    emptyValue: "",
    convert: raw => raw,
    validate: async value => {
      await new Promise(resolve => {
        done.push(resolve);
      });
      return true;
    },
    render: value => value
  });

  const form = new Form(M, {
    foo: new Field(converter, {
      validators: [
        value => {
          return value !== "correct" && "Wrong";
        }
      ]
    })
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("FOO");
  const promise = field.setRaw("correct");
  expect(field.raw).toEqual("correct");
  // value hasn't changed yet as promise hasn't resolved yet
  expect(field.value).toEqual("FOO");
  expect(field.error).toBeUndefined();
  done[0]();
  await promise;
  expect(field.value).toEqual("correct");
  expect(field.raw).toEqual("correct");
  expect(field.error).toBeUndefined();
  // now put in a wrong value
  const promise2 = field.setRaw("wrong");
  expect(field.raw).toEqual("wrong");
  // value hasn't changed yet as promise hasn't resolved yet
  expect(field.value).toEqual("correct");
  expect(field.error).toBeUndefined();
  done[1]();
  await promise2;
  expect(field.value).toEqual("correct");
  expect(field.raw).toEqual("wrong");
  expect(field.error).toEqual("Wrong");
});

test("async validation in validator", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const done: any[] = [];

  const form = new Form(M, {
    foo: new Field(converters.string, {
      validators: [
        async value => {
          await new Promise(resolve => {
            done.push(resolve);
          });
          return value !== "correct" && "Wrong";
        }
      ]
    })
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("FOO");
  const promise = field.setRaw("correct");
  expect(field.raw).toEqual("correct");
  // value hasn't changed yet as promise hasn't resolved yet
  expect(field.value).toEqual("FOO");
  expect(field.error).toBeUndefined();
  // we use nextTick to wait until the inner promise (in the converter)
  // to be fully resolved
  process.nextTick(() => {
    done[0]();
  });
  await promise;
  expect(field.value).toEqual("correct");
  expect(field.raw).toEqual("correct");
  expect(field.error).toBeUndefined();
  // now put in a wrong value
  const promise2 = field.setRaw("wrong");
  expect(field.raw).toEqual("wrong");
  // value hasn't changed yet as promise hasn't resolved yet
  expect(field.value).toEqual("correct");
  expect(field.error).toBeUndefined();
  process.nextTick(() => {
    done[1]();
  });
  await promise2;
  expect(field.value).toEqual("correct");
  expect(field.raw).toEqual("wrong");
  expect(field.error).toEqual("Wrong");
});

test("async validation modification", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  let done: any[] = [];

  const form = new Form(M, {
    foo: new Field(converters.string, {
      validators: [
        async value => {
          await new Promise(resolve => {
            done.push(resolve);
          });
          return value !== "correct" && "Wrong";
        }
      ]
    })
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("FOO");
  const promise = field.setRaw("correct");
  expect(field.raw).toEqual("correct");
  // value hasn't changed yet as promise hasn't resolved yet
  expect(state.isValidating).toBeTruthy();
  expect(field.value).toEqual("FOO");
  expect(field.error).toBeUndefined();
  // now we change the raw while waiting
  const promise2 = field.setRaw("incorrect");
  process.nextTick(() => {
    done[0]();
  });
  await promise;
  expect(state.isValidating).toBeTruthy();
  expect(field.raw).toEqual("incorrect");
  expect(field.value).toEqual("FOO");
  expect(field.error).toBeUndefined();
  process.nextTick(() => {
    done[1]();
  });
  await promise2;
  expect(state.isValidating).toBeFalsy();
  expect(field.raw).toEqual("incorrect");
  expect(field.value).toEqual("FOO");
  expect(field.error).toEqual("Wrong");
});

test("async validation rejects sets error status", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const done: any[] = [];
  const form = new Form(M, {
    foo: new Field(converters.string, {
      validators: [
        async value => {
          await new Promise(resolve => {
            done.push(resolve);
          });
          throw new Error("Crazy error");
        }
      ]
    })
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("FOO");
  const promise = field.setRaw("correct");
  expect(field.isValidating).toBeTruthy();
  process.nextTick(() => {
    done[0]();
  });
  await promise;
  expect(field.error).toEqual("Something went wrong");
  expect(field.isValidating).toBeFalsy();
});

test("simple validate", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string, {
      validators: [value => value !== "correct" && "Wrong"]
    })
  });

  const o = M.create({ foo: "incorrect" });

  const state = form.state(o);

  const field = state.field("foo");
  expect(field.error).toBeUndefined();
  expect(field.raw).toEqual("incorrect");
  expect(field.value).toEqual("incorrect");
  const result = await state.validate();
  expect(result).toBeFalsy();
  expect(field.error).toEqual("Wrong");

  await field.setRaw("correct");
  expect(field.error).toBeUndefined();
  const result2 = await state.validate();
  expect(result2).toBeTruthy();
});

test("repeating form validate", async () => {
  const N = types.model("N", {
    bar: types.string
  });
  const M = types.model("M", {
    foo: types.array(N)
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.string, {
        validators: [value => value !== "correct" && "Wrong"]
      })
    })
  });

  const o = M.create({ foo: [{ bar: "incorrect" }] });

  const state = form.state(o);

  const forms = state.repeatingForm("foo");
  const field = forms.index(0).field("bar");
  expect(field.raw).toEqual("incorrect");
  expect(field.error).toBeUndefined();
  const result = await state.validate();
  expect(result).toBeFalsy();
  expect(field.error).toEqual("Wrong");

  await field.setRaw("correct");
  expect(field.error).toBeUndefined();
  const result2 = await state.validate();
  expect(result2).toBeTruthy();
});

test("repeating form multiple entries validate", async () => {
  const N = types.model("N", {
    bar: types.string
  });
  const M = types.model("M", {
    foo: types.array(N)
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.string, {
        validators: [value => value !== "correct" && "Wrong"]
      })
    })
  });

  const o = M.create({
    foo: [{ bar: "incorrect" }, { bar: "Also incorrect" }]
  });

  const state = form.state(o);

  const forms = state.repeatingForm("foo");
  const field = forms.index(0).field("bar");
  expect(field.raw).toEqual("incorrect");
  expect(field.error).toBeUndefined();
  const result = await state.validate();
  expect(result).toBeFalsy();
  expect(field.error).toEqual("Wrong");

  await field.setRaw("correct");
  expect(field.error).toBeUndefined();
  const result2 = await state.validate();
  expect(result2).toBeFalsy();

  await forms
    .index(1)
    .field("bar")
    .setRaw("correct");
  const result3 = await state.validate();
  expect(result3).toBeTruthy();
});

test("setErrors", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string)
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);
  state.setErrors({ foo: "WRONG" });

  const field = state.field("foo");
  expect(field.error).toEqual("WRONG");
});

test("setErrors repeating", async () => {
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

  const o = M.create({ foo: [{ bar: "FOOO" }] });

  const state = form.state(o);
  state.setErrors({ foo: [{ bar: "WRONG" }] });

  const field = state.repeatingForm("foo").accessors[0].field("bar");
  expect(field.error).toBe("WRONG");
});

test("additional error by name", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string)
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o, {
    save: async node => {
      return null;
    }
  });

  expect(state.additionalError("other")).toBeUndefined();
  state.setErrors({ foo: "WRONG", other: "OTHER!" });

  const field = state.field("foo");
  expect(field.error).toEqual("WRONG");

  expect(state.additionalError("other")).toEqual("OTHER!");
  expect(state.additionalError("foo")).toBeUndefined();

  await state.save();
  expect(state.additionalError("other")).toBeUndefined();
});

test("additional errors array", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string)
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o, {
    save: async node => {
      return null;
    }
  });

  expect(state.additionalErrors).toEqual([]);
  expect(state.additionalError("other")).toBeUndefined();
  state.setErrors({
    foo: "WRONG",
    other: "OTHER!",
    another: "ANOTHER",
    deep: { more: "MORE" }
  });

  const field = state.field("foo");
  expect(field.error).toEqual("WRONG");

  expect(state.additionalError("deep")).toBeUndefined();
  expect(state.additionalErrors).toEqual(["ANOTHER", "OTHER!"]);

  await state.save();
  expect(state.additionalErrors).toEqual([]);
});

test("FormState can be saved", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const o = M.create({ foo: "FOO" });

  const form = new Form(M, {
    foo: new Field(converters.string, {})
  });

  async function save(data: any) {
    if (data.foo === "") {
      return { foo: "Wrong" };
    }
    return null;
  }

  const state = form.state(o, { save });

  const field = state.field("foo");

  // do something not allowed
  await field.setRaw("");

  // we don't see any client-side validation errors
  expect(field.error).toBeUndefined();
  expect(o.foo).toEqual("");
  // now communicate with the server by doing the save
  const saveResult0 = await state.save();
  expect(saveResult0).toBe(false);
  expect(field.error).toEqual("Wrong");

  // correct things
  await field.setRaw("BAR");
  expect(o.foo).toEqual("BAR");
  // editing always wipes out the errors
  expect(field.error).toBeUndefined();

  const saveResult1 = await state.save();
  expect(saveResult1).toBe(true);

  expect(field.error).toBeUndefined();
});

test("save argument can be snapshotted", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const o = M.create({ foo: "FOO" });

  const form = new Form(M, {
    foo: new Field(converters.string, {})
  });

  let snapshot;

  async function save(node: any) {
    snapshot = getSnapshot(node);
    return null;
  }

  const state = form.state(o, { save });

  await state.save();

  expect(snapshot).toEqual({ foo: "FOO" });
});

test("inline save argument can be snapshotted", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const o = M.create({ foo: "FOO" });

  const form = new Form(M, {
    foo: new Field(converters.string, {})
  });

  let snapshot;

  const state = form.state(o, {
    save: node => {
      snapshot = getSnapshot(node);
      return null;
    }
  });

  await state.save();

  expect(snapshot).toEqual({ foo: "FOO" });
});

test("not required with maybe", async () => {
  const M = types.model("M", {
    foo: types.maybe(types.number)
  });

  const form = new Form(M, {
    foo: new Field(converters.maybe(converters.number), {
      required: false
    })
  });

  const o = M.create({ foo: undefined });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("");
  expect(field.value).toBeUndefined();
  await field.setRaw("3");
  expect(field.raw).toEqual("3");
  expect(field.value).toEqual(3);
  await field.setRaw("");
  expect(field.error).toBeUndefined();
  expect(field.value).toBeUndefined();
});

test("not required with maybeNull", async () => {
  const M = types.model("M", {
    foo: types.maybeNull(types.number)
  });

  const form = new Form(M, {
    foo: new Field(converters.maybeNull(converters.number), {
      required: false
    })
  });

  const o = M.create({ foo: null });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("");
  expect(field.value).toBeNull();
  await field.setRaw("3");
  expect(field.raw).toEqual("3");
  expect(field.value).toEqual(3);
  await field.setRaw("");
  expect(field.error).toBeUndefined();
  expect(field.value).toBeNull();
});

test("required", async () => {
  const M = types.model("M", {
    foo: types.number
  });

  const form = new Form(M, {
    foo: new Field(converters.number, {
      required: true
    })
  });

  const o = M.create({ foo: 3 });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("3");
  expect(field.value).toEqual(3);
  await field.setRaw("");
  expect(field.error).toEqual("Required");
  expect(field.value).toEqual(3);
});

test("required with save", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string, {
      required: true
    })
  });

  const o = M.create({ foo: "" });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("");
  expect(field.error).toBeUndefined();

  await state.save();

  expect(field.error).toEqual("Required");
});

test("required with requiredError", async () => {
  const M = types.model("M", {
    foo: types.number
  });

  const form = new Form(M, {
    foo: new Field(converters.number, {
      required: true
    })
  });

  const o = M.create({ foo: 3 });

  const state = form.state(o, { requiredError: "Verplicht" });

  const field = state.field("foo");

  expect(field.raw).toEqual("3");
  expect(field.value).toEqual(3);
  await field.setRaw("");
  expect(field.error).toEqual("Verplicht");
  expect(field.value).toEqual(3);
});

test("required with context in requiredError", async () => {
  const M = types.model("M", {
    foo: types.number
  });

  const form = new Form(M, {
    foo: new Field(converters.number, {
      required: true
    })
  });

  const o = M.create({ foo: 3 });

  const state = form.state(o, {
    context: "!",
    requiredError: context => "Verplicht" + context
  });

  const field = state.field("foo");

  expect(field.raw).toEqual("3");
  expect(field.value).toEqual(3);
  await field.setRaw("");
  expect(field.error).toEqual("Verplicht!");
  expect(field.value).toEqual(3);
});

test("required with requiredError on state and on field", async () => {
  const M = types.model("M", {
    foo: types.number
  });

  const form = new Form(M, {
    foo: new Field(converters.number, {
      required: true,
      requiredError: "This is required"
    })
  });

  const o = M.create({ foo: 3 });

  const state = form.state(o, {
    context: "!",
    requiredError: "This is not required"
  });

  const field = state.field("foo");

  expect(field.raw).toEqual("3");
  expect(field.value).toEqual(3);
  await field.setRaw("");
  expect(field.error).toEqual("This is required");
  expect(field.value).toEqual(3);
});

test("dynamic required with save", async () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string)
  });

  const o = M.create({ foo: "", bar: "" });

  const state = form.state(o, { isRequired: () => true });

  const fooField = state.field("foo");
  const barField = state.field("bar");

  expect(fooField.raw).toEqual("");
  expect(fooField.error).toBeUndefined();
  expect(barField.error).toBeUndefined();

  await state.save();

  expect(fooField.error).toEqual("Required");
  expect(barField.error).toEqual("Required");
});

test("required for number is implied", async () => {
  const M = types.model("M", {
    foo: types.number
  });

  const form = new Form(M, {
    foo: new Field(converters.number, {})
  });

  const o = M.create({ foo: 3 });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("3");
  expect(field.value).toEqual(3);
  await field.setRaw("");
  expect(field.error).toEqual("Required");
  expect(field.value).toEqual(3);
});

test("required with string", async () => {
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

  expect(field.value).toEqual("FOO");

  await field.setRaw("");
  expect(field.error).toEqual("Required");
  expect(field.value).toEqual("");
});

test("required with string and whitespace", async () => {
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

  await field.setRaw("   ");
  expect(field.error).toEqual("Required");
});

test("required with number and whitespace", async () => {
  const M = types.model("M", {
    foo: types.number
  });

  const form = new Form(M, {
    foo: new Field(converters.number, {
      required: true
    })
  });

  const o = M.create({ foo: 3 });

  const state = form.state(o);

  const field = state.field("foo");

  await field.setRaw("  ");
  expect(field.error).toEqual("Required");
});

test("required with boolean has no effect", async () => {
  const M = types.model("M", {
    foo: types.boolean
  });

  const form = new Form(M, {
    foo: new Field(converters.boolean, {
      required: true
    })
  });

  const o = M.create({ foo: false });

  const state = form.state(o, { save: () => null });

  const field = state.field("foo");

  expect(field.required).toBeFalsy();
  await field.setRaw(false);
  expect(field.error).toBeUndefined();

  await state.save();
  expect(field.error).toBeUndefined();
});

test("required with maybe", async () => {
  const M = types.model("M", {
    foo: types.maybe(types.number)
  });

  const form = new Form(M, {
    foo: new Field(converters.maybe(converters.number), {
      required: true
    })
  });

  const o = M.create({ foo: undefined });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("");
  expect(field.value).toBeUndefined();
  await field.setRaw("3");
  expect(field.raw).toEqual("3");
  expect(field.value).toEqual(3);
  await field.setRaw("");
  expect(field.error).toEqual("Required");
  expect(field.value).toBeUndefined();
});

test("required with maybeNull", async () => {
  const M = types.model("M", {
    foo: types.maybeNull(types.number)
  });

  const form = new Form(M, {
    foo: new Field(converters.maybeNull(converters.number), {
      required: true
    })
  });

  const o = M.create({ foo: null });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("");
  expect(field.value).toBeNull();
  await field.setRaw("3");
  expect(field.raw).toEqual("3");
  expect(field.value).toEqual(3);
  await field.setRaw("");
  expect(field.error).toEqual("Required");
  expect(field.value).toBeNull();
});

test("setting value on model will update form", async () => {
  const M = types
    .model("M", {
      foo: types.string
    })
    .actions(self => ({
      update(value: string) {
        self.foo = value;
      }
    }));

  const form = new Form(M, {
    foo: new Field(converters.string)
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

test("no validation before save", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string, {
      validators: [value => value !== "correct" && "Wrong"]
    })
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o, { validation: { beforeSave: "no" } });

  const field = state.field("foo");

  // no validation messages before save
  expect(field.raw).toEqual("FOO");
  await field.setRaw("incorrect");
  expect(field.raw).toEqual("incorrect");
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual("FOO");
  await field.setRaw("correct");
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual("correct");
  await field.setRaw("incorrect");
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual("correct");

  const isSaved = await state.save();
  // immediate validation after save
  expect(field.error).toEqual("Wrong");
  expect(isSaved).toBeFalsy();
  await field.setRaw("correct");
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual("correct");
  await field.setRaw("incorrect");
  expect(field.error).toEqual("Wrong");
});

test("no validation after save either", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string, {
      validators: [
        value => value !== "correct" && value !== "clientcorrect" && "Wrong"
      ]
    })
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o, {
    save: async node => {
      if (node.foo !== "correct") {
        return {
          foo: "Server wrong"
        };
      }
      return null;
    },
    validation: {
      beforeSave: "no",
      afterSave: "no"
    }
  });

  const field = state.field("foo");

  // no validation messages before save
  expect(field.raw).toEqual("FOO");
  await field.setRaw("incorrect");
  expect(field.raw).toEqual("incorrect");
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual("FOO");
  await field.setRaw("correct");
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual("correct");
  await field.setRaw("incorrect");
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual("correct");

  let isSaved = await state.save();
  expect(state.saveStatus).toEqual("rightAfter");
  // only a single validation after save
  expect(field.error).toEqual("Wrong");
  expect(isSaved).toBeFalsy();
  // after this we don't see inline errors anymore
  await field.setRaw("correct");
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual("correct");
  await field.setRaw("incorrect");
  expect(field.error).toBeUndefined();

  // we save again, and this time get a server-side error
  await field.setRaw("clientcorrect"); // no client-side problems
  isSaved = await state.save();
  expect(isSaved).toBeFalsy();
  expect(field.error).toEqual("Server wrong");
});

test("model converter", async () => {
  const R = types.model("R", {
    id: types.identifier,
    bar: types.string
  });

  const M = types.model("M", {
    foo: types.reference(R)
  });

  const Root = types.model("Root", {
    entries: types.array(R),
    instance: M
  });

  const root = Root.create({
    entries: [{ id: "1", bar: "correct" }, { id: "2", bar: "incorrect" }],
    instance: { foo: "1" }
  });

  const form = new Form(M, {
    foo: new Field(converters.model(R), {
      validators: [value => value.bar !== "correct" && "Wrong"]
    })
  });

  const r1 = root.entries[0];
  const r2 = root.entries[1];

  const o = root.instance;

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.raw).toEqual(r1);
  await field.setRaw(r2);
  expect(field.raw).toEqual(r2);
  expect(field.error).toEqual("Wrong");
  expect(field.value).toEqual(r1);
  await field.setRaw(r1);
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual(r1);

  // required is implied
  await field.setRaw(null);
  expect(field.error).toEqual("Required");
});

test("model converter with validate does not throw", async () => {
  const R = types.model("R", {
    id: types.identifier,
    bar: types.string
  });

  const M = types.model("M", {
    foo: types.reference(R)
  });

  const Root = types.model("Root", {
    entries: types.array(R),
    instance: M
  });

  const root = Root.create({
    entries: [{ id: "1", bar: "correct" }, { id: "2", bar: "incorrect" }],
    instance: { foo: "1" }
  });

  const form = new Form(M, {
    foo: new Field(converters.model(R))
  });

  const r2 = root.entries[1];

  const o = root.instance;

  const state = form.state(o);
  const field = state.field("foo");

  await field.setRaw(r2);
  expect(field.value).toBe(r2);
  await state.validate();
});

test("model converter maybe", async () => {
  const R = types.model("R", {
    id: types.identifier,
    bar: types.string
  });

  const M = types.model("M", {
    foo: types.maybe(types.reference(R))
  });

  const Root = types.model("Root", {
    entries: types.array(R),
    instance: M
  });

  const root = Root.create({
    entries: [{ id: "1", bar: "correct" }, { id: "2", bar: "incorrect" }],
    instance: { foo: "1" }
  });

  const form = new Form(M, {
    foo: new Field(converters.maybe(converters.model(R)), {
      validators: [
        value => {
          if (value == null) {
            return false;
          }
          return value.bar !== "correct" && "Wrong";
        }
      ]
    })
  });

  const r1 = root.entries[0];
  const r2 = root.entries[1];

  const o = root.instance;

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.raw).toEqual(r1);
  await field.setRaw(r2);
  expect(field.raw).toEqual(r2);
  expect(field.error).toEqual("Wrong");
  expect(field.value).toEqual(r1);
  await field.setRaw(r1);
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual(r1);
  await field.setRaw(null);
  expect(field.error).toBeUndefined();
  expect(field.value).toBeUndefined();
});

test("model converter maybeNull", async () => {
  const R = types.model("R", {
    id: types.identifier,
    bar: types.string
  });

  const M = types.model("M", {
    foo: types.maybeNull(types.reference(R))
  });

  const Root = types.model("Root", {
    entries: types.array(R),
    instance: M
  });

  const root = Root.create({
    entries: [{ id: "1", bar: "correct" }, { id: "2", bar: "incorrect" }],
    instance: { foo: "1" }
  });

  const form = new Form(M, {
    foo: new Field(converters.maybeNull(converters.model(R)), {
      validators: [
        value => {
          if (value == null) {
            return false;
          }
          return value.bar !== "correct" && "Wrong";
        }
      ]
    })
  });

  const r1 = root.entries[0];
  const r2 = root.entries[1];

  const o = root.instance;

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.raw).toEqual(r1);
  await field.setRaw(r2);
  expect(field.raw).toEqual(r2);
  expect(field.error).toEqual("Wrong");
  expect(field.value).toEqual(r1);
  await field.setRaw(r1);
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual(r1);
  await field.setRaw(null);
  expect(field.error).toBeUndefined();
  expect(field.value).toBeNull();
});

test("add mode for flat form, string", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string)
  });

  const o = M.create({ foo: "" });

  const state = form.state(o, { addMode: true });
  const field = state.field("foo");

  expect(field.addMode).toBeTruthy();
  expect(() => field.value).toThrow();
  expect(field.raw).toEqual("");
  await field.setRaw("FOO");
  expect(field.addMode).toBeFalsy();
  expect(field.value).toEqual("FOO");
  expect(field.raw).toEqual("FOO");
});

test("add mode for flat form, string and required", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string, { required: true })
  });

  const o = M.create({ foo: "" });

  const state = form.state(o, { addMode: true });
  const field = state.field("foo");

  expect(field.addMode).toBeTruthy();
  expect(() => field.value).toThrow();
  expect(field.raw).toEqual("");
  await expect(field.setRaw(""));
  expect(field.error).toEqual("Required");
  await field.setRaw("FOO");
  expect(field.addMode).toBeFalsy();
  expect(field.value).toEqual("FOO");
  expect(field.raw).toEqual("FOO");
});

test("add mode for flat form, maybe string", async () => {
  const M = types.model("M", {
    foo: types.maybe(types.string)
  });

  const form = new Form(M, {
    foo: new Field(converters.maybe(converters.string))
  });

  const o = M.create({ foo: undefined });

  const state = form.state(o, { addMode: true });
  const field = state.field("foo");

  expect(() => field.value).toThrow();
  expect(field.addMode).toBeTruthy();
  expect(field.raw).toEqual("");
  await field.setRaw("FOO");
  expect(field.value).toEqual("FOO");
  expect(field.raw).toEqual("FOO");
  expect(field.addMode).toBeFalsy();
  await field.setRaw("");
  expect(field.value).toBeUndefined();
  expect(field.addMode).toBeFalsy();
});

test("add mode for flat form, maybeNull string", async () => {
  const M = types.model("M", {
    foo: types.maybeNull(types.string)
  });

  const form = new Form(M, {
    foo: new Field(converters.maybeNull(converters.string))
  });

  const o = M.create({ foo: null });

  const state = form.state(o, { addMode: true });
  const field = state.field("foo");

  expect(() => field.value).toThrow();
  expect(field.addMode).toBeTruthy();
  expect(field.raw).toEqual("");
  await field.setRaw("FOO");
  expect(field.value).toEqual("FOO");
  expect(field.raw).toEqual("FOO");
  expect(field.addMode).toBeFalsy();
  await field.setRaw("");
  expect(field.value).toEqual(null);
  expect(field.addMode).toBeFalsy();
});

test("add mode for flat form, number", async () => {
  const M = types.model("M", {
    foo: types.number
  });

  const form = new Form(M, {
    foo: new Field(converters.number)
  });

  const o = M.create({ foo: 0 });

  const state = form.state(o, { addMode: true });
  const field = state.field("foo");

  expect(() => field.value).toThrow();
  expect(field.addMode).toBeTruthy();
  expect(field.raw).toEqual("");
  await field.setRaw("3");
  expect(field.value).toEqual(3);
  expect(field.raw).toEqual("3");
  expect(field.addMode).toBeFalsy();
});

test("add mode for flat form, maybeNull number", async () => {
  const M = types.model("M", {
    foo: types.maybeNull(types.number)
  });

  const form = new Form(M, {
    foo: new Field(converters.maybeNull(converters.number))
  });

  const o = M.create({ foo: null });

  const state = form.state(o, { addMode: true });
  const field = state.field("foo");

  expect(field.addMode).toBeTruthy();
  expect(() => field.value).toThrow();
  expect(field.raw).toEqual("");
  await field.setRaw("");
  expect(field.value).toEqual(null);
  expect(field.addMode).toBeFalsy();
  await field.setRaw("3");
  expect(field.value).toEqual(3);
  expect(field.raw).toEqual("3");
  expect(field.addMode).toBeFalsy();
});

test("model converter in add mode", async () => {
  const R = types.model("R", {
    id: types.identifier,
    bar: types.string
  });

  const M = types.model("M", {
    foo: types.reference(R)
  });

  const Root = types.model("Root", {
    entries: types.array(R),
    instance: M
  });

  const root = Root.create({
    entries: [{ id: "1", bar: "correct" }, { id: "2", bar: "incorrect" }],
    instance: { foo: "1" }
  });

  const form = new Form(M, {
    foo: new Field(converters.model(R), {
      required: true,
      validators: [value => value.bar !== "correct" && "Wrong"]
    })
  });

  const r1 = root.entries[0];
  const r2 = root.entries[1];

  const o = root.instance;

  const state = form.state(o, { addMode: true });
  const field = state.field("foo");

  expect(field.addMode).toBeTruthy();
  expect(field.raw).toEqual(null);
  await field.setRaw(r2);
  expect(field.raw).toEqual(r2);
  expect(field.error).toEqual("Wrong");
  expect(field.value).toBe(r1);
  expect(field.addMode).toBeFalsy();
  await field.setRaw(r1);
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual(r1);
  expect(field.addMode).toBeFalsy();

  await field.setRaw(null);
  expect(field.error).toEqual("Required");
});

test("add mode for repeating push", async () => {
  const N = types.model("N", {
    bar: types.number
  });

  const M = types.model("M", {
    foo: types.array(N)
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.number)
    })
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
  await field1.setRaw("3");
  expect(field1.value).toEqual(3);
  expect(field1.raw).toEqual("3");
  expect(field1.addMode).toBeFalsy();
});

test("add mode for repeating push, whole form add mode", async () => {
  const N = types.model("N", {
    bar: types.number
  });

  const M = types.model("M", {
    foo: types.array(N)
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.number)
    })
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
  await field1.setRaw("3");
  expect(field1.value).toEqual(3);
  expect(field1.raw).toEqual("3");
  expect(field1.addMode).toBeFalsy();
});

test("add mode for repeating insert", async () => {
  const N = types.model("N", {
    bar: types.number
  });

  const M = types.model("M", {
    foo: types.array(N)
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.number)
    })
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

  await field0.setRaw("3");
  expect(field0.value).toEqual(3);
  expect(field0.raw).toEqual("3");
  expect(field0.addMode).toBeFalsy();
});

test("add mode validate", async () => {
  const M = types.model("M", {
    foo: types.number
  });

  const form = new Form(M, {
    foo: new Field(converters.number)
  });

  const o = M.create({ foo: 0 });

  const state = form.state(o, { addMode: true });

  const v = await state.validate();
  expect(v).toBeFalsy();

  const field = state.field("foo");
  expect(field.raw).toBe("");
  expect(field.error).toBe("Required");
});

test("a form with a disabled field", async () => {
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
    isDisabled: accessor => accessor.path.startsWith("/foo")
  });
  const fooField = state.field("foo");
  const barField = state.field("bar");

  expect(fooField.disabled).toBeTruthy();
  expect(barField.disabled).toBeFalsy();
});

test("a form with a repeating disabled field", async () => {
  const N = types.model("N", {
    bar: types.string
  });
  const M = types.model("M", {
    foo: types.array(N)
  });

  const form = new Form(M, {
    foo: new RepeatingForm({ bar: new Field(converters.string) })
  });

  const o = M.create({ foo: [{ bar: "BAR" }] });

  const state = form.state(o, {
    isDisabled: accessor => accessor.path === "/foo"
  });
  const repeating = state.repeatingForm("foo");

  expect(repeating.disabled).toBeTruthy();
  expect(repeating.index(0).field("bar").disabled).toBeFalsy();
});

test("a form with a hidden field", async () => {
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
    isHidden: accessor => accessor.path.startsWith("/foo")
  });
  const fooField = state.field("foo");
  const barField = state.field("bar");

  expect(fooField.hidden).toBeTruthy();
  expect(barField.hidden).toBeFalsy();
});

test("a form with a dynamic required field", async () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string)
  });

  const o = M.create({ foo: "FOO", bar: "BAR" });

  let touched = false;

  async function save(data: any) {
    touched = true;
    if (data.foo === "") {
      return { foo: "Required by save" };
    }
    return null;
  }

  const state = form.state(o, {
    isRequired: accessor => accessor.path.startsWith("/foo"),
    save
  });
  const fooField = state.field("foo");
  const barField = state.field("bar");

  expect(fooField.required).toBeTruthy();
  expect(barField.required).toBeFalsy();

  // do something not allowed
  await fooField.setRaw("");
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
  await fooField.setRaw("BAR");
  // editing always wipes out the errors
  expect(fooField.error).toBeUndefined();

  const saved2 = await state.save();
  expect(fooField.error).toBeUndefined();
  expect(saved2).toBeTruthy();
  expect(touched).toBeTruthy();
});

test("a form with a dynamic required that touches value", async () => {
  // there was a very weird bug:
  // the value of foo stays empty even though we update the raw
  // this is triggered by a combination of three things:
  // * isRequired touches acccessor.value
  // * accessor.required is touched
  // * this happens *within an autorun*

  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string)
  });

  const o = M.create({ foo: "" });

  const state = form.state(o, {
    isRequired: accessor => {
      // all we do is touch accessor.value
      const touched = accessor.value;
      return false;
    }
  });
  const fooField = state.field("foo");
  const disposer = autorun(() => {
    const required = fooField.required;
  });
  await fooField.setRaw("BLAH");

  expect(fooField.value).toEqual("BLAH");
  expect(o.foo).toEqual("BLAH");

  disposer();
});

test("a hard required trumps dynamic required", async () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string, { required: true })
  });

  const o = M.create({ foo: "FOO", bar: "BAR" });

  let touched = false;

  const state = form.state(o, {
    isRequired: accessor => accessor.path.startsWith("/foo")
  });
  const fooField = state.field("foo");
  const barField = state.field("bar");

  expect(fooField.required).toBeTruthy();
  expect(barField.required).toBeTruthy();
});

test("a form with a readOnly field", async () => {
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
    isReadOnly: accessor => accessor.path.startsWith("/foo")
  });
  const fooField = state.field("foo");
  const barField = state.field("bar");

  expect(fooField.readOnly).toBeTruthy();
  expect(fooField.inputProps.readOnly).toBeTruthy();

  expect(barField.readOnly).toBeFalsy();
  expect(barField.inputProps.readOnly).toBeUndefined();
});

test("extra validation", async () => {
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
    extraValidation: (accessor, value) => {
      if (accessor.path === "/foo") {
        return value === "Wrong" ? "Wrong!" : false;
      }
      return false;
    }
  });
  const fooField = state.field("foo");
  const barField = state.field("bar");

  await fooField.setRaw("Wrong");
  expect(fooField.error).toEqual("Wrong!");
  await barField.setRaw("Wrong");
  expect(barField.error).toBeUndefined();
});

test("boolean converter", async () => {
  const N = types.model("N", {
    bar: types.boolean
  });
  const M = types.model("M", {
    foo: types.array(N)
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.boolean)
    })
  });

  const o = M.create({ foo: [] });

  const state = form.state(o);
  const forms = state.repeatingForm("foo");
  forms.push({ bar: false });
  expect(forms.length).toBe(1);
  const field = forms.index(0).field("bar");
  expect(field.raw).toEqual(false);
});

test("converter and raw update", async () => {
  // we update the raw when the value is set
  // a converter may not be exactly preserving all input,
  // for instance the number converter turns the string 0.20
  // into 0.2. this would mean that when you type 0.20 it
  // could immediately update the raw to 0.2, which isn't desired
  const M = types.model("M", {
    foo: types.number
  });

  const form = new Form(M, {
    foo: new Field(converters.number)
  });

  const o = M.create({ foo: 0 });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.raw).toEqual("0");
  await field.setRaw("0.20");
  // the value is retained, even though render would result in 0.2
  expect(field.raw).toEqual("0.20");
  expect(field.value).toEqual(0.2);
});

// a way to wait for all promises
function resolved() {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, 0);
  });
}

test("raw update and errors", async () => {
  // could immediately update the raw to 0.2, which isn't desired
  const M = types
    .model("M", {
      foo: types.number
    })
    .actions(self => ({
      update(value: number) {
        self.foo = value;
      }
    }));

  const form = new Form(M, {
    foo: new Field(converters.number, {
      validators: [value => (value > 10 ? "Wrong" : false)]
    })
  });

  const o = M.create({ foo: 0 });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.raw).toEqual("0");
  await field.setRaw("20");
  expect(field.error).toEqual("Wrong");

  o.update(5);
  await resolved();

  expect(field.raw).toEqual("5");
  expect(field.error).toBeUndefined();

  o.update(21);
  await resolved();

  expect(field.raw).toEqual("21");
  expect(field.error).toEqual("Wrong");
});

test("raw update and references", async () => {
  const N = types.model("N", { id: types.identifier, bar: types.number });

  const M = types
    .model("M", {
      foo: types.maybeNull(types.reference(N))
    })
    .actions(self => ({
      update(value: Instance<typeof N>) {
        self.foo = value;
      }
    }));

  const Root = types.model({
    rs: types.array(N),
    m: M
  });

  const form = new Form(M, {
    foo: new Field(converters.object)
  });

  const r = Root.create({
    rs: [{ id: "a", bar: 1 }, { id: "b", bar: 2 }],
    m: { foo: null }
  });
  r.m.update(r.rs[0]);

  const state = form.state(r.m);
  const field = state.field("foo");

  expect(field.raw).toEqual(r.rs[0]);
  r.m.update(r.rs[1]);

  await resolved();

  expect(field.raw).toEqual(r.rs[1]);
});

test("raw update and add form", async () => {
  // could immediately update the raw to 0.2, which isn't desired
  const M = types
    .model("M", {
      foo: types.number
    })
    .actions(self => ({
      update(value: number) {
        self.foo = value;
      }
    }));

  const form = new Form(M, {
    foo: new Field(converters.number)
  });

  const o = M.create({ foo: 0 });

  const state = form.state(o, { addMode: true });
  const field = state.field("foo");

  expect(field.raw).toEqual("");

  // updating a value to the same value shouldn't have an effect
  // on raw
  o.update(0);
  await resolved();

  expect(field.addMode).toBeTruthy();
  expect(field.raw).toEqual("");

  // updating the value to a different value will have effect on raw
  o.update(1);
  await resolved();
  expect(field.addMode).toBeFalsy();
  expect(field.raw).toEqual("1");

  // we can change raw directly
  await field.setRaw("20");
  expect(field.raw).toEqual("20");
  expect(field.addMode).toBeFalsy();

  // even while in add mode, an update to the raw should be an update`
  o.update(21);
  await resolved();

  expect(field.raw).toEqual("21");
});

test("raw update and limited amount of patches", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string)
  });

  const o = M.create({ foo: "first" });
  const state = form.state(o);
  const field = state.field("foo");

  const patches: any = [];
  onPatch(o, patch => {
    patches.push(patch);
  });

  applySnapshot(o, { foo: "second" });
  await resolved();

  expect(patches).toEqual([
    {
      op: "replace",
      path: "/foo",
      value: "second"
    }
  ]);

  applySnapshot(o, { foo: "second" });

  // no patch detected as no value changed
  expect(patches).toEqual([
    {
      op: "replace",
      path: "/foo",
      value: "second"
    }
  ]);
});

test("raw update and multiple accessors", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string)
  });

  const o = M.create({ foo: "first" });
  const state = form.state(o);
  const field = state.field("foo");
  const field2 = state.field("foo");

  const patches: any = [];
  onPatch(o, patch => {
    patches.push(patch);
  });

  applySnapshot(o, { foo: "second" });
  await resolved();

  expect(patches).toEqual([
    {
      op: "replace",
      path: "/foo",
      value: "second"
    }
  ]);

  applySnapshot(o, { foo: "second" });

  // no patch detected as no value changed
  expect(patches).toEqual([
    {
      op: "replace",
      path: "/foo",
      value: "second"
    }
  ]);
});

test("focus hook", async () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string)
  });

  const o = M.create({ foo: "FOO", bar: "BAR" });

  const focused: any[] = [];

  const state = form.state(o, {
    focus: (ev, accessor) => {
      focused.push({
        raw: accessor.raw,
        value: accessor.value,
        name: accessor.name
      });
    }
  });

  const fooField = state.field("foo");
  expect(fooField.inputProps.onFocus).toBeDefined();

  fooField.handleFocus(null);

  const barField = state.field("bar");
  barField.handleFocus(null);

  expect(focused).toEqual([
    { name: "foo", raw: "FOO", value: "FOO" },
    { name: "bar", raw: "BAR", value: "BAR" }
  ]);

  // no focus hook
  const state2 = form.state(o);
  const fooField2 = state2.field("foo");
  expect(fooField2.inputProps.onFocus).toBeUndefined();
});

test("blur hook", async () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string)
  });

  const o = M.create({ foo: "FOO", bar: "BAR" });

  const blurred: any[] = [];

  const state = form.state(o, {
    blur: (ev, accessor) => {
      blurred.push({
        raw: accessor.raw,
        value: accessor.value,
        name: accessor.name
      });
    }
  });

  const fooField = state.field("foo");
  expect(fooField.inputProps.onBlur).toBeDefined();

  fooField.handleBlur(null);

  const barField = state.field("bar");
  barField.handleBlur(null);

  expect(blurred).toEqual([
    { name: "foo", raw: "FOO", value: "FOO" },
    { name: "bar", raw: "BAR", value: "BAR" }
  ]);

  // no blur hook
  const state2 = form.state(o);
  const fooField2 = state2.field("foo");
  expect(fooField2.inputProps.onBlur).toBeUndefined();
});

test("update hook", async () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string)
  });

  const o = M.create({ foo: "FOO", bar: "BAR" });

  const updated: any[] = [];

  const state = form.state(o, {
    update: accessor => {
      updated.push({
        raw: accessor.raw,
        value: accessor.value,
        name: accessor.name
      });
    }
  });

  const fooField = state.field("foo");
  const barField = state.field("bar");
  await fooField.setRaw("FOO!");
  await barField.setRaw("BAR!");

  expect(updated).toEqual([
    { name: "foo", raw: "FOO!", value: "FOO!" },
    { name: "bar", raw: "BAR!", value: "BAR!" }
  ]);
});

test("string is trimmed", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string)
  });

  const o = M.create({ foo: "  FOO" });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.raw).toEqual("  FOO");
  await field.setRaw("  FOO");
  expect(field.value).toEqual("FOO");

  await field.setRaw("BAR  ");
  expect(field.raw).toEqual("BAR  ");
  expect(field.value).toEqual("BAR");
  await field.setRaw("  BAR");
  expect(field.value).toEqual("BAR");
});

test("string is trimmed and save", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const o = M.create({ foo: "  FOO" });

  const form = new Form(M, {
    foo: new Field(converters.string)
  });

  let saved = null;
  async function save(data: any) {
    saved = data;
    return null;
  }

  const state = form.state(o, { save });

  const field = state.field("foo");

  await state.save();
  expect(field.value).toEqual("FOO");
  expect(saved).toEqual({ foo: "FOO" });
});

test("form with thousandSeparator . and empty decimalSeparator invalid", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const o = M.create({ foo: "3000" });

  const form = new Form(M, {
    foo: new Field(converters.decimal())
  });

  expect(() => {
    form.state(o, {
      converterOptions: { thousandSeparator: "." }
    });
  }).toThrow();
});

test("form with thousandSeparator and decimalSeparator same value invalid", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const o = M.create({ foo: "3000" });

  const form = new Form(M, {
    foo: new Field(converters.decimal())
  });

  expect(() => {
    form.state(o, {
      converterOptions: {
        thousandSeparator: ",",
        decimalSeparator: ","
      }
    });
  }).toThrow();
});

test("blur hook with postprocess", async () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.decimal({ decimalPlaces: 2, addZeroes: true }), {
      postprocess: true
    }),
    bar: new Field(converters.string)
  });

  const o = M.create({ foo: "4314314", bar: "BAR" });

  const state = form.state(o, {
    converterOptions: {
      thousandSeparator: ".",
      decimalSeparator: ",",
      renderThousands: true
    }
  });

  const fooField = state.field("foo");
  expect(fooField.inputProps.onBlur).toBeDefined();
  await fooField.setRaw("4314314");
  fooField.handleBlur(null);
  expect(fooField.raw).toEqual("4.314.314,00");

  const barField = state.field("bar");
  expect(barField.inputProps.onBlur).toBeUndefined();
});

test("blur hook no postprocess with error", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.decimal({ decimalPlaces: 2, addZeroes: true }), {
      postprocess: true
    })
  });

  const o = M.create({ foo: "4314314" });

  const state = form.state(o, {
    converterOptions: {
      thousandSeparator: ".",
      decimalSeparator: ",",
      renderThousands: true
    }
  });

  const fooField = state.field("foo");
  expect(fooField.inputProps.onBlur).toBeDefined();
  await fooField.setRaw("4314314,0000");
  fooField.handleBlur(null);
  expect(fooField.raw).toEqual("4314314,0000");
});

test("blur hook with postprocess maybe field", async () => {
  const M = types.model("M", {
    foo: types.maybeNull(types.string)
  });

  const form = new Form(M, {
    foo: new Field(
      converters.maybeNull(
        converters.decimal({ decimalPlaces: 2, addZeroes: true })
      ),
      {
        postprocess: true
      }
    )
  });

  const o = M.create({ foo: "4314314" });

  const state = form.state(o, {
    converterOptions: {
      thousandSeparator: ".",
      decimalSeparator: ",",
      renderThousands: true
    }
  });

  const fooField = state.field("foo");
  expect(fooField.inputProps.onBlur).toBeDefined();
  await fooField.setRaw("4314314");
  fooField.handleBlur(null);
  expect(fooField.raw).toEqual("4.314.314,00");
});

test("setValueAndUpdateRaw", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const o = M.create({ foo: "" });

  const form = new Form(M, {
    foo: new Field(converters.decimal())
  });

  const state = form.state(o, {
    converterOptions: {
      thousandSeparator: ".",
      decimalSeparator: ",",
      renderThousands: true
    }
  });

  // Setting the raw directly would update the value without relying on other event handlers
  const field = state.field("foo");

  await field.setRaw("1234,56");
  expect(field.raw).toEqual("1234,56");
  expect(field.value).toEqual("1234.56");

  // Instead, we set the value and update the raw based on the value
  await field.setValueAndUpdateRaw("6543.21");
  expect(field.raw).toEqual("6.543,21");
  expect(field.value).toEqual("6543.21");
});

test("repeatingField disabled when repeatingForm disabled", async () => {
  const N = types.model("N", {
    repeatingField: types.string
  });

  const M = types.model("M", {
    repeating: types.array(N)
  });

  const form = new Form(M, {
    repeating: new RepeatingForm({
      repeatingField: new Field(converters.string)
    })
  });

  const o = M.create({
    repeating: [{ repeatingField: "REPEATING_FIELD" }]
  });

  const state = form.state(o, {
    isDisabled: accessor => accessor.path === "/repeating"
  });

  const repeating = state.repeatingForm("repeating");
  const repeatingIndex = repeating.index(0);
  const repeatingField = repeatingIndex.field("repeatingField");

  expect(repeating.disabled).toBeTruthy();
  expect(repeatingIndex.disabled).toBeTruthy();
  expect(repeatingField.disabled).toBeTruthy();
});
