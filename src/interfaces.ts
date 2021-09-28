import { Instance, IAnyModelType } from "mobx-state-tree";

import { ValidateOptions } from "./validate-options";
import { ExternalMessages } from "./validationMessages";
import {
  FieldAccess,
  RepeatingFormAccess,
  SubFormAccess,
  GroupAccess,
} from "./accessor";
import { FormDefinition } from "./form";
import { AccessUpdate } from "./backend";
import { AnyFormState } from "./state";

export interface IAccessor {
  path: string;
  fieldref: string;
  error: string | undefined;
  warning: string | undefined;
  warningValue: string | undefined;
  isWarningFree: boolean;
  disabled: boolean;
  hidden: boolean;
  readOnly: boolean;
  inputAllowed: boolean;
  externalErrors: ExternalMessages;
  externalWarnings: ExternalMessages;
  value: any;
  addMode: boolean;
  context: any;
  parent: IParentAccessor;
  state: AnyFormState;

  validate(options?: ValidateOptions): boolean;

  isValid: boolean;
  isDirty: boolean;

  accessors: IAccessor[];
  flatAccessors: IAccessor[];
  accessBySteps(steps: string[]): IAccessor | undefined;

  dispose(): void;
  clear(): void;

  setAccess(update: AccessUpdate): void;
  clearError(): void;
}

export interface IFormAccessor<
  D extends FormDefinition<M>,
  G,
  M extends IAnyModelType
> extends IAccessor {
  access(name: string): IAccessor | undefined;

  field<K extends keyof D>(name: K): FieldAccess<D, K>;
  repeatingForm<K extends keyof D>(name: K): RepeatingFormAccess<D, K, M>;
  subForm<K extends keyof D>(name: K): SubFormAccess<D, K, M>;
  group<K extends keyof G>(name: K): GroupAccess<D>;
}

export interface ISubFormAccessor<
  D extends FormDefinition<M>,
  G,
  M extends IAnyModelType
> extends IFormAccessor<D, G, M> {
  name: string;
}

export interface IRepeatingFormAccessor<
  D extends FormDefinition<M>,
  G,
  M extends IAnyModelType
> extends IAccessor {
  length: number;

  index(index: number): IRepeatingFormIndexedAccessor<D, G, M>;
  insert(index: number, node: Instance<M>, addModeDefaults?: string[]): void;
  push(node: Instance<M>, addModeDefaults?: string[]): void;
  remove(node: Instance<M>): void;

  removeIndex(index: number): void;
}

export interface IRepeatingFormIndexedAccessor<
  D extends FormDefinition<M>,
  G,
  M extends IAnyModelType
> extends IFormAccessor<D, G, M> {
  index: number;

  setIndex(index: number): void;
  setAddMode(addModeDefaults: string[]): void;
}

export type IParentAccessor =
  | IFormAccessor<any, any, any>
  | IRepeatingFormAccessor<any, any, any>
  | undefined;

export type IAnyRepeatingFormIndexedAccessor = IRepeatingFormIndexedAccessor<
  any,
  any,
  any
>;

export type IAnyRepeatingFormAccessor = IRepeatingFormAccessor<any, any, any>;

export type IAnySubFormAccessor = ISubFormAccessor<any, any, any>;

export type IAnyFormAccessor = IFormAccessor<any, any, any>;
