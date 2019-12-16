import { configure } from "mobx";
import { types, getSnapshot } from "mobx-state-tree";
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
    entryMap: types.map(Item)
  });

  const container = Container.create({ entryMap: {} });

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

  const source = new Source({ container, load, cacheDuration: 2 });

  await source.load({ feature: "x" }, 0);
  expect(source.getById(1)).toEqual({ id: 1, text: "A" });

  const values = source.values({ feature: "x" });
  expect(values).not.toBeUndefined();
  expect(refSnapshots(values)).toEqual([
    { id: 1, text: "A" },
    { id: 2, text: "B" }
  ]);
  expect(loadHit).toEqual(["x"]);

  // when we try to reload with the same feature, we don't get a hit for load
  await source.load({ feature: "x" }, 0);
  expect(loadHit).toEqual(["x"]);

  // and we still get the same results
  const values2 = source.values({ feature: "x" });
  expect(values2).not.toBeUndefined();
  expect(refSnapshots(values2)).toEqual([
    { id: 1, text: "A" },
    { id: 2, text: "B" }
  ]);

  // when the cache duration has expired we expect another load.
  await source.load({ feature: "x" }, 3 * 1000);
  expect(loadHit).toEqual(["x", "x"]);
});

test("source container function", async () => {
  const Item = types.model("Item", {
    id: types.identifierNumber,
    text: types.string
  });

  const Container = types.model("Container", {
    entryMap: types.map(Item)
  });

  const container = Container.create({ entryMap: {} });

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

  const source = new Source({
    container: () => container,
    load,
    cacheDuration: 2
  });

  await source.load({ feature: "x" }, 0);
  expect(source.getById(1)).toEqual({ id: 1, text: "A" });

  const values = source.values({ feature: "x" });
  expect(values).not.toBeUndefined();
  expect(refSnapshots(values)).toEqual([
    { id: 1, text: "A" },
    { id: 2, text: "B" }
  ]);
  expect(loadHit).toEqual(["x"]);

  // when we try to reload with the same feature, we don't get a hit for load
  await source.load({ feature: "x" }, 0);
  expect(loadHit).toEqual(["x"]);

  // and we still get the same results
  const values2 = source.values({ feature: "x" });
  expect(values2).not.toBeUndefined();
  expect(refSnapshots(values2)).toEqual([
    { id: 1, text: "A" },
    { id: 2, text: "B" }
  ]);

  // when the cache duration has expired we expect another load.
  await source.load({ feature: "x" }, 3 * 1000);
  expect(loadHit).toEqual(["x", "x"]);
});

describe("source accessor in fields", () => {
  const ItemA = types.model("ItemA", {
    id: types.identifierNumber,
    text: types.string
  });

  const ContainerA = types.model("ContainerA", {
    entryMap: types.map(ItemA)
  });

  const ItemB = types.model("ItemB", {
    id: types.identifierNumber,
    text: types.string
  });

  const ContainerB = types.model("ContainerB", {
    entryMap: types.map(ItemB)
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

  test("form without autoLoad", async () => {
    const r = R.create({
      m: {
        a: undefined,
        b: undefined
      },
      containerA: { entryMap: {} },
      containerB: { entryMap: {} }
    });

    const o = r.m;
    const containerA = r.containerA;
    const containerB = r.containerB;

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
        }
      })
    });

    const state = form.state(o);

    const fieldA = state.field("a");
    const fieldB = state.field("b");
    expect(fieldA.references.isEnabled()).toBeTruthy();

    // we must trigger a load before we can access references
    // synchronously
    await fieldA.references.load();

    const refsA = fieldA.references.values();
    expect(refSnapshots(refsA)).toEqual([
      { id: 1, text: "AOne" },
      { id: 2, text: "ATwo" }
    ]);

    await fieldB.references.load();

    // when we haven't selected A yet, this will be empty - no choices
    // are possible
    const refsB = fieldB.references.values();
    expect(refSnapshots(refsB)).toEqual([]);

    // now we make a selection in A
    const item1 = containerA.entryMap.get("1");
    if (item1 === undefined) {
      throw new Error("item1 should exist");
    }
    fieldA.setRaw(item1);

    // now we reload B
    await fieldB.references.load();

    // this will automatically trigger a reload of b, as a is dependent on b
    // and we turn on autoReload
    await resolveReactions();

    // refs for B should now be a different list that fits A
    const refsB2 = fieldB.references.values();

    expect(refSnapshots(refsB2)).toEqual([
      { id: 3, text: "BThree" },
      { id: 4, text: "BFour" }
    ]);
  });

  test("form with autoLoad", async () => {
    const r = R.create({
      m: {
        a: undefined,
        b: undefined
      },
      containerA: { entryMap: {} },
      containerB: { entryMap: {} }
    });

    const o = r.m;
    const containerA = r.containerA;
    const containerB = r.containerB;

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
        }
      })
    });

    const state = form.state(o);

    const fieldA = state.field("a");
    const fieldB = state.field("b");
    const disposeA = fieldA.references.autoLoadReaction();
    const disposeB = fieldB.references.autoLoadReaction();

    // we must trigger a load before we can access references
    // synchronously
    await fieldA.references.load();

    const refsA = fieldA.references.values();
    expect(refSnapshots(refsA)).toEqual([
      { id: 1, text: "AOne" },
      { id: 2, text: "ATwo" }
    ]);

    await fieldB.references.load();
    // when we haven't selected A yet, this will be empty - no choices
    // are possible
    const refsB = fieldB.references.values();
    expect(refSnapshots(refsB)).toEqual([]);

    // now we make a selection in A
    const item1 = containerA.entryMap.get("1");
    if (item1 === undefined) {
      throw new Error("item1 should exist");
    }
    fieldA.setRaw(item1);

    // // this will automatically trigger a reload of b, as a is dependent on b
    // // and we turn on autoReload
    await resolveReactions();

    // refs for B should now be a different list that fits A
    const refsB2 = fieldB.references.values();

    expect(refSnapshots(refsB2)).toEqual([
      { id: 3, text: "BThree" },
      { id: 4, text: "BFour" }
    ]);

    disposeA();
    disposeB();
  });

  test("no references", async () => {
    const r = R.create({
      m: {
        a: undefined
      },
      containerA: { entryMap: {} },
      containerB: { entryMap: {} }
    });

    const o = r.m;

    const form = new Form(M, {
      a: new Field(converters.maybe(converters.model(ItemA)))
    });

    const state = form.state(o);

    const fieldA = state.field("a");

    expect(fieldA.references.isEnabled()).toBeFalsy();

    expect(() => fieldA.references.values()).toThrow();
  });
});

test("source clear", async () => {
  const Item = types.model("Item", {
    id: types.identifierNumber,
    text: types.string
  });

  const Container = types.model("Container", {
    entryMap: types.map(Item)
  });

  const container = Container.create({ entryMap: {} });

  const data = [
    { id: 1, text: "A", feature: "x" },
    { id: 2, text: "B", feature: "x" },
    { id: 3, text: "C", feature: "y" }
  ];

  const load = async () => {
    return data;
  };

  const source = new Source({ container, load, cacheDuration: 2 });

  await source.load({}, 0);
  expect(source.getById(1)).toEqual({ id: 1, text: "A" });

  const values = source.values({});
  expect(values).not.toBeUndefined();
  expect(refSnapshots(values)).toEqual([
    { id: 1, text: "A" },
    { id: 2, text: "B" },
    { id: 3, text: "C" }
  ]);

  source.clear();
  expect(Array.from(source.items.keys()).length).toBe(0);
  expect(source.values({})).toBeUndefined();
});

test("source default timestamp", async () => {
  const Item = types.model("Item", {
    id: types.identifierNumber,
    text: types.string
  });

  const Container = types.model("Container", {
    entryMap: types.map(Item)
  });

  const container = Container.create({ entryMap: {} });

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

  const source = new Source({ container, load, cacheDuration: 2 });

  await source.load({ feature: "x" });
  expect(loadHit).toEqual(["x"]);
  await source.load({ feature: "x" });
  // we should still get it from the cache, as timestamp was sent
  // implicitly.
  expect(loadHit).toEqual(["x"]);
});

test("source default query", async () => {
  const Item = types.model("Item", {
    id: types.identifierNumber,
    text: types.string
  });

  const Container = types.model("Container", {
    entryMap: types.map(Item)
  });

  const container = Container.create({ entryMap: {} });

  const data = [
    { id: 1, text: "A", feature: "x" },
    { id: 2, text: "B", feature: "x" },
    { id: 3, text: "C", feature: "y" }
  ];

  const loadHit: (string | undefined)[] = [];

  const load = async ({ feature }: { feature?: string }) => {
    loadHit.push(feature);
    return data.filter(entry => entry.feature === feature);
  };

  const source = new Source({
    container,
    load,
    cacheDuration: 2,
    defaultQuery: () => ({})
  });

  await source.load();
  expect(loadHit).toEqual([undefined]);
  await source.load();
  // we should still get it from the cache, as timestamp was sent
  // implicitly.
  expect(loadHit).toEqual([undefined]);
});

test("source no default query", async () => {
  const Item = types.model("Item", {
    id: types.identifierNumber,
    text: types.string
  });

  const Container = types.model("Container", {
    entryMap: types.map(Item)
  });

  const container = Container.create({ entryMap: {} });

  const data = [
    { id: 1, text: "A", feature: "x" },
    { id: 2, text: "B", feature: "x" },
    { id: 3, text: "C", feature: "y" }
  ];

  const loadHit: (string | undefined)[] = [];

  const load = async ({ feature }: { feature?: string }) => {
    loadHit.push(feature);
    return data.filter(entry => entry.feature === feature);
  };

  const source = new Source({ container, load, cacheDuration: 2 });
  expect(source.load()).rejects.toThrowError(Error);
});
