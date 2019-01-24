import { configure } from "mobx";
import { types, getSnapshot, Instance, getIdentifier } from "mobx-state-tree";
import { Source, Form, converters, Field } from "../src";
import { resolveReactions } from "./util";

// "always" leads to trouble during initialization.
configure({ enforceActions: "observed" });

function refSnapshots(refs: any[] | undefined): any[] {
  if (refs === undefined) {
    throw new Error("Did not expect undefined refs");
  }
  return refs.map(ref => getSnapshot(ref));
}

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
  expect(refSnapshots(refs)).toEqual([
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
  expect(refSnapshots(refs2)).toEqual([
    { id: 1, text: "A" },
    { id: 2, text: "B" }
  ]);
});

test("source accessor in fields", async () => {
  const ItemA = types.model("ItemA", {
    id: types.identifierNumber,
    text: types.string
  });

  const ContainerA = types.model("ContainerA", {
    items: types.map(ItemA)
  });

  const ItemB = types.model("ItemB", {
    id: types.identifierNumber,
    text: types.string
  });

  const ContainerB = types.model("ContainerB", {
    items: types.map(ItemB)
  });

  const M = types.model("M", {
    a: types.maybe(types.reference(ItemA)),
    b: types.maybe(types.reference(ItemB))
  });

  const R = types.model("R", {
    m: M,
    containerA: ContainerA,
    containerB: ContainerB
  });

  const r = R.create({
    m: {
      a: undefined,
      b: undefined
    },
    containerA: { items: {} },
    containerB: { items: {} }
  });

  const o = r.m;
  const containerA = r.containerA;
  const containerB = r.containerB;

  // pretend this is data on the server. The load functions use this
  // to give correct answers.
  const aData = [{ id: 1, text: "AOne" }, { id: 2, text: "ATwo" }];
  const bData = [
    { id: 3, text: "BThree", aId: 1 },
    { id: 4, text: "BFour", aId: 1 },
    { id: 5, text: "BFive", aId: 2 }
  ];

  async function loadA(q: any) {
    return aData;
  }

  // we filter b based on a
  async function loadB(q: any) {
    const a = q.a;
    const aId = a != null ? a.id : undefined;
    return bData.filter(entry => entry.aId === aId);
  }

  const sourceA = new Source({ container: containerA, load: loadA });
  const sourceB = new Source({ container: containerB, load: loadB });

  const form = new Form(M, {
    a: new Field(converters.maybe(converters.model(ItemA)), {
      references: {
        source: sourceA
      }
    }),
    b: new Field(converters.maybe(converters.model(ItemB)), {
      references: {
        source: sourceB,
        // this source is dependent on state. This information
        // should be sent whenever a load is issued
        dependentQuery: accessor => {
          return { a: accessor.node.a };
        }
        // this source should automatically reload if the query output
        // changes because of a data change
        //  autoLoad: true
      }
    })
  });

  const state = form.state(o);

  const fieldA = state.field("a");
  const fieldB = state.field("b");

  // we must trigger a load before we can access references
  // synchronously
  await fieldA.loadReferences();

  const refsA = fieldA.references();
  expect(refSnapshots(refsA)).toEqual([
    { id: 1, text: "AOne" },
    { id: 2, text: "ATwo" }
  ]);

  await fieldB.loadReferences();
  // when we haven't selected A yet, this will be empty - no choices
  // are possible
  const refsB = fieldB.references();
  expect(refSnapshots(refsB)).toEqual([]);

  // now we make a selection in A
  const item1 = containerA.items.get("1");
  if (item1 === undefined) {
    throw new Error("item1 should exist");
  }
  await fieldA.setRaw(item1);

  // now we reload B
  await fieldB.loadReferences();

  // // this will automatically trigger a reload of b, as a is dependent on b
  // // and we turn on autoReload
  // await resolveReactions();

  // refs for B should now be a different list that fits A
  const refsB2 = fieldB.references();

  expect(refSnapshots(refsB2)).toEqual([
    { id: 3, text: "BThree" },
    { id: 4, text: "BFour" }
  ]);
});
