import { FieldAccessor } from "./field-accessor";

export interface Controlled {
  (accessor: FieldAccessor<any, any>): any;
}

const value: Controlled = (accessor) => {
  return {
    value: accessor.raw,
    onChange: (ev: any) => ev.nativeEvent ? accessor.setRaw(ev.nativeEvent.text): accessor.setRaw(ev.target.value),
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
