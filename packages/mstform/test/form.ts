import { configure } from "mobx";
import { types } from "mobx-state-tree";
import { Converter, Field, Form, RepeatingForm, converters } from "../src";

configure({ enforceActions: "strict" });

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

  const state = form.create(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("FOO");
  await field.handleChange("BAR");
  expect(field.raw).toEqual("BAR");
  expect(field.error).toEqual("Wrong");
  expect(field.value).toEqual("FOO");
  await field.handleChange("correct");
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual("correct");
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

  const state = form.create(o);

  const field = state.field("foo");

  expect(field.raw).toEqual(["FOO"]);
  await field.handleChange(["BAR", "QUX"]);
  expect(field.raw).toEqual(["BAR", "QUX"]);
  expect(field.error).toEqual("Wrong");
  expect(field.value).toEqual(["FOO"]);
  await field.handleChange(["correct"]);
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

  const state = form.create(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("3");
  await field.handleChange("4");
  expect(field.raw).toEqual("4");
  expect(field.value).toEqual(4);
  expect(field.error).toBeUndefined();
  await field.handleChange("not a number");
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

  const state = form.create(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("3");
  await field.handleChange("4");
  expect(field.raw).toEqual("4");
  expect(field.value).toEqual(4);
  expect(field.error).toBeUndefined();
  await field.handleChange("not a number");
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

  const state = form.create(o);

  const forms = state.repeatingForm("foo");
  const oneForm = forms.index(0);
  const field = oneForm.field("bar");

  expect(field.raw).toEqual("BAR");
  await field.handleChange("QUX");
  expect(field.raw).toEqual("QUX");
  expect(field.value).toEqual("QUX");
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

  const state = form.create(o);

  const forms = state.repeatingForm("foo");
  const oneForm = forms.index(0);
  const field = oneForm.field("bar");

  expect(field.raw).toEqual("3");
  await field.handleChange("4");
  expect(field.raw).toEqual("4");
  expect(field.value).toEqual(4);
  await field.handleChange("not a number");
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

  const state = form.create(o);

  const forms = state.repeatingForm("foo");
  expect(forms.length).toBe(1);
  forms.push({ bar: "QUX" });
  expect(forms.length).toBe(2);

  const oneForm = forms.index(1);
  const field = oneForm.field("bar");

  expect(field.raw).toEqual("QUX");
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

  const state = form.create(o);

  const forms = state.repeatingForm("foo");
  expect(forms.length).toBe(1);
  forms.insert(0, { bar: "QUX" });
  expect(forms.length).toBe(2);

  const oneForm = forms.index(0);
  const field = oneForm.field("bar");

  expect(field.raw).toEqual("QUX");
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

  const state = form.create(o);

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

  const state = form.create(o);

  const forms = state.repeatingForm("foo");
  const field0 = forms.index(0).field("bar");
  await field0.setRaw("incorrect");
  expect(field0.error).toEqual("wrong");

  forms.remove(o.foo[0]);

  forms.push({ bar: "correct" });
  const field1 = forms.index(0).field("bar");
  expect(field1.error).toBeUndefined();
});

test("async validation in converter", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const done: any[] = [];

  const converter = new Converter<string, string>({
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

  const state = form.create(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("FOO");
  const promise = field.handleChange("correct");
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
  const promise2 = field.handleChange("wrong");
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

  const state = form.create(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("FOO");
  const promise = field.handleChange("correct");
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
  const promise2 = field.handleChange("wrong");
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

  const state = form.create(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("FOO");
  const promise = field.handleChange("correct");
  expect(field.raw).toEqual("correct");
  // value hasn't changed yet as promise hasn't resolved yet
  expect(state.isValidating).toBeTruthy();
  expect(field.isValidating).toBeTruthy();
  expect(field.value).toEqual("FOO");
  expect(field.error).toBeUndefined();
  // now we change the raw while waiting
  const promise2 = field.handleChange("incorrect");
  process.nextTick(() => {
    done[0]();
  });
  await promise;
  expect(state.isValidating).toBeTruthy();
  expect(field.isValidating).toBeTruthy();
  expect(field.raw).toEqual("incorrect");
  expect(field.value).toEqual("FOO");
  expect(field.error).toBeUndefined();
  process.nextTick(() => {
    done[1]();
  });
  await promise2;
  expect(state.isValidating).toBeFalsy();
  expect(field.isValidating).toBeFalsy();
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

  const state = form.create(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("FOO");
  const promise = field.handleChange("correct");
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

  const state = form.create(o);

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

  const state = form.create(o);

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

  const state = form.create(o);

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

  const state = form.create(o);
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

  const o = M.create({ foo: [{ bar: "FOO" }] });

  const state = form.create(o);
  state.setErrors({ foo: [{ bar: "WRONG" }] });

  const field = state.repeatingForm("foo").accessors[0].field("bar");
  expect(field.error).toEqual("WRONG");
});

test("setErrors directly on repeating", async () => {
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

  const o = M.create({ foo: [{ bar: "FOO" }] });

  const state = form.create(o);
  state.setErrors({ foo: "WRONG" });

  const accessor = state.repeatingForm("foo");
  expect(accessor.error).toEqual("WRONG");
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
      return { foo: "Required" };
    }
    return null;
  }

  const state = form.create(o, { save });

  const field = state.field("foo");

  // do something not allowed
  await field.setRaw("");

  // we don't see any client-side validation errors
  expect(o.foo).toEqual("");
  expect(field.error).toBeUndefined();
  // now communicate with the server by doing the save
  const saveResult0 = await state.save();
  expect(saveResult0).toBe(false);
  expect(field.error).toEqual("Required");

  // correct things
  await field.setRaw("BAR");
  expect(o.foo).toEqual("BAR");
  // editing always wipes out the errors
  expect(field.error).toBeUndefined();

  const saveResult1 = await state.save();
  expect(saveResult1).toBe(true);

  expect(field.error).toBeUndefined();
});

test("not required", async () => {
  const M = types.model("M", {
    foo: types.maybe(types.number)
  });

  const form = new Form(M, {
    foo: new Field(converters.maybe(converters.number), {
      required: false
    })
  });

  const o = M.create({ foo: null });

  const state = form.create(o);

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

  const state = form.create(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("3");
  expect(field.value).toEqual(3);
  await field.setRaw("");
  expect(field.error).toEqual("Required");
  expect(field.value).toEqual(3);
});

test("not required with maybe", async () => {
  const M = types.model("M", {
    foo: types.maybe(types.number)
  });

  const form = new Form(M, {
    foo: new Field(converters.maybe(converters.number), {
      required: true
    })
  });

  const o = M.create({ foo: null });

  const state = form.create(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("");
  expect(field.value).toBeNull();
  await field.setRaw("3");
  expect(field.raw).toEqual("3");
  expect(field.value).toEqual(3);
  await field.setRaw("");
  expect(field.error).toEqual("Required");
  expect(field.value).toEqual(3);
});

test("override getRaw", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string, {
      validators: [value => value !== "correct" && "Wrong"],
      getRaw(event) {
        return event.target.value;
      }
    })
  });

  const o = M.create({ foo: "FOO" });

  const state = form.create(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("FOO");
  await field.handleChange({ target: { value: "BAR" } });
  expect(field.raw).toEqual("BAR");
  expect(field.error).toEqual("Wrong");
  expect(field.value).toEqual("FOO");
  await field.handleChange({ target: { value: "correct" } });
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual("correct");
});

test("getRaw fromEvent", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string, {
      validators: [value => value !== "correct" && "Wrong"],
      fromEvent: true
    })
  });

  const o = M.create({ foo: "FOO" });

  const state = form.create(o);

  const field = state.field("foo");

  expect(field.raw).toEqual("FOO");
  await field.handleChange({ target: { value: "BAR" } });
  expect(field.raw).toEqual("BAR");
  expect(field.error).toEqual("Wrong");
  expect(field.value).toEqual("FOO");
  await field.handleChange({ target: { value: "correct" } });
  expect(field.error).toBeUndefined();
  expect(field.value).toEqual("correct");
});
