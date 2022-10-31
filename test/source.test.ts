import { configure } from "mobx";
import { types, getSnapshot } from "mobx-state-tree";
import { Source, Form, converters, Field, RepeatingForm } from "../src";
import { resolveReactions } from "./utils";

configure({ enforceActions: "always" });

function refSnapshots(refs: any[] | undefined): any[] {
  if (refs === undefined) {
    throw new Error("Did not expect undefined refs");
  }
  return refs.map((ref) => getSnapshot(ref));
}

test("source", async () => {
  const Item = types
    .model("Item", {
      id: types.identifierNumber,
      text: types.string,
      feature: types.string,
    })
    .views((self) => ({
      get displayText() {
        return "Display " + self.text;
      },
    }));

  const Container = types.model("Container", {
    entryMap: types.map(Item),
  });

  const container = Container.create({ entryMap: {} });

  const data = [
    { id: 1, text: "A", feature: "x" },
    { id: 2, text: "B", feature: "x" },
    { id: 3, text: "C", feature: "y" },
  ];

  const loadHit: string[] = [];

  const load = async ({ feature }: { feature: string }) => {
    loadHit.push(feature);
    return data.filter((entry) => entry.feature === feature);
  };

  const source = new Source({
    entryMap: container.entryMap,
    load,
    cacheDuration: 2,
  });

  await source.load({ feature: "x" }, 0);
  expect(source.getById(1)).toEqual({ id: 1, text: "A", feature: "x" });

  const values = source.values({ feature: "x" });
  expect(values).not.toBeUndefined();
  if (values == null) {
    throw new Error("shouldn't happen");
  }
  expect(refSnapshots(values)).toEqual([
    { id: 1, text: "A", feature: "x" },
    { id: 2, text: "B", feature: "x" },
  ]);

  expect(values[0].displayText).toEqual("Display A");
  expect(loadHit).toEqual(["x"]);

  // when we try to reload with the same feature, we don't get a hit for load
  await source.load({ feature: "x" }, 0);
  expect(loadHit).toEqual(["x"]);

  // and we still get the same results
  const values2 = source.values({ feature: "x" });
  expect(values2).not.toBeUndefined();
  expect(refSnapshots(values2)).toEqual([
    { id: 1, text: "A", feature: "x" },
    { id: 2, text: "B", feature: "x" },
  ]);

  // when the cache duration has expired we expect another load.
  await source.load({ feature: "x" }, 3 * 1000);
  expect(loadHit).toEqual(["x", "x"]);
});

test("source should load once when multiple loads for the same source are triggered", async () => {
  const Item = types
    .model("Item", {
      id: types.identifierNumber,
      text: types.string,
      feature: types.string,
    })
    .views((self) => ({
      get displayText() {
        return "Display " + self.text;
      },
    }));

  const Container = types.model("Container", {
    entryMap: types.map(Item),
  });

  const container = Container.create({ entryMap: {} });

  const data = [
    { id: 1, text: "A", feature: "x" },
    { id: 2, text: "B", feature: "x" },
    { id: 3, text: "C", feature: "y" },
  ];

  let loadHit = 0;

  const load = async ({ feature }: { feature: string }) => {
    loadHit++;
    return data;
  };

  const source = new Source({
    entryMap: container.entryMap,
    load,
    cacheDuration: 2,
  });

  await Promise.allSettled([
    source.load(),
    source.load(),
    source.load(),
    source.load(),
    source.load(),
    source.load(),
    source.load(),
  ]);
  expect(loadHit).toBe(1);

  loadHit = 0;
  source.clear();
  await Promise.allSettled([
    source.load(),
    source.load(),
    source.load(),
    source.load({ feature: "a" }),
    source.load(),
    source.load(),
    source.load(),
  ]);
  expect(loadHit).toBe(2);

  const loadWithReject = ({ feature }: { feature: string }) => {
    loadHit++;
    return Promise.reject();
  };
  const sourceWithReject = new Source({
    entryMap: container.entryMap,
    load: loadWithReject,
    cacheDuration: 2,
  });

  // Make sure a reject also clears the promise from the `existingLoad`.
  loadHit = 0;
  await sourceWithReject.load().catch(() => true);
  await sourceWithReject.load().catch(() => true);
  await sourceWithReject.load().catch(() => true);
  expect(loadHit).toBe(3);
});

test("source container function", async () => {
  const Item = types.model("Item", {
    id: types.identifierNumber,
    text: types.string,
  });

  const Container = types.model("Container", {
    entryMap: types.map(Item),
  });

  const container = Container.create({ entryMap: {} });

  const data = [
    { id: 1, text: "A", feature: "x" },
    { id: 2, text: "B", feature: "x" },
    { id: 3, text: "C", feature: "y" },
  ];

  const loadHit: string[] = [];

  const load = async ({ feature }: { feature: string }) => {
    loadHit.push(feature);
    return data.filter((entry) => entry.feature === feature);
  };

  const source = new Source({
    entryMap: () => container.entryMap,
    load,
    cacheDuration: 2,
  });

  await source.load({ feature: "x" }, 0);
  expect(source.getById(1)).toEqual({ id: 1, text: "A" });

  const values = source.values({ feature: "x" });
  expect(values).not.toBeUndefined();
  expect(refSnapshots(values)).toEqual([
    { id: 1, text: "A" },
    { id: 2, text: "B" },
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
    { id: 2, text: "B" },
  ]);

  // when the cache duration has expired we expect another load.
  await source.load({ feature: "x" }, 3 * 1000);
  expect(loadHit).toEqual(["x", "x"]);
});

describe("source accessor in fields", () => {
  const ItemA = types.model("ItemA", {
    id: types.identifierNumber,
    text: types.string,
  });

  const ContainerA = types.model("ContainerA", {
    entryMap: types.map(ItemA),
  });

  const ItemB = types.model("ItemB", {
    id: types.identifierNumber,
    text: types.string,
  });

  const ContainerB = types.model("ContainerB", {
    entryMap: types.map(ItemB),
  });

  const M = types.model("M", {
    a: types.maybe(types.reference(ItemA)),
    b: types.maybe(types.reference(ItemB)),
  });

  const R = types.model("R", {
    m: M,
    containerA: ContainerA,
    containerB: ContainerB,
  });

  // pretend this is data on the server. The load functions use this
  // to give correct answers.
  const aData = [
    { id: 1, text: "AOne" },
    { id: 2, text: "ATwo" },
  ];
  const bData = [
    { id: 3, text: "BThree", aId: 1 },
    { id: 4, text: "BFour", aId: 1 },
    { id: 5, text: "BFive", aId: 2 },
  ];

  async function loadA(q: any) {
    return aData;
  }

  // we filter b based on a
  async function loadB(q: any) {
    const a = q.a;
    const aId = a != null ? a.id : undefined;
    return bData.filter((entry) => entry.aId === aId);
  }

  test("form without autoLoad", async () => {
    const r = R.create({
      m: {
        a: undefined,
        b: undefined,
      },
      containerA: { entryMap: {} },
      containerB: { entryMap: {} },
    });

    const o = r.m;
    const containerA = r.containerA;
    const containerB = r.containerB;

    const sourceA = new Source({ entryMap: containerA.entryMap, load: loadA });
    const sourceB = new Source({ entryMap: containerB.entryMap, load: loadB });

    const form = new Form(M, {
      a: new Field(converters.maybe(converters.model(ItemA)), {
        references: {
          source: sourceA,
        },
      }),
      b: new Field(converters.maybe(converters.model(ItemB)), {
        references: {
          source: sourceB,
          // this source is dependent on state. This information
          // should be sent whenever a load is issued
          dependentQuery: (accessor) => {
            return { a: accessor.node.a };
          },
        },
      }),
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
      { id: 2, text: "ATwo" },
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
      { id: 4, text: "BFour" },
    ]);
  });

  test("form with autoLoad", async () => {
    const r = R.create({
      m: {
        a: undefined,
        b: undefined,
      },
      containerA: { entryMap: {} },
      containerB: { entryMap: {} },
    });

    const o = r.m;
    const containerA = r.containerA;
    const containerB = r.containerB;

    const sourceA = new Source({ entryMap: containerA.entryMap, load: loadA });
    const sourceB = new Source({ entryMap: containerB.entryMap, load: loadB });

    const form = new Form(M, {
      a: new Field(converters.maybe(converters.model(ItemA)), {
        references: {
          source: sourceA,
        },
      }),
      b: new Field(converters.maybe(converters.model(ItemB)), {
        references: {
          source: sourceB,
          // this source is dependent on state. This information
          // should be sent whenever a load is issued
          dependentQuery: (accessor) => {
            return { a: accessor.node.a };
          },
        },
      }),
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
      { id: 2, text: "ATwo" },
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
      { id: 4, text: "BFour" },
    ]);

    disposeA();
    disposeB();
  });

  test("form with autoLoad disposes on delete", async () => {
    const n = types.model("N", {
      foo: types.array(M),
      containerA: ContainerA,
      containerB: ContainerB,
    });

    const r = n.create({
      foo: [
        {
          a: undefined,
          b: undefined,
        },
      ],
      containerA: { entryMap: {} },
      containerB: { entryMap: {} },
    });

    const containerA = r.containerA;
    const containerB = r.containerB;

    const sourceA = new Source({ entryMap: containerA.entryMap, load: loadA });
    const sourceB = new Source({ entryMap: containerB.entryMap, load: loadB });

    let dependentQueryCounter = 0;

    const form = new Form(n, {
      foo: new RepeatingForm({
        a: new Field(converters.maybe(converters.model(ItemA)), {
          references: {
            source: sourceA,
          },
        }),
        b: new Field(converters.maybe(converters.model(ItemB)), {
          references: {
            source: sourceB,
            // this source is dependent on state. This information
            // should be sent whenever a load is issued
            dependentQuery: (accessor) => {
              dependentQueryCounter += 1;
              return { a: accessor.node.a, c: accessor.node.c };
            },
          },
        }),
      }),
    });
    const state = form.state(r);
    const repeating = state.repeatingForm("foo");
    const firstLine = repeating.index(0);

    const fieldA = firstLine.field("a");
    const fieldB = firstLine.field("b");
    fieldA.references.autoLoadReaction();
    fieldB.references.autoLoadReaction();

    expect(dependentQueryCounter).toEqual(1);

    repeating.remove(r.foo[0]);

    expect(dependentQueryCounter).toEqual(1);
  });

  test("no references", async () => {
    const r = R.create({
      m: {
        a: undefined,
      },
      containerA: { entryMap: {} },
      containerB: { entryMap: {} },
    });

    const o = r.m;

    const form = new Form(M, {
      a: new Field(converters.maybe(converters.model(ItemA))),
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
    text: types.string,
    feature: types.string,
  });

  const Container = types.model("Container", {
    entryMap: types.map(Item),
  });

  const container = Container.create({ entryMap: {} });

  const data = [
    { id: 1, text: "A", feature: "x" },
    { id: 2, text: "B", feature: "x" },
    { id: 3, text: "C", feature: "y" },
  ];

  const load = async () => {
    return data;
  };

  const source = new Source<typeof Item, any>({
    entryMap: container.entryMap,
    load,
    cacheDuration: 2,
  });

  await source.load({}, 0);
  expect(source.getById(1)).toEqual({ id: 1, text: "A", feature: "x" });

  const values = source.values({});
  expect(values).toBeDefined();
  if (values == null) {
    throw new Error("This shouldn't happen");
  }

  expect(values).not.toBeUndefined();
  expect(refSnapshots(values)).toEqual([
    { id: 1, text: "A", feature: "x" },
    { id: 2, text: "B", feature: "x" },
    { id: 3, text: "C", feature: "y" },
  ]);

  source.clear();
  expect(Array.from(source.entryMap.keys()).length).toBe(0);
  expect(source.values({})).toBeUndefined();
});

test("source default timestamp", async () => {
  const Item = types.model("Item", {
    id: types.identifierNumber,
    text: types.string,
    feature: types.string,
  });

  const Container = types.model("Container", {
    entryMap: types.map(Item),
  });

  const container = Container.create({ entryMap: {} });

  const data = [
    { id: 1, text: "A", feature: "x" },
    { id: 2, text: "B", feature: "x" },
    { id: 3, text: "C", feature: "y" },
  ];

  const loadHit: string[] = [];

  const load = async ({ feature }: { feature: string }) => {
    loadHit.push(feature);
    return data.filter((entry) => entry.feature === feature);
  };

  const source = new Source({
    entryMap: container.entryMap,
    load,
    cacheDuration: 2,
  });

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
    text: types.string,
    feature: types.string,
  });

  const Container = types.model("Container", {
    entryMap: types.map(Item),
  });

  const container = Container.create({ entryMap: {} });

  const data = [
    { id: 1, text: "A", feature: "x" },
    { id: 2, text: "B", feature: "x" },
    { id: 3, text: "C", feature: "y" },
  ];

  const loadHit: (string | undefined)[] = [];

  const load = async ({ feature }: { feature?: string }) => {
    loadHit.push(feature);
    return data.filter((entry) => entry.feature === feature);
  };

  const source = new Source({
    entryMap: container.entryMap,
    load,
    cacheDuration: 2,
  });

  await source.load();
  expect(loadHit).toEqual([undefined]);
  await source.load();
  // we should still get it from the cache, as timestamp was sent
  // implicitly.
  expect(loadHit).toEqual([undefined]);
});
