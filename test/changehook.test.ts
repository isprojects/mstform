import { configure } from "mobx";
import { types } from "mobx-state-tree";
import { Field, Form, converters } from "../src";

configure({ enforceActions: "always" });

test("changehook", () => {
  const M = types
    .model("M", {
      c: types.number,
      b: types.number,
    })
    .actions((self) => ({
      setB(value: number) {
        self.b = value;
      },
    }));

  const touched: boolean[] = [];

  const form = new Form(M, {
    c: new Field(converters.number, {
      change: (node, value) => {
        touched.push(true);
        node.setB(value);
      },
    }),
    b: new Field(converters.number),
  });

  const o = M.create({ c: 1, b: 2 });

  const state = form.state(o);
  const c = state.field("c");
  const b = state.field("b");

  // we set it to 4 explicitly
  c.setRaw("4");
  expect(b.raw).toEqual("4");
  // this immediately affects the underlying value
  expect(b.value).toEqual(4);

  // when we change it to something invalid, change hook doesn't fire
  c.setRaw("invalid");
  expect(b.raw).toEqual("4");
  expect(b.value).toEqual(4);

  c.setRaw("17");
  expect(b.raw).toEqual("17");
  expect(b.value).toEqual(17);

  // we change b independently
  b.setRaw("23");
  expect(b.raw).toEqual("23");

  let prevLength = touched.length;
  // validation shouldn't modify the value (it calls setRaw)
  state.validate();
  expect(touched.length).toEqual(prevLength);
  expect(b.raw).toEqual("23");
  expect(b.value).toEqual(23);

  // a modification of `c` to the same value shouldn't modify the value either
  prevLength = touched.length;
  c.setRaw("17");
  expect(touched.length).toEqual(prevLength);
  expect(b.raw).toEqual("23");
  expect(b.value).toEqual(23);
});

test("change hook with raw value", () => {
  const M = types
    .model("M", {
      c: types.number,
      b: types.number,
    })
    .actions((self) => ({
      setB(value: number) {
        self.b = value;
      },
    }));

  const touched: boolean[] = [];

  const form = new Form(M, {
    c: new Field(converters.number, {
      change: (node, value) => {
        touched.push(true);
        node.setB(value);
      },
    }),
    b: new Field(converters.number),
  });

  const o = M.create({ c: 1, b: 2 });

  const state = form.state(o);
  const c = state.field("c");
  const b = state.field("b");

  // first we modify the raw value of b
  b.setRaw("17");

  // we set then set c to 4 explicitly
  c.setRaw("4");
  // the raw should also be changed
  expect(b.raw).toEqual("4");
  expect(b.value).toEqual(4);
});

test("changehook with null", () => {
  const M = types
    .model("M", {
      c: types.maybeNull(types.number),
      b: types.maybeNull(types.number),
    })
    .actions((self) => ({
      setB(value: number) {
        self.b = value;
      },
    }));

  const touched: boolean[] = [];

  const form = new Form(M, {
    c: new Field(converters.maybeNull(converters.number), {
      change: (node, value) => {
        touched.push(true);
        node.setB(value);
      },
    }),
    b: new Field(converters.maybeNull(converters.number)),
  });

  const o = M.create({ c: 1, b: 2 });

  const state = form.state(o);
  const c = state.field("c");
  const b = state.field("b");

  // we set it to 4 explicitly
  c.setRaw("4");
  expect(b.raw).toEqual("4");
  // this immediately affects the underlying value
  expect(b.value).toEqual(4);

  // when we change it to something invalid, change hook doesn't fire
  c.setRaw("invalid");
  expect(b.raw).toEqual("4");
  expect(b.value).toEqual(4);

  // now we set it to null, change hook fires
  c.setRaw("");
  expect(b.raw).toEqual("");
  expect(b.value).toEqual(null);
});

test("changehook doesn't fire if nothing changed", () => {
  const M = types
    .model("M", {
      c: types.number,
      b: types.number,
    })
    .actions((self) => ({
      setB(value: number) {
        self.b = value;
      },
    }));

  const touched: boolean[] = [];

  const form = new Form(M, {
    c: new Field(converters.number, {
      change: (node, value) => {
        touched.push(true);
        node.setB(value);
      },
    }),
    b: new Field(converters.number),
  });

  const o = M.create({ c: 1, b: 2 });

  const state = form.state(o);
  const c = state.field("c");
  const b = state.field("b");

  // we set it to 1 explicitly
  c.setRaw("1");
  expect(b.raw).toEqual("2");
  expect(touched.length).toEqual(0);
});

test("changehook doesn't fire if nothing functionally changed", () => {
  const M = types
    .model("M", {
      c: types.string,
      b: types.string,
    })
    .actions((self) => ({
      setB(value: string) {
        self.b = value;
      },
    }));

  const touched: boolean[] = [];

  const form = new Form(M, {
    c: new Field(converters.stringDecimal, {
      change: (node, value) => {
        touched.push(true);
        node.setB(value);
      },
    }),
    b: new Field(converters.stringDecimal),
  });

  const o = M.create({ c: "1.00", b: "2.00" });

  const state = form.state(o);
  const c = state.field("c");
  const b = state.field("b");

  // we set the raw to 1.000 explicitly, which is a technical change but not a functional change
  // we do not expect "touched" to be triggered
  c.setRaw("1.000");
  expect(c.raw).toEqual("1.000"); // Changed value
  expect(b.raw).toEqual("2.00"); // Not changed
  expect(touched.length).toEqual(0); // Not touched

  // we set the value to 1.000 explicitly, which is a technical change but not a functional change
  // we do not expect "touched" to be triggered
  c.setValue("1.000");
  expect(c.raw).toEqual("1.000"); // Did not change value
  expect(b.raw).toEqual("2.00"); // Not changed
  expect(touched.length).toEqual(0); // Not touched

  // we set the raw to 2.00 explicitly, which is a change
  // we do expect "touched" to be triggered
  c.setRaw("2.00");
  expect(c.raw).toEqual("2.00"); // Changed value
  expect(b.raw).toEqual("2.00"); // Changed
  expect(touched.length).toEqual(1); // Touched

  // we set the raw to 3.00 explicitly, which is a change
  // we do expect "touched" to be triggered
  c.setValue("3.00");
  expect(c.raw).toEqual("2.00"); // We updated the value, but not the raw
  expect(b.raw).toEqual("3.00"); // Changed
  expect(touched.length).toEqual(2); // Touched
});

test("changehook doesn't fire if nothing changed with required", () => {
  const M = types
    .model("M", {
      c: types.string,
      b: types.string,
    })
    .actions((self) => ({
      setB(value: string) {
        self.b = value;
      },
    }));

  const touched: boolean[] = [];

  const form = new Form(M, {
    c: new Field(converters.string, {
      change: (node, value) => {
        touched.push(true);
        node.setB("touched");
      },
      required: true,
    }),
    b: new Field(converters.string),
  });

  const o = M.create({ c: "", b: "B" });

  const state = form.state(o);
  const c = state.field("c");
  const b = state.field("b");
  // confirm we start with B
  expect(b.raw).toEqual("B");

  // we set it to same value explicitly
  c.setRaw("");
  // the value should be untouched
  expect(b.raw).toEqual("B");
  expect(touched.length).toEqual(0);

  // When we change the calue to something else
  c.setRaw("X");
  expect(b.raw).toEqual("touched");
  expect(touched.length).toEqual(1); // Touched
});
