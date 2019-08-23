import { ValidateOptions } from "./validate-options";
import { ExternalMessages } from "./validationMessages";
import {
  FieldAccess,
  RepeatingFormAccess,
  SubFormAccess,
  GroupAccess
} from "./accessor";
import { AccessUpdate } from "./backend";

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

  validate(options?: ValidateOptions): boolean;

  isValid: boolean;

  accessors: IAccessor[];
  flatAccessors: IAccessor[];
  accessBySteps(steps: string[]): IAccessor | undefined;

  dispose(): void;
  clear(): void;

  setAccess(update: AccessUpdate): void;
  clearError(): void;
}

export interface IFormAccessor<D, G> extends IAccessor {
  access(name: string): IAccessor | undefined;

  field<K extends keyof D>(name: K): FieldAccess<D, K>;
  repeatingForm<K extends keyof D>(name: K): RepeatingFormAccess<D, K>;
  subForm<K extends keyof D>(name: K): SubFormAccess<D, K>;
  group<K extends keyof G>(name: K): GroupAccess<D>;
}

export interface ISubFormAccessor<D, G> extends IFormAccessor<D, G> {
  name: string;
}

export interface IRepeatingFormAccessor<D, G> extends IAccessor {
  length: number;

  index(index: number): IRepeatingFormIndexedAccessor<D, G>;
  insert(index: number, node: any, addModeDefaults?: string[]): void;
  push(node: any, addModeDefaults?: string[]): void;
  remove(node: any): void;

  removeIndex(index: number): void;
}

export interface IRepeatingFormIndexedAccessor<D, G>
  extends IFormAccessor<D, G> {
  index: number;

  setIndex(index: number): void;
  setAddMode(addModeDefaults: string[]): void;
}

export type IParentAccessor =
  | IFormAccessor<any, any>
  | IRepeatingFormAccessor<any, any>
  | undefined;
