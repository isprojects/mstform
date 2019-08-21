import { ValidateOptions } from "./validate-options";
import { ExternalMessages } from "./validationMessages";
import {
  FieldAccess,
  RepeatingFormAccess,
  SubFormAccess,
  GroupAccess
} from "./accessor";

export interface IAccessor {
  path: string;
  fieldref: string;
  error: string | undefined;
  warning: string | undefined;
  warningValue: string | undefined;
  disabled: boolean;
  hidden: boolean;
  readOnly: boolean;
  inputAllowed: boolean;
  externalErrors: ExternalMessages;
  externalWarnings: ExternalMessages;
  value: any;
  addMode: boolean;

  validate(options?: ValidateOptions): boolean;

  isValid: boolean;
  hasWarning?: boolean;

  accessors: IAccessor[];
  accessBySteps(steps: string[]): IAccessor | undefined;

  dispose(): void;
  clear(): void;
}

export interface IFormAccessor<D, G> extends IAccessor {
  access(name: string): IAccessor | undefined;

  field<K extends keyof D>(name: K): FieldAccess<D, K>;
  repeatingForm<K extends keyof D>(name: K): RepeatingFormAccess<D, K>;
  subForm<K extends keyof D>(name: K): SubFormAccess<D, K>;
  group<K extends keyof G>(name: K): GroupAccess<D>;

  flatAccessors: IAccessor[];
}
