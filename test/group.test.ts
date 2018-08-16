import { configure } from "mobx";
import { types } from "mobx-state-tree";
import { Field, Form, Group, RepeatingForm, converters } from "../src";

configure({ enforceActions: true });

test("a group form", async () => {
  const M = types.model("M", {
    foo: types.number,
    bar: types.number,
    baz: types.number,
    qux: types.number
  });

  const form = new Form(M, {
    foo: new Field(converters.number),
    bar: new Field(converters.number),
    baz: new Field(converters.number),
    qux: new Field(converters.number)
  });

  const aGroup = new Group(M, ["foo", "bar"]);
  const bGroup = new Group(M, ["baz", "qux"]);

  const o = M.create({ foo: 1, bar: 2, baz: 3, qux: 4 });

  const state = form.state(o);

  const groupAState = aGroup.access(state);

  const field = groupAState.field("foo");

  expect(field.raw).toEqual("1");
  await field.setRaw("10");
  expect(field.raw).toEqual("10");
  expect(field.value).toEqual(10);
  expect(groupAState.isValid).toBeTruthy();
  expect(await groupAState.validate()).toBeTruthy();

  expect(() => groupAState.field("baz")).toThrow();
  expect(() => groupBState.field("foo")).toThrow();

  const groupBState = bGroup.access(state);

  const field2 = groupBState.field("baz");

  expect(field2.raw).toEqual("3");
  await field2.setRaw("30");
  expect(field2.raw).toEqual("30");
  expect(field2.value).toEqual(30);
  expect(groupBState.isValid).toBeTruthy();
  expect(await groupBState.validate()).toBeTruthy();

  // now let's make B invalid but A is still valid
  await field2.setRaw("illegal");
  expect(groupBState.isValid).toBeFalsy();
  expect(groupAState.isValid).toBeTruthy();
  expect(await groupBState.validate()).toBeFalsy();
  expect(await groupAState.validate()).toBeTruthy();
});

test("group repeating form", async () => {
  const N = types.model("N", {
    a: types.string,
    b: types.number,
    c: types.string,
    d: types.number
  });

  const M = types.model("M", {
    foo: types.array(N)
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      a: new Field(converters.string),
      b: new Field(converters.number),
      c: new Field(converters.string),
      d: new Field(converters.number)
    })
  });

  const groupAB = new Group(N, ["a", "b"]);
  const groupCD = new Group(N, ["c", "d"]);

  const o = M.create({ foo: [{ a: "A", b: 1, c: "C", d: 2 }] });

  const state = form.state(o);

  const forms = state.repeatingForm("foo");
  const oneForm = forms.index(0);

  const oneFormAB = groupAB.access(oneForm);
  const field = oneFormAB.field("b");

  expect(field.raw).toEqual("1");
  await field.setRaw("10");
  expect(field.raw).toEqual("10");
  expect(field.value).toEqual(10);

  const oneFormCD = groupCD.access(oneForm);

  expect(await oneFormAB.validate()).toBeTruthy();
  expect(await oneFormCD.validate()).toBeTruthy();

  await field.setRaw("illegal");
  expect(await oneFormAB.validate()).toBeFalsy();
  expect(await oneFormCD.validate()).toBeTruthy();
});
