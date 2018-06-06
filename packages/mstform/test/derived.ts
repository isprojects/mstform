import { configure } from "mobx";
import { getSnapshot, types } from "mobx-state-tree";
import { Converter, Field, Form, RepeatingForm, converters } from "../src";

// "strict" leads to trouble during initialization. we may want to lift this
// restriction in ispnext in the future as we use MST now, which has its
// own mechanism
configure({ enforceActions: true });

// a way to wait for all reactions to have been resolved
function resolveReactions() {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, 0);
  });
}

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
      derived: (node: typeof M.Type) => node.sum()
    }),
    a: new Field(converters.number),
    b: new Field(converters.number)
  });

  const o = M.create({ calculated: 0, a: 1, b: 2 });

  const state = form.state(o);
  const calculated = state.field("calculated");
  const a = state.field("a");
  const b = state.field("b");
  function resolveAfter(t: number) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, t);
    });
  }
  await resolveReactions();
  // we show a derived value
  expect(calculated.raw).toEqual("3");
  // underlying value is also modified
  expect(calculated.value).toEqual(3);

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

// test("calculated repeating", async () => {
//   const N = types
//     .model("N", {
//       calculated: types.number,
//       a: types.number,
//       b: types.number
//     })
//     .views(self => ({
//       sum() {
//         return self.a + self.b;
//       }
//     }));
//   const M = types.model("M", {
//     foo: types.array(N)
//   });

//   const form = new Form(M, {
//     foo: new RepeatingForm({
//       calculated: new Field(converters.number, {
//         derived: node => node.sum()
//       }),
//       a: new Field(converters.number),
//       b: new Field(converters.number)
//     })
//   });

//   const o = M.create({ foo: [{ calculated: 0, a: 1, b: 2 }]});

//   const state = form.state(o);
//   const sub = state.repeatingForm('foo').index(0);
//   const calculated = sub.field("calculated");
//   const a = sub.field("a");
//   const b = sub.field("b");
//   function resolveAfter(t: number) {
//     return new Promise(resolve => {
//       setTimeout(() => {
//         resolve();
//       }, t);
//     });
//   }
//   await resolveReactions();
//   // we show a derived value
//   expect(calculated.raw).toEqual("3");
//   // underlying value is also modified
//   expect(calculated.value).toEqual(3);

//   // we set it to 4 explicitly
//   await calculated.setRaw("4");
//   expect(calculated.raw).toEqual("4");
//   // this immediately affects the underlying value
//   expect(calculated.value).toEqual(4);

//   // we now change a, which should modify the derived value
//   await a.setRaw("3");
//   await resolveReactions();
//   expect(calculated.raw).toEqual("5");
//   // and also the underlying value, immediately
//   expect(calculated.value).toEqual(5);
// });
