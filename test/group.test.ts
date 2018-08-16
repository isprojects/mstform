import { configure } from "mobx";
import { types } from "mobx-state-tree";
import { Field, Form, Group, converters } from "../src";

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
  expect(await groupAState.validate()).toBeTruthy();

  expect(() => groupAState.field("baz")).toThrow();
  expect(() => groupBState.field("foo")).toThrow();

  const groupBState = bGroup.access(state);

  const field2 = groupBState.field("baz");

  expect(field2.raw).toEqual("3");
  await field2.setRaw("30");
  expect(field2.raw).toEqual("30");
  expect(field2.value).toEqual(30);
  expect(await groupBState.validate()).toBeTruthy();

  // now let's make B invalid but A is still valid
  await field2.setRaw("illegal");
  expect(await groupBState.validate()).toBeFalsy();
  expect(await groupAState.validate()).toBeTruthy();
});
