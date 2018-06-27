import { FieldAccessor } from "./accessor";

export interface Normalizer {
  (accessor: FieldAccessor<any, any, any>): any;
}

const value: Normalizer = accessor => {
  return {
    value: accessor.raw,
    onChange: (ev: any) => accessor.handleChange(ev.target.value)
  };
};

const checked: Normalizer = accessor => {
  return {
    checked: accessor.raw,
    onChange: (ev: any) => accessor.handleChange(ev.target.checked)
  };
};

const object: Normalizer = accessor => {
  return {
    value: accessor.raw,
    onChange: accessor.handleChange
  };
};

export const normalizers = {
  value,
  checked,
  object
};
