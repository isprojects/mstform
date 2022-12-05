import {
  applyPatch,
  IAnyModelType,
  IMSTArray,
  Instance,
  IReferenceType,
} from "mobx-state-tree";
import { FieldAccessor } from "./field-accessor";

export interface Controlled {
  (accessor: FieldAccessor<any, any>): any;
}

const value: Controlled = (accessor) => {
  return {
    value: accessor.raw,
    onChange: (ev: any) => accessor.setRaw(ev.target.value),
  };
};

const checked: Controlled = (accessor) => {
  return {
    checked: accessor.raw,
    onChange: (ev: any) => accessor.setRaw(ev.target.checked),
  };
};

const object: Controlled = (accessor) => {
  return {
    value: accessor.raw,
    onChange: (value: any) => accessor.setRaw(value),
  };
};

const modelReferenceArray: Controlled = (
  accessor: FieldAccessor<
    Instance<IAnyModelType>[],
    IMSTArray<IReferenceType<IAnyModelType>>
  >
) => {
  return {
    value: accessor.raw,
    onChange: (value: Instance<IAnyModelType>[]) => {
      applyPatch(accessor.node, [
        { op: "replace", path: accessor.path, value: value },
      ]);
    },
  };
};

export const controlled = {
  value,
  checked,
  object,
  modelReferenceArray,
};
