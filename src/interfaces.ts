import { ValidateOptions } from "./validate-options";
import { ExternalMessages } from "./validationMessages";

export interface IAccessor {
  path: string;
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

  validate(options?: ValidateOptions): boolean;

  isValid: boolean;

  accessors: IAccessor[];
  accessBySteps(steps: string[]): IAccessor | undefined;

  dispose(): void;
  clear(): void;
}
