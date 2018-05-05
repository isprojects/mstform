import { IStateTreeNode } from "mobx-state-tree";

export type ValidationResponse = string | null | undefined | false;

export type Converter<R, V> = {
  convert(raw: R): V | undefined;
  render(value: V): R;
};

export interface RawGetter<R> {
  (...args: any[]): R;
}

export interface Validator<V> {
  (value: V): ValidationResponse | Promise<ValidationResponse>;
}

export interface FieldOptions<R, V> {
  rawValidators?: Validator<R>[];
  validators?: Validator<V>[];
  converter?: Converter<R, V>;
  getRaw?: RawGetter<R>;
  conversionError?: string;
}

export interface SaveFunc {
  (node: IStateTreeNode): any;
}

export interface FormStateOptions {
  save?: SaveFunc;
}

export class ProcessResponse<V> {
  value: V | null;
  error: string | null;

  constructor(value: V | null, error: string | null) {
    this.value = value;
    this.error = error;
  }
}
