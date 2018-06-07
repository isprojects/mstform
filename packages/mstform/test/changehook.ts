import { configure, IReactionDisposer } from "mobx";
import { getSnapshot, types } from "mobx-state-tree";
import { Converter, Field, Form, RepeatingForm, converters } from "../src";

test("changehook", async () => {
  const M = types
    .model("M", {
      a: types.number,
      b: types.number
    })
    .actions(self => ({
      setB(value: number) {
        self.b = value;
      }
    }));

  const form = new Form(M, {
    a: new Field(converters.number, {
      change: (node, value) => {
        node.setB(value);
      }
    }),
    b: new Field(converters.number)
  });

  const o = M.create({ a: 1, b: 2 });

  const state = form.state(o);
  const a = state.field("a");
  const b = state.field("b");

  // we set it to 4 explicitly
  await a.setRaw("4");
  expect(b.raw).toEqual("4");
  // this immediately affects the underlying value
  expect(b.value).toEqual(4);

  // when we change it to something unvalid, change hook doesn't fire
  await a.setRaw("invalid");
  expect(b.raw).toEqual("4");
  expect(b.value).toEqual(4);

  await a.setRaw("17");
  expect(b.raw).toEqual("17");
  expect(b.value).toEqual(17);
});
