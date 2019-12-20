import { Decimal } from "decimal.js-light";
import { types, getSnapshot, typecheck } from "mobx-state-tree";
import { decimal } from "../src/";

test("decimal reading and writing", () => {
  const M = types
    .model({
      d: decimal
    })
    .actions(self => ({
      setDecimal(d: Decimal) {
        self.d = d;
      }
    }));

  const o = M.create({ d: "1.25" });
  // this is a Decimal instance, so we can call a method on it
  expect(o.d.isPositive()).toBeTruthy();
  expect(o.d.equals(new Decimal("1.25"))).toBeTruthy();
  const snapshot = getSnapshot(o);
  expect(snapshot).toEqual({
    d: "1.25"
  });
});

test("decimal validation", () => {
  // shouldn't throw
  typecheck(decimal, "1.25");

  // should throw
  expect(() => typecheck(decimal, "02-04-2013")).toThrow();
  expect(() => typecheck(decimal, "borked")).toThrow();
});
