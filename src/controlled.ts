import {
  applyPatch,
  IAnyModelType,
  IMSTArray,
  Instance,
  IReferenceType,
} from "mobx-state-tree";
import { FieldAccessor } from "./field-accessor";

export interface Controlled<R, V> {
  (accessor: FieldAccessor<R, V>): {
    [key: string]: any;
    onChange: (value: any) => void;
  };
}

const value: Controlled<any, any> = (accessor) => {
  return {
    value: accessor.raw,
    onChange: (ev) => accessor.setRaw(ev.target.value),
  };
};

const checked: Controlled<any, any> = (accessor) => {
  return {
    checked: accessor.raw,
    onChange: (ev) => accessor.setRaw(ev.target.checked),
  };
};

const object: Controlled<any, any> = (accessor) => {
  return {
    value: accessor.raw,
    onChange: (value) => accessor.setRaw(value),
  };
};

const modelReferenceArray: Controlled<any, any> = (
  accessor: FieldAccessor<
    Instance<IAnyModelType>[],
    IMSTArray<IReferenceType<IAnyModelType>>
  >,
) => {
  return {
    value: accessor.raw,
    onChange: (value: Instance<IAnyModelType>[]) => {
      const processResult = accessor.getProcessResult(value);
      if (
        !processResult ||
        !accessor.hasChanges(processResult.value, accessor.value)
      ) {
        return;
      }

      applyPatch(accessor.node, [
        { op: "replace", path: accessor.path, value: value },
      ]);

      const changeFunc = accessor.field.changeFunc;
      if (changeFunc != null) {
        changeFunc(accessor.node, accessor.value);
      }
      const updateFunc = accessor.state.updateFunc;
      if (updateFunc != null) {
        updateFunc(accessor);
      }
    },
  };
};

export const controlled = {
  value,
  checked,
  object,
  modelReferenceArray,
};
