import { IStateTreeNode } from "mobx-state-tree";

export type ValidationResponse = string | null | undefined | false;

export interface Validator<V> {
  (value: V): ValidationResponse | Promise<ValidationResponse>;
}

export interface FieldOptions<R, V> {
  rawValidators?: Validator<R>[];
  validators?: Validator<V>[];
  conversionError?: string;
}

export interface SaveFunc {
  (node: IStateTreeNode): any;
}

export interface FormStateOptions {
  save?: SaveFunc;
}
