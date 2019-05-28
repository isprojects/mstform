import { configure, IReactionDisposer } from "mobx";
import { types, Instance } from "mobx-state-tree";
import { Field, Form, RepeatingForm, converters } from "../src";

// "always" leads to trouble during initialization.
configure({ enforceActions: "observed" });

test("calculated", () => {
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

  // we show the set value, as no modification was made
  expect(calculated.raw).toEqual("0");
  expect(calculated.value).toEqual(0);

  // we set it to 4 explicitly
  calculated.setRaw("4");
  expect(calculated.raw).toEqual("4");
  // this immediately affects the underlying value
  expect(calculated.value).toEqual(4);

  // we now change a, which should modify the derived value
  a.setRaw("3");
  expect(calculated.raw).toEqual("5");
  // and also the underlying value, immediately
  expect(calculated.value).toEqual(5);
});

test("calculated repeating", () => {
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
  // we show the original value as no change was made
  expect(calculated.raw).toEqual("0");
  expect(calculated.value).toEqual(0);

  // we set it to 4 explicitly
  calculated.setRaw("4");
  expect(calculated.raw).toEqual("4");
  // this immediately affects the underlying value
  expect(calculated.value).toEqual(4);

  // we now change a, which should modify the derived value
  a.setRaw("3");
  expect(calculated.raw).toEqual("5");
  // and also the underlying value, immediately
  expect(calculated.value).toEqual(5);
});

test("calculated repeating push and remove", () => {
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

  // we show nothing as we're in add mode
  expect(calculated.raw).toEqual("");

  // we set it to 4 explicitly
  calculated.setRaw("4");
  expect(calculated.raw).toEqual("4");
  // this immediately affects the underlying value
  expect(calculated.value).toEqual(4);

  // we now change a, which should modify the derived value
  a.setRaw("3");

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
  calculated2.setRaw("4");
  expect(calculated2.value).toEqual(4);
  const a2 = sub.field("a");
  a2.setRaw("7");
  expect(calculated2.raw).toBe("10");
  expect(touched).toBeTruthy();
});

test("calculated with addModeDefaults", () => {
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

  let changeCount = 0;
  const form = new Form(M, {
    foo: new RepeatingForm({
      calculated: new Field(converters.number, {
        derived: node => {
          return node.sum();
        },
        change: () => {
          changeCount++;
        }
      }),
      a: new Field(converters.number),
      b: new Field(converters.number)
    })
  });

  const o = M.create({ foo: [{ calculated: 0, a: 1, b: 2 }] });

  const state = form.state(o);
  const forms = state.repeatingForm("foo");

  expect(changeCount).toBe(0);

  forms.push({ calculated: 0, a: 5, b: 3 }, ["calculated", "a", "b"]);

  // this shouldn't have issued a change, as the derived value is
  // calculated during adding
  expect(changeCount).toBe(0);

  const sub0 = forms.index(0);
  const calculated0 = sub0.field("calculated");

  // derivation shouldn't have run
  expect(calculated0.value).toEqual(0);
  expect(calculated0.raw).toEqual("0");

  // we now change a, which should modify the derived value
  sub0.field("a").setRaw("3");
  expect(changeCount).toBe(1);
  expect(calculated0.value).toEqual(5);
  expect(calculated0.raw).toEqual("5");

  // we expect the same behavior for the new entry
  const sub1 = forms.index(1);
  const calculated1 = sub1.field("calculated");
  // but derivation should have run
  expect(calculated1.value).toEqual(8);

  sub1.field("a").setRaw("6");
  expect(changeCount).toBe(2);
  // we should have calculated the derived
  expect(calculated1.value).toEqual(9);
  expect(calculated1.raw).toEqual("9");

  // now add a third entry
  forms.push({ calculated: 0, a: 5, b: 3 }, ["calculated", "a", "b"]);
  const sub2 = forms.index(2);

  const calculated2 = sub2.field("calculated");
  expect(calculated2.value).toEqual(8);
  expect(calculated2.raw).toEqual("8");
  expect(changeCount).toBe(2);
});

test("calculated with context", () => {
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
    calculated: new Field(
      converters.dynamic(converters.decimal, getDecimalPlaces),
      {
        derived: (node: Instance<typeof M>) => node.sum()
      }
    ),
    a: new Field(converters.dynamic(converters.decimal, getDecimalPlaces)),
    b: new Field(converters.dynamic(converters.decimal, getDecimalPlaces))
  });

  const o = M.create({ calculated: "0.0000", a: "1.0000", b: "2.3456" });

  const state = form.state(o, {
    context: { getNumberOfDecimals: () => 4 }
  });
  const calculated = state.field("calculated");
  const a = state.field("a");
  const b = state.field("b");

  // we show the set value, as no modification was made
  expect(calculated.raw).toEqual("0.0000");
  expect(calculated.value).toEqual("0.0000");

  // we now change a, which should modify the derived value
  a.setRaw("1.2345");
  expect(calculated.raw).toEqual("3.5801");
  // and also the underlying value, immediately
  expect(calculated.value).toEqual("3.5801");
});

test("dispose", () => {
  // keep a counter to track how often we call our sum function
  // it's called more than we would wish, but if we don't properly
  // dispose of previous state it's called even more often
  let counter = 0;

  const M = types
    .model("M", {
      calculated: types.number,
      a: types.number,
      b: types.number
    })
    .views(self => ({
      sum() {
        counter++;
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

  expect(counter).toBe(0);

  // previous state is important to do test dispose
  // happens properly, don't remove!
  const previousState = form.state(o);
  expect(counter).toBe(1);

  const state = form.state(o);
  expect(counter).toBe(2);

  const calculated = state.field("calculated");
  const a = state.field("a");
  const b = state.field("b");

  // we show the set value, as no modification was made
  expect(calculated.raw).toEqual("0");
  expect(calculated.value).toEqual(0);

  // we set it to 4 explicitly
  calculated.setRaw("4");
  expect(calculated.raw).toEqual("4");
  // this immediately affects the underlying value
  expect(calculated.value).toEqual(4);

  expect(counter).toBe(2);

  // we now change a, which should modify the derived value
  a.setRaw("3");

  // if we hadn't disposed properly this would have been
  // called more
  expect(counter).toBe(3);

  expect(calculated.raw).toEqual("5");
  // and also the underlying value, immediately
  expect(calculated.value).toEqual(5);
});
