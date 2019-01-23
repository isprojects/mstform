import { configure } from "mobx";
import { types, getSnapshot, Instance } from "mobx-state-tree";
import { Source, Form, converters, Field } from "../src";

// "always" leads to trouble during initialization.
configure({ enforceActions: "observed" });

test("source", async () => {
  const Item = types.model("Item", {
    id: types.identifierNumber,
    text: types.string
  });

  const Container = types.model("Container", {
    items: types.map(Item)
  });

  const container = Container.create({ items: {} });

  const data = [
    { id: 1, text: "A", feature: "x" },
    { id: 2, text: "B", feature: "x" },
    { id: 3, text: "C", feature: "y" }
  ];

  const loadHit: string[] = [];

  const load = async ({ feature }: { feature: string }) => {
    loadHit.push(feature);
    return data.filter(entry => entry.feature === feature);
  };

  const source = new Source({ container, load });

  await source.load({ feature: "x" });

  const refs = source.references({ feature: "x" });
  expect(refs).not.toBeUndefined();
  if (refs === undefined) {
    // please ts
    throw new Error("Cannot reach this");
  }
  expect(refs.map(ref => getSnapshot(ref))).toEqual([
    { id: 1, text: "A" },
    { id: 2, text: "B" }
  ]);
  expect(loadHit).toEqual(["x"]);

  // when we try to reload with the same feature, we don't get a hit for load
  await source.load({ feature: "x" });
  expect(loadHit).toEqual(["x"]);

  // and we still get the same results
  const refs2 = source.references({ feature: "x" });
  expect(refs2).not.toBeUndefined();
  if (refs2 === undefined) {
    // please ts
    throw new Error("Cannot reach this");
  }
  expect(refs2.map(ref => getSnapshot(ref))).toEqual([
    { id: 1, text: "A" },
    { id: 2, text: "B" }
  ]);
});

// should the source actually be in the field? it contains
// updatable data, and field is static.
// the source data should be in the accessor itself -- the
// source definition can be in the field

// test("source affects other source", async () => {
//   const ItemA = types.model("ItemA", {
//     id: types.identifier,
//     text: types.string
//   });

//   const ContainerA = types.model("ContainerA", {
//     items: types.map(ItemA)
//   });

//   const ItemB = types.model("ItemB", {
//     id: types.identifier,
//     text: types.string
//   });

//   const ContainerB = types.model("ContainerB", {
//     items: types.map(ItemB)
//   });

//   const M = types.model("M", {
//     a: types.maybe(types.reference(ItemA)),
//     b: types.maybe(types.reference(ItemB))
//   });

//   const containerA = ContainerA.create({ items: {} });
//   const containerB = ContainerB.create({ items: {} });

//   // pretend this is data on the server. The load functions use this
//   // to give correct answers.
//   const aData = [{ id: 1, text: "AOne" }, { id: 2, text: "ATwo" }];
//   const bData = [
//     { id: 3, text: "BThree", aId: 1 },
//     { id: 4, text: "BFour", aId: 1 },
//     { id: 5, text: "BFive", aId: 2 }
//   ];

//   async function loadA(q: any) {
//     return aData;
//   }

//   // we filter b based on a
//   async function loadB(q: any) {
//     return bData.filter(entry => entry.aId === q.aId);
//   }

//   const form = new Form(M, {
//     a: new Field(converters.maybe(converters.model(ItemA)), {
//       source: new Source({ container: containerA, load: loadA })
//     }),
//     b: new Field(converters.maybe(converters.model(ItemB)), {
//       source: new Source({
//         container: containerB,
//         load: loadB,
//         // XXX should this also have access to the accessor so we
//         // determine dependency in a data-driven way per field?
//         getQuery: (node: any) => ({ a: node.a })
//       })
//     })
//   });

//   const o = M.create({
//     a: undefined,
//     b: undefined
//   });

//   const state = form.state(o);

//   const fieldA = state.field("a");
//   const fieldB = state.field("b");

//   // we must trigger a load before we can access references
//   // synchronously
//   await fieldA.source.load();

//   const refsA = fieldA.source.references();
//   expect(getSnapshot(refsA)).toEqual([
//     { id: 1, text: "AOne" },
//     { id: 2, text: "ATwo" }
//   ]);

//   await fieldB.source.load();
//   // when we haven't selected A yet, this will be empty - no choices
//   // are possible
//   const refsB = fieldB.source.references();
//   expect(getSnapshot(refsB)).toEqual([]);

//   // now we make a selection in A
//   await fieldA.setRaw(containerA.items.get("1") as Instance<typeof ItemA>);

//   // we reload b
//   // await fieldB.source.load();
//   // now the references will be adjusted to those that match with our
//   // selection
//   const refsB2 = fieldB.source.references();

//   expect(getSnapshot(refsB2)).toEqual([
//     { id: 3, text: "BThree", aId: 1 },
//     { id: 4, text: "BFour", aId: 1 }
//   ]);
// });
