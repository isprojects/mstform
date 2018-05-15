import { IStateTreeNode } from "mobx-state-tree";

export type ValidationResponse = string | null | undefined | false;

export interface Validator<V> {
  (value: V): ValidationResponse | Promise<ValidationResponse>;
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
}

export interface SaveFunc {
  (node: IStateTreeNode): any;
}

export interface FormStateOptions {
  save?: SaveFunc;
}
