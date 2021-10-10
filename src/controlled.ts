import { FieldAccessor } from "./field-accessor";

export interface Controlled {
  (accessor: FieldAccessor<any, any>): any;
}

const value: Controlled = (accessor) => {
  return {
    value: accessor.raw,
    onChange: (ev: any) => ev.target.value !== undefined && accessor.setRaw(ev.target.value),
    onChangeText: (ev: any) => accessor.setRaw(ev),
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

export const controlled = {
  value,
  checked,
  object,
};
