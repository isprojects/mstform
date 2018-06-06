import { IModelType } from "mobx-state-tree";

export type ValidationResponse = string | null | undefined | false;

export interface Validator<V> {
  (value: V): ValidationResponse | Promise<ValidationResponse>;
}

export interface Derived<V> {
  (node: any): V;
}
export interface RawGetter<R> {
  (...args: any[]): R;
}

export interface FieldOptions<R, V> {
  getRaw?(...args: any[]): R;
  rawValidators?: Validator<R>[];
  validators?: Validator<V>[];
  conversionError?: string;
  requiredError?: string;
  required?: boolean;
  fromEvent?: boolean;
  derived?: Derived<V>;
}

export interface SaveFunc<M> {
  (node: M): any;
}

// TODO: implement blur and pause validation
// blur would validate immediately after blur
// pause would show validation after the user stops input for a while
export type ValidationOption = "immediate" | "no"; //  | "blur" | "pause";
