import { computed, observable, action } from "mobx";

import { pathToFieldref } from "./utils";
import { ExternalMessages } from "./validationMessages";
import { FormState } from "./state";
import { ValidateOptions } from "./validate-options";
import { IAccessor, IFormAccessor } from "./interfaces";
import { AccessUpdate } from "./backend";

export class AccessorBase implements IAccessor {
  @observable
  private _error?: string;

  @observable
  private _isReadOnly: boolean = false;

  @observable
  private _isDisabled: boolean = false;

  @observable
  private _isHidden: boolean = false;

  @observable
  private _isRequired: boolean = false;

  @observable
  private _addMode: boolean = false;

  externalErrors = new ExternalMessages();
  externalWarnings = new ExternalMessages();

  constructor(
    public state: FormState<any, any, any>,
    public name: string,
    public parent: IFormAccessor<any, any>
  ) {}

  @computed
  get path(): string {
    return this.parent.path + "/" + this.name;
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
  get readOnly(): boolean {
    return (
      this.parent.readOnly ||
      this._isReadOnly ||
      this.state.isReadOnlyFunc(this)
    );
  }

  @computed
  get disabled(): boolean {
    return (
      this.parent.disabled ||
      this._isDisabled ||
      this.state.isDisabledFunc(this)
    );
  }

  @computed
  get hidden(): boolean {
    return (
      this.parent.hidden || this._isHidden || this.state.isHiddenFunc(this)
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

  @computed
  get addMode(): boolean {
    // field accessor overrides this to look at raw value
    return this._addMode || this.parent.addMode;
  }

  @computed
  get value(): any {
    throw new Error("Not implemented");
  }

  validate(options?: ValidateOptions): boolean {
    throw new Error("Not implemented");
  }

  @computed
  get isValid(): boolean {
    throw new Error("Not implemented");
  }

  get accessors(): IAccessor[] {
    return [];
  }

  accessBySteps(steps: string[]): IAccessor {
    throw new Error("Not implemented");
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
}
