import { configure } from "mobx";
import { types } from "mobx-state-tree";
import { Field, Form, Group, SubForm, RepeatingForm, converters } from "../src";

// "always" leads to trouble during initialization.
configure({ enforceActions: "observed" });

test("groups basic", () => {
  const M = types.model("M", {
    a: types.number,
    b: types.number,
    c: types.number,
    d: types.number
  });

  const form = new Form(
    M,
    {
      a: new Field(converters.number),
      b: new Field(converters.number),
      c: new Field(converters.number),
      d: new Field(converters.number)
    },
    {
      one: new Group({ include: ["a", "b"] }),
      two: new Group({ include: ["c", "d"] })
    }
  );

  const o = M.create({ a: 1, b: 2, c: 3, d: 4 });

  const state = form.state(o);
  const a = state.field("a");
  const b = state.field("b");
  const c = state.field("c");
  const d = state.field("d");
  const one = state.group("one");
  const two = state.group("two");

  a.setRaw("wrong");
  expect(one.isValid).toBeFalsy();
  expect(two.isValid).toBeTruthy();

  c.setRaw("wrong too");
  expect(one.isValid).toBeFalsy();
  expect(two.isValid).toBeFalsy();

  a.setRaw("10");
  c.setRaw("30");

  expect(one.isValid).toBeTruthy();
  expect(two.isValid).toBeTruthy();
});

test("groups exclude", () => {
  const M = types.model("M", {
    a: types.number,
    b: types.number,
    c: types.number,
    d: types.number
  });

  const form = new Form(
    M,
    {
      a: new Field(converters.number),
      b: new Field(converters.number),
      c: new Field(converters.number),
      d: new Field(converters.number)
    },
    {
      one: new Group({ exclude: ["a", "b"] }),
      two: new Group({ exclude: ["c", "d"] })
    }
  );

  const o = M.create({ a: 1, b: 2, c: 3, d: 4 });

  const state = form.state(o);
  const a = state.field("a");
  const b = state.field("b");
  const c = state.field("c");
  const d = state.field("d");
  const one = state.group("one");
  const two = state.group("two");

  a.setRaw("wrong");
  expect(one.isValid).toBeTruthy();
  expect(two.isValid).toBeFalsy();

  c.setRaw("wrong too");
  expect(one.isValid).toBeFalsy();
  expect(two.isValid).toBeFalsy();

  a.setRaw("10");
  c.setRaw("30");

  expect(one.isValid).toBeTruthy();
  expect(two.isValid).toBeTruthy();
});

test("groups sub form", () => {
  const N = types.model("N", {
    a: types.number,
    b: types.number,
    c: types.number,
    d: types.number
  });

  const M = types.model("M", {
    field: types.number,
    item: N
  });

  const form = new Form(
    M,
    {
      field: new Field(converters.number),
      item: new SubForm(
        {
          a: new Field(converters.number),
          b: new Field(converters.number),
          c: new Field(converters.number),
          d: new Field(converters.number)
        },
        {
          one: new Group({ include: ["a", "b"] }),
          two: new Group({ include: ["c", "d"] })
        }
      )
    },
    { whole: new Group({ include: ["item"] }) }
  );

  const o = M.create({ field: 0, item: { a: 1, b: 2, c: 3, d: 4 } });

  const state = form.state(o);
  const field = state.field("field");
  const item = state.subForm("item");
  const whole = state.group("whole");
  const a = item.field("a");
  const b = item.field("b");
  const c = item.field("c");
  const d = item.field("d");
  const one = item.group("one");
  const two = item.group("two");

  a.setRaw("wrong");
  expect(one.isValid).toBeFalsy();
  expect(two.isValid).toBeTruthy();
  expect(whole.isValid).toBeFalsy();

  c.setRaw("wrong too");
  expect(one.isValid).toBeFalsy();
  expect(two.isValid).toBeFalsy();
  expect(whole.isValid).toBeFalsy();

  a.setRaw("10");
  c.setRaw("30");

  expect(one.isValid).toBeTruthy();
  expect(two.isValid).toBeTruthy();
  expect(whole.isValid).toBeTruthy();

  field.setRaw("wrong");
  // whole is not affected as it only is affected by the sub form
  expect(whole.isValid).toBeTruthy();
});

test("groups sub form exclude", () => {
  const N = types.model("N", {
    a: types.number,
    b: types.number,
    c: types.number,
    d: types.number
  });

  const M = types.model("M", {
    field: types.number,
    item: N
  });

  const form = new Form(
    M,
    {
      field: new Field(converters.number),
      item: new SubForm(
        {
          a: new Field(converters.number),
          b: new Field(converters.number),
          c: new Field(converters.number),
          d: new Field(converters.number)
        },
        {
          one: new Group({ exclude: ["a", "b"] }),
          two: new Group({ exclude: ["c", "d"] })
        }
      )
    },
    { whole: new Group({ include: ["item"] }) }
  );

  const o = M.create({ field: 0, item: { a: 1, b: 2, c: 3, d: 4 } });

  const state = form.state(o);
  const field = state.field("field");
  const item = state.subForm("item");
  const whole = state.group("whole");
  const a = item.field("a");
  const b = item.field("b");
  const c = item.field("c");
  const d = item.field("d");
  const one = item.group("one");
  const two = item.group("two");

  a.setRaw("wrong");
  expect(one.isValid).toBeTruthy();
  expect(two.isValid).toBeFalsy();
  expect(whole.isValid).toBeFalsy();

  c.setRaw("wrong too");
  expect(one.isValid).toBeFalsy();
  expect(two.isValid).toBeFalsy();
  expect(whole.isValid).toBeFalsy();

  a.setRaw("10");
  c.setRaw("30");

  expect(one.isValid).toBeTruthy();
  expect(two.isValid).toBeTruthy();
  expect(whole.isValid).toBeTruthy();

  field.setRaw("wrong");
  // whole is not affected as it only is affected by the sub form
  expect(whole.isValid).toBeTruthy();
});

test("groups repeating form", () => {
  const N = types.model("N", {
    a: types.number,
    b: types.number,
    c: types.number,
    d: types.number
  });

  const M = types.model("M", {
    items: types.array(N)
  });

  const form = new Form(M, {
    items: new RepeatingForm(
      {
        a: new Field(converters.number),
        b: new Field(converters.number),
        c: new Field(converters.number),
        d: new Field(converters.number)
      },
      {
        one: new Group({ include: ["a", "b"] }),
        two: new Group({ include: ["c", "d"] })
      }
    )
  });

  const o = M.create({ items: [{ a: 1, b: 2, c: 3, d: 4 }] });

  const state = form.state(o);
  const item0 = state.repeatingForm("items").index(0);
  const a = item0.field("a");
  const b = item0.field("b");
  const c = item0.field("c");
  const d = item0.field("d");
  const one = item0.group("one");
  const two = item0.group("two");

  a.setRaw("wrong");
  expect(one.isValid).toBeFalsy();
  expect(two.isValid).toBeTruthy();

  c.setRaw("wrong too");
  expect(one.isValid).toBeFalsy();
  expect(two.isValid).toBeFalsy();

  a.setRaw("10");
  c.setRaw("30");

  expect(one.isValid).toBeTruthy();
  expect(two.isValid).toBeTruthy();
});

test("groups repeating form exclude", () => {
  const N = types.model("N", {
    a: types.number,
    b: types.number,
    c: types.number,
    d: types.number
  });

  const M = types.model("M", {
    items: types.array(N)
  });

  const form = new Form(M, {
    items: new RepeatingForm(
      {
        a: new Field(converters.number),
        b: new Field(converters.number),
        c: new Field(converters.number),
        d: new Field(converters.number)
      },
      {
        one: new Group({ exclude: ["a", "b"] }),
        two: new Group({ exclude: ["c", "d"] })
      }
    )
  });

  const o = M.create({ items: [{ a: 1, b: 2, c: 3, d: 4 }] });

  const state = form.state(o);
  const item0 = state.repeatingForm("items").index(0);
  const a = item0.field("a");
  const b = item0.field("b");
  const c = item0.field("c");
  const d = item0.field("d");
  const one = item0.group("one");
  const two = item0.group("two");

  a.setRaw("wrong");
  expect(one.isValid).toBeTruthy();
  expect(two.isValid).toBeFalsy();

  c.setRaw("wrong too");
  expect(one.isValid).toBeFalsy();
  expect(two.isValid).toBeFalsy();

  a.setRaw("10");
  c.setRaw("30");

  expect(one.isValid).toBeTruthy();
  expect(two.isValid).toBeTruthy();
});

test("groups with warnings", () => {
  const M = types.model("M", {
    a: types.number,
    b: types.number,
    c: types.number,
    d: types.number
  });

  const form = new Form(
    M,
    {
      a: new Field(converters.number),
      b: new Field(converters.number),
      c: new Field(converters.number),
      d: new Field(converters.number)
    },
    {
      one: new Group({ include: ["a", "b"] }),
      two: new Group({ include: ["c", "d"] })
    }
  );

  const o = M.create({ a: 1, b: 2, c: 3, d: 4 });

  const state = form.state(o, {
    getWarning: (accessor: any) =>
      accessor.path === "/a" ? "Please reconsider" : undefined
  });
  const a = state.field("a");
  const b = state.field("b");
  const c = state.field("c");
  const d = state.field("d");
  const one = state.group("one");
  const two = state.group("two");

  expect(one.isValid).toBeTruthy();
  expect(two.isValid).toBeTruthy();

  expect(a.isWarningFree).toBeFalsy();
  expect(b.isWarningFree).toBeTruthy();
  expect(one.isWarningFree).toBeFalsy();
  expect(two.isWarningFree).toBeTruthy();
  expect(state.isWarningFree).toBeFalsy();
});

test("groups with warnings in subform", () => {
  const N = types.model("N", {
    bar: types.string
  });

  const M = types.model("M", {
    foo: types.string,
    sub: N
  });

  const form = new Form(
    M,
    {
      foo: new Field(converters.string),
      sub: new SubForm({
        bar: new Field(converters.string)
      })
    },
    {
      one: new Group({ include: ["sub"] })
    }
  );

  const o = M.create({ foo: "FOO", sub: { bar: "BAR" } });

  const state = form.state(o, {
    getWarning: (accessor: any) =>
      accessor.path === "/sub" ? "SubWarning" : undefined
  });

  const subForm = state.subForm("sub");
  const group = state.group("one");

  expect(subForm.isWarningFree).toBeFalsy();
  expect(subForm.warning).toEqual("SubWarning");
  expect(state.isWarningFree).toBeFalsy();
  expect(group.isWarningFree).toBeFalsy();
});

test("groups with warnings in repeatingform", () => {
  const N = types.model("N", {
    bar: types.string
  });
  const M = types.model("M", {
    foo: types.array(N)
  });

  const form = new Form(
    M,
    {
      foo: new RepeatingForm({
        bar: new Field(converters.string)
      })
    },
    {
      one: new Group({ include: ["foo"] })
    }
  );

  const o = M.create({ foo: [{ bar: "correct" }, { bar: "incorrect" }] });

  const state = form.state(o, {
    getWarning: (accessor: any) =>
      accessor.path === "/foo/1/bar" ? "Warning" : undefined
  });

  const repeatingForm = state.repeatingForm("foo");
  const repeatingFormEntry1 = repeatingForm.accessors[0];
  const repeatingFormEntry2 = repeatingForm.accessors[1];
  const group = state.group("one");

  expect(repeatingForm.isWarningFree).toBeFalsy();
  expect(repeatingFormEntry1.isWarningFree).toBeTruthy();
  expect(repeatingFormEntry2.isWarningFree).toBeFalsy();
  expect(group.isWarningFree).toBeFalsy();
});
