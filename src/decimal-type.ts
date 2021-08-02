import { Decimal } from "decimal.js-light";
import { types } from "mobx-state-tree";

export const decimal = types.custom<string, Decimal>({
  name: "decimal",
  fromSnapshot(value) {
    return new Decimal(value);
  },
  toSnapshot(value) {
    return value.toString();
  },
  isTargetType(value) {
    return value instanceof Decimal;
  },
  getValidationMessage(snapshot) {
    try {
      new Decimal(snapshot);
    } catch (e) {
      return "Not a valid decimal";
    }
    return "";
  },
});
