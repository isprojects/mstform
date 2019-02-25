import { getNodeId } from "../src/utils";
import { types } from "mobx-state-tree";

test("getNodeId", () => {
  const M = types.model("M", {
    a: types.number
  });
  const N = types.model("N", {
    b: types.string
  });

  const m1 = M.create({ a: 1 });
  const m2 = M.create({ a: 2 });
  const n1 = N.create({ b: "1" });

  const m1Id = getNodeId(m1);
  const m2Id = getNodeId(m2);
  const n1Id = getNodeId(n1);

  expect(m1Id).toEqual(getNodeId(m1));
  expect(m2Id).toEqual(getNodeId(m2));
  expect(m1Id).not.toEqual(m2Id);
  expect(m1Id).not.toEqual(n1Id);
});
