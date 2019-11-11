import { computed, observable, action } from "mobx";

import { pathToFieldref } from "./utils";
import { ExternalMessages } from "./validationMessages";
import { FormState } from "./state";
import { ValidateOptions } from "./validate-options";
import { IAccessor, IParentAccessor } from "./interfaces";
import { AccessUpdate } from "./backend";

export abstract class AccessorBase implements IAccessor {
  @observable
  protected _error?: string;

  @observable
  protected _addMode: boolean = false;

  @observable
  private _isReadOnly: boolean = false;

  @observable
  private _isDisabled: boolean = false;

  @observable
  private _isHidden: boolean = false;

  @observable
  protected _isRequired: boolean = false;

  externalErrors = new ExternalMessages();
  externalWarnings = new ExternalMessages();

  abstract state: FormState<any, any, any>;

  abstract path: string;
  abstract addMode: boolean;
  abstract value: any;
  abstract isValid: boolean;
  abstract accessBySteps(steps: string[]): IAccessor | undefined;
  abstract validate(options?: ValidateOptions): boolean;

  constructor(public parent: IParentAccessor) {}

  @computed
  get context(): any {
    return this.state.context;
  }

  @computed
  get fieldref(): string {
    return pathToFieldref(this.path);
  }

  @computed
  get errorValue(): string | undefined {
    if (this._error !== undefined) {
      return this._error;
    }
    if (this.externalErrors.message !== undefined) {
      return this.externalErrors.message;
    }
    return this.state.getErrorFunc(this);
  }

  @computed
  get error(): string | undefined {
    if (this.state.canShowValidationMessages) {
      return this.errorValue;
    } else {
      return undefined;
    }
  }

  @computed
  get warningValue(): string | undefined {
    if (this.externalWarnings.message !== undefined) {
      return this.externalWarnings.message;
    }
    return this.state.getWarningFunc(this);
  }

  @computed
  get warning(): string | undefined {
    if (this.state.canShowValidationMessages) {
      return this.warningValue;
    } else {
      return undefined;
    }
  }

  @computed
  get isWarningFree(): boolean {
    if (this.warningValue !== undefined) {
      return false;
    }
    return !this.flatAccessors.some(
      accessor => (accessor ? accessor.warningValue !== undefined : false)
    );
  }

  @computed
  get readOnly(): boolean {
    return (
      (this.parent != null && this.parent.readOnly) ||
      this._isReadOnly ||
      this.state.isReadOnlyFunc(this)
    );
  }

  @computed
  get disabled(): boolean {
    return (
      (this.parent != null && this.parent.disabled) ||
      this._isDisabled ||
      this.state.isDisabledFunc(this)
    );
  }

  @computed
  get hidden(): boolean {
    return (
      (this.parent != null && this.parent.hidden) ||
      this._isHidden ||
      this.state.isHiddenFunc(this)
    );
  }

  @computed
  get required(): boolean {
    // field accessor subclass overrides this to handle field-specific
    // required status
    return this._isRequired || this.state.isRequiredFunc(this);
  }

  @computed
  get inputAllowed(): boolean {
    return !this.disabled && !this.hidden && !this.readOnly;
  }

  get accessors(): IAccessor[] {
    return [];
  }

  @computed
  get flatAccessors(): IAccessor[] {
    const result: IAccessor[] = [];
    this.accessors.forEach(accessor => {
      result.push(...accessor.flatAccessors);
      result.push(accessor);
    });
    return result;
  }

  dispose() {
    // no dispose by default
  }

  clear() {
    this.dispose();
  }

  @action
  setAccess(update: AccessUpdate) {
    if (update.readOnly != null) {
      this._isReadOnly = update.readOnly;
    }
    if (update.disabled != null) {
      this._isDisabled = update.disabled;
    }
    if (update.hidden != null) {
      this._isHidden = update.hidden;
    }
    if (update.required != null) {
      this._isRequired = update.required;
    }
  }

  @action
  clearError() {
    this._error = undefined;
  }
}
