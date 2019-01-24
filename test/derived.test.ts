import { configure, IReactionDisposer } from "mobx";
import { types, Instance } from "mobx-state-tree";
import { Field, Form, RepeatingForm, converters } from "../src";
import { resolveReactions } from "./util";

// "always" leads to trouble during initialization.
configure({ enforceActions: "observed" });

test("calculated", async () => {
  const M = types
    .model("M", {
      calculated: types.number,
      a: types.number,
      b: types.number
    })
    .views(self => ({
      sum() {
        return self.a + self.b;
      }
    }));

  const form = new Form(M, {
    calculated: new Field(converters.number, {
      derived: (node: Instance<typeof M>) => node.sum()
    }),
    a: new Field(converters.number),
    b: new Field(converters.number)
  });

  const o = M.create({ calculated: 0, a: 1, b: 2 });

  const state = form.state(o);
  const calculated = state.field("calculated");
  const a = state.field("a");
  const b = state.field("b");

  await resolveReactions();
  // we show the set value, as no modification was made
  expect(calculated.raw).toEqual("0");
  expect(calculated.value).toEqual(0);

  // we set it to 4 explicitly
  await calculated.setRaw("4");
  expect(calculated.raw).toEqual("4");
  // this immediately affects the underlying value
  expect(calculated.value).toEqual(4);

  // we now change a, which should modify the derived value
  await a.setRaw("3");
  await resolveReactions();
  expect(calculated.raw).toEqual("5");
  // and also the underlying value, immediately
  expect(calculated.value).toEqual(5);
});

test("calculated repeating", async () => {
  const N = types
    .model("N", {
      calculated: types.number,
      a: types.number,
      b: types.number
    })
    .views(self => ({
      sum() {
        return self.a + self.b;
      }
    }));
  const M = types.model("M", {
    foo: types.array(N)
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      calculated: new Field(converters.number, {
        derived: node => node.sum()
      }),
      a: new Field(converters.number),
      b: new Field(converters.number)
    })
  });

  const o = M.create({ foo: [{ calculated: 0, a: 1, b: 2 }] });

  const state = form.state(o);
  const sub = state.repeatingForm("foo").index(0);
  const calculated = sub.field("calculated");
  const a = sub.field("a");
  const b = sub.field("b");

  await resolveReactions();
  // we show the original value as no change was made
  expect(calculated.raw).toEqual("0");
  expect(calculated.value).toEqual(0);

  // we set it to 4 explicitly
  await calculated.setRaw("4");
  expect(calculated.raw).toEqual("4");
  // this immediately affects the underlying value
  expect(calculated.value).toEqual(4);

  // we now change a, which should modify the derived value
  await a.setRaw("3");
  await resolveReactions();
  expect(calculated.raw).toEqual("5");
  // and also the underlying value, immediately
  expect(calculated.value).toEqual(5);
});

test("calculated repeating push and remove", async () => {
  const N = types
    .model("N", {
      calculated: types.number,
      a: types.number,
      b: types.number
    })
    .views(self => ({
      sum() {
        return self.a + self.b;
      }
    }));

  const M = types.model("M", {
    foo: types.array(N)
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      calculated: new Field(converters.number, {
        derived: node => node.sum()
      }),
      a: new Field(converters.number),
      b: new Field(converters.number)
    })
  });

  const o = M.create({ foo: [{ calculated: 0, a: 1, b: 2 }] });

  const state = form.state(o);
  const forms = state.repeatingForm("foo");
  forms.push({ calculated: 0, a: 5, b: 3 });

  // we get a form and field here so we can see that its reaction is disposed
  // later
  const laterRemoved = forms.index(0);
  const removedCalculated = laterRemoved.field("calculated");

  const sub = forms.index(1);
  const calculated = sub.field("calculated");
  const a = sub.field("a");
  const b = sub.field("b");

  await resolveReactions();
  // we show nothing as we're in add mode
  expect(calculated.raw).toEqual("");

  // we set it to 4 explicitly
  await calculated.setRaw("4");
  expect(calculated.raw).toEqual("4");
  // this immediately affects the underlying value
  expect(calculated.value).toEqual(4);

  // we now change a, which should modify the derived value
  await a.setRaw("3");
  await resolveReactions();
  expect(calculated.raw).toEqual("6");
  // and also the underlying value, immediately
  expect(calculated.value).toEqual(6);

  const disposer = removedCalculated._disposer;
  expect(disposer).not.toBeUndefined();
  // to please TS
  if (disposer == null) {
    throw new Error("Disposer cannot be undefined");
  }
  let touched = false;
  const wrappedDisposer = () => {
    touched = true;
    disposer();
  };

  // a bit of a hack to track whether the disposer is called
  removedCalculated._disposer = wrappedDisposer as IReactionDisposer;

  forms.remove(o.foo[0]);
  const sub2 = forms.index(0);
  const calculated2 = sub2.field("calculated");
  expect(calculated2.raw).toEqual("6");
  expect(calculated2.value).toEqual(6);
  await calculated2.setRaw("4");
  expect(calculated2.value).toEqual(4);
  const a2 = sub.field("a");
  await a2.setRaw("7");
  expect(calculated2.raw).toBe("10");
  expect(touched).toBeTruthy();
});

test("calculated with context", async () => {
  const M = types
    .model("M", {
      calculated: types.string,
      a: types.string,
      b: types.string
    })
    .views(self => ({
      sum() {
        return (parseFloat(self.a) + parseFloat(self.b)).toString();
      }
    }));

  function getDecimalPlaces(context: any) {
    expect(context).not.toBeUndefined();
    return { decimalPlaces: context.getNumberOfDecimals() };
  }

  const form = new Form(M, {
    calculated: new Field(converters.decimal(getDecimalPlaces), {
      derived: (node: Instance<typeof M>) => node.sum()
    }),
    a: new Field(converters.decimal(getDecimalPlaces)),
    b: new Field(converters.decimal(getDecimalPlaces))
  });

  const o = M.create({ calculated: "0.0000", a: "1.0000", b: "2.3456" });

  const state = form.state(o, {
    context: { getNumberOfDecimals: () => 4 }
  });
  const calculated = state.field("calculated");
  const a = state.field("a");
  const b = state.field("b");

  await resolveReactions();
  // we show the set value, as no modification was made
  expect(calculated.raw).toEqual("0.0000");
  expect(calculated.value).toEqual("0.0000");

  // we now change a, which should modify the derived value
  await a.setRaw("1.2345");
  await resolveReactions();
  expect(calculated.raw).toEqual("3.5801");
  // and also the underlying value, immediately
  expect(calculated.value).toEqual("3.5801");
});
