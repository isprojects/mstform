import { FieldAccessor } from "./accessor";

export interface Normalizer {
  (accessor: FieldAccessor<any, any, any>): any;
}

const value: Normalizer = accessor => {
  return {
    value: accessor.raw,
    onChange: (ev: any) => accessor.setRaw(ev.target.value)
  };
};

const checked: Normalizer = accessor => {
  return {
    checked: accessor.raw,
    onChange: (ev: any) => accessor.setRaw(ev.target.checked)
  };
};

const object: Normalizer = accessor => {
  return {
    value: accessor.raw,
    onChange: (value: any) => accessor.setRaw(value)
  };
};

export const normalizers = {
  value,
  checked,
  object
};
