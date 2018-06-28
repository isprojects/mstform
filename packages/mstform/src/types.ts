import { IModelType } from "mobx-state-tree";

export type ValidationResponse = string | null | undefined | false;

export interface Validator<V> {
  (value: V): ValidationResponse | Promise<ValidationResponse>;
}

export interface Derived<V> {
  (node: any): V;
}

export interface Change<V> {
  (node: any, value: V): void;
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
  change?: Change<V>;
}
