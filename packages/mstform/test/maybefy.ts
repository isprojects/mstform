import { types, typecheck } from "mobx-state-tree";
import { maybefy } from "../src";

test("number field", () => {
  const M = types.model("M", {
    foo: types.number
  });
  const Maybefied = maybefy(M);
  Maybefied.create({ foo: null });
  Maybefied.create({ foo: 3 });
});

test("string field", () => {
  const M = types.model("M", {
    foo: types.string
  });
  const Maybefied = maybefy(M);
  // expect(() => {
  //   typecheck(Maybefied, { foo: null });
  // }).toThrow();
  Maybefied.create({ foo: "bar" });
});

test("subobject", () => {
  const N = types.model("N", {
    bar: types.number
  });
  const M = types.model("M", {
    foo: N
  });
  const Maybefied = maybefy(M);
  // expect(() => {
  //   typecheck(Maybefied, { foo: null });
  // }).toThrow();

  Maybefied.create({ foo: { bar: null } });
  Maybefied.create({ foo: { bar: 3 } });
});

test("array field with numbers", () => {
  const M = types.model("M", {
    foo: types.array(types.number)
  });
  const Maybefied = maybefy(M);
  // expect(() => {
  //   typecheck(Maybefied, { foo: null });
  // }).toThrow();

  Maybefied.create({ foo: [null] });
  Maybefied.create({ foo: [456, 789] });
});

test("array field with strings", () => {
  const M = types.model("M", {
    foo: types.array(types.string)
  });
  const Maybefied = maybefy(M);
  // expect(() => {
  //   typecheck(Maybefied, { foo: null });
  // }).toThrow();
  // expect(() => {
  //   typecheck(Maybefied, { foo: [null] });
  // }).toThrow();

  Maybefied.create({ foo: ["FOO", "BAR"] });
});

test("array field with objects", () => {
  const N = types.model("N", {
    bar: types.number
  });
  const M = types.model("M", {
    foo: types.array(N)
  });
  const Maybefied = maybefy(M);
  // expect(() => {
  //   typecheck(Maybefied, { foo: null });
  // }).toThrow();

  // expect(() => {
  //   typecheck(M, Maybefied.create({ foo: [null] }));
  // }).toThrow();

  Maybefied.create({ foo: [{ bar: null }, { bar: null }] });
  Maybefied.create({ foo: [{ bar: 456 }, { bar: 789 }] });
});

test("map field with numbers", () => {
  const M = types.model("M", {
    foo: types.map(types.number)
  });
  const Maybefied = maybefy(M);
  // expect(() => {
  //   typecheck(Maybefied, { foo: null });
  // }).toThrow();

  Maybefied.create({ foo: { x: null } });
  Maybefied.create({ foo: { x: 123 } });
});

test("map field with strings", () => {
  const M = types.model("M", {
    foo: types.map(types.string)
  });
  const Maybefied = maybefy(M);
  // expect(() => {
  //   typecheck(Maybefied, { foo: null });
  // }).toThrow();
  // expect(() => {
  //   typecheck(Maybefied, { foo: { x: null } });
  // }).toThrow();

  Maybefied.create({ foo: { x: "FOO" } });
});

test("map field with objects", () => {
  const N = types.model("N", {
    bar: types.number
  });
  const M = types.model("M", {
    foo: types.map(N)
  });
  const Maybefied = maybefy(M);
  // expect(() => {
  //   typecheck(Maybefied, { foo: null });
  // }).toThrow();

  // expect(() => {
  //   typecheck(M, Maybefied.create({ foo: { x: null } }));
  // }).toThrow();

  Maybefied.create({ foo: { x: { bar: null }, y: { bar: null } } });
  Maybefied.create({ foo: { x: { bar: 456 }, y: { bar: 789 } } });
});

test("already maybe field", () => {
  const M = types.model("M", {
    foo: types.maybe(types.number)
  });
  const Maybefied = maybefy(M);
  Maybefied.create({ foo: null });
  Maybefied.create({ foo: 3 });
});

test("another kind of union", () => {
  const M = types.model("M", {
    foo: types.union(types.number, types.string)
  });
  const Maybefied = maybefy(M);
  Maybefied.create({ foo: null });
  Maybefied.create({ foo: 3 });
  Maybefied.create({ foo: "foo" });
});
