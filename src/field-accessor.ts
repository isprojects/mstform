import {
  action,
  observable,
  computed,
  isObservable,
  toJS,
  reaction,
  comparer,
  IReactionDisposer
} from "mobx";
import { Field, ProcessValue, ValidationMessage, ProcessOptions } from "./form";
import { FormState } from "./state";
import { FormAccessor } from "./form-accessor";
import { currentValidationProps } from "./validation-props";
import { Accessor } from "./accessor";
import { ValidateOptions } from "./validate-options";

export class FieldAccessor<M, R, V> {
  name: string;

  @observable
  _raw: R | undefined;

  @observable
  _error: string | undefined;

  @observable
  _isValidating: boolean = false;

  @observable
  _addMode: boolean = false;

  _disposer: IReactionDisposer | undefined;

  constructor(
    public state: FormState<any, any>,
    public field: Field<R, V>,
    public parent: FormAccessor<any, any>,
    name: string
  ) {
    this.name = name;
    this.createDerivedReaction();
  }

  clear() {
    if (this._disposer == null) {
      return;
    }
    this._disposer();
  }

  @computed
  get path(): string {
    return this.parent.path + "/" + this.name;
  }

  @action
  setDisposer(disposer: IReactionDisposer) {
    this._disposer = disposer;
  }

  createDerivedReaction() {
    const derivedFunc = this.field.derivedFunc;
    if (derivedFunc == null) {
      return;
    }

    if (this._disposer != null) {
      return;
    }
    // XXX when we have a node that's undefined, we don't
    // try to do any work. This isn't ideal but can happen
    // if the path a node was pointing to has been removed.
    const disposer = reaction(
      () => (this.node ? derivedFunc(this.node) : undefined),
      (derivedValue: any) => {
        if (derivedValue === undefined) {
          return;
        }
        this.setRaw(this.field.render(derivedValue));
      }
    );
    this._disposer = disposer;
  }

  @computed
  get node(): M | undefined {
    // XXX it's possible for this to be called for a node that has since
    // been removed. It's not ideal but we return undefined in such a case.
    try {
      return this.state.getValue(this.parent.path);
    } catch {
      return undefined;
    }
  }

  @computed
  get addMode(): boolean {
    if (this._raw !== undefined) {
      return false;
    }
    return this._addMode || this.parent.addMode;
  }

  @computed
  get raw(): R {
    const result = this._raw;
    if (result !== undefined) {
      // this is an object reference. don't convert to JS
      if (isObservable(result) && !(result instanceof Array)) {
        return result as R;
      }
      // anything else, including arrays, convert to JS
      // XXX what if we have an array of object references? cross that
      // bridge when we support it
      return toJS(result) as R;
    }
    if (this.addMode) {
      return this.field.converter.emptyRaw;
    }
    return this.field.render(this.value);
  }

  @computed
  get value(): V {
    if (this.addMode) {
      throw new Error(
        "Cannot access field in add mode until it has been set once"
      );
    }
    return this.state.getValue(this.path);
  }

  @computed
  get errorValue(): string | undefined {
    if (this._error === undefined) {
      return this.state.getErrorFunc(this);
    }
    return this._error;
  }

  @computed
  get warningValue(): string | undefined {
    return this.state.getWarningFunc(this);
  }

  // XXX move this method to state
  @computed
  get canShowValidationMessages(): boolean {
    // immediately after a save we always want messages
    if (this.state.saveStatus === "rightAfter") {
      return true;
    }
    const policy =
      this.state.saveStatus === "before"
        ? this.state.validationBeforeSave
        : this.state.validationAfterSave;
    if (policy === "immediate") {
      return true;
    }
    if (policy === "no") {
      return false;
    }
    // not implemented yet
    if (policy === "blur" || policy === "pause") {
      return false;
    }
    return true;
  }

  @computed
  get error(): string | undefined {
    if (this.canShowValidationMessages) {
      return this.errorValue;
    } else {
      return undefined;
    }
  }

  @computed
  get warning(): string | undefined {
    if (this.canShowValidationMessages) {
      return this.warningValue;
    } else {
      return undefined;
    }
  }

  @computed
  get isValidating(): boolean {
    return this._isValidating;
  }

  @computed
  get disabled(): boolean {
    return this.state.isDisabledFunc(this);
  }

  @computed
  get hidden(): boolean {
    return this.state.isHiddenFunc(this);
  }

  @computed
  get readOnly(): boolean {
    return this.state.isReadOnlyFunc(this);
  }

  @computed
  get required(): boolean {
    // if the field is required, ignore dynamic required logic
    // if the field isn't required, we can dynamically influence whether it is
    return (
      !this.field.converter.neverRequired &&
      (this.field.required || this.state.isRequiredFunc(this))
    );
  }

  async validate(options?: ValidateOptions): Promise<boolean> {
    const ignoreRequired = options != null ? options.ignoreRequired : false;
    await this.setRaw(this.raw, { ignoreRequired });
    return this.isValid;
  }

  @computed
  get isValid(): boolean {
    return this.errorValue === undefined;
  }

  @action
  async setRaw(raw: R, options?: ProcessOptions) {
    if (this.state.saveStatus === "rightAfter") {
      this.state.setSaveStatus("after");
    }

    // we can still set raw directly before the await
    this._raw = raw;

    this.setValidating(true);

    let processResult;
    try {
      // XXX is await correct here? we should await the result
      // later
      processResult = await this.field.process(raw, this.required, options);
    } catch (e) {
      this.setError("Something went wrong");
      this.setValidating(false);
      return;
    }

    const currentRaw = this._raw;

    // if the raw changed in the mean time, bail out
    if (!comparer.structural(currentRaw, raw)) {
      return;
    }
    // validation only is complete if the currentRaw has been validated
    this.setValidating(false);

    if (processResult instanceof ValidationMessage) {
      this.setError(processResult.message);
      return;
    } else {
      this.clearError();
    }
    if (!(processResult instanceof ProcessValue)) {
      throw new Error("Unknown process result");
    }
    const extraResult = this.state.extraValidationFunc(
      this,
      processResult.value
    );
    // XXX possible flicker?
    if (typeof extraResult === "string" && extraResult) {
      this.setError(extraResult);
    }

    // if there are no changes, don't do anything
    if (comparer.structural(this.value, processResult.value)) {
      return;
    }

    this.state.setValueWithoutRawUpdate(this.path, processResult.value);

    // XXX maybe rename this to 'update' as change might imply onChange
    // this is why I named 'updateFunc' on state that way instead of
    // 'changeFunc'
    const changeFunc = this.field.changeFunc;
    if (changeFunc != null) {
      changeFunc(this.node, processResult.value);
    }
    const updateFunc = this.state.updateFunc;
    if (updateFunc != null) {
      updateFunc(this);
    }
  }

  setRawFromValue() {
    // we get the value ignoring add mode
    // this is why we can't use this.value
    const value = this.state.getValue(this.path);

    // we don't use setRaw on the field as the value is already
    // correct. setting raw causes addMode for the field
    // to be disabled
    this._raw = this.field.render(value);
    // trigger validation
    this.validate();
  }

  @action
  setError(error: string) {
    this._error = error;
  }

  @action
  clearError() {
    this._error = undefined;
  }

  @action
  setValidating(flag: boolean) {
    this._isValidating = flag;
  }

  // backward compatibility -- use setRaw instead
  handleChange = async (...args: any[]) => {
    const raw = this.field.getRaw(...args);
    await this.setRaw(raw);
  };

  handleFocus = (event: any) => {
    if (this.state.focusFunc == null) {
      return;
    }
    this.state.focusFunc(event, this);
  };

  handleBlur = (event: any) => {
    if (this.state.blurFunc == null) {
      return;
    }
    this.state.blurFunc(event, this);
  };

  @computed
  get inputProps() {
    const result: any = this.field.controlled(this);
    result.disabled = this.disabled;
    if (this.readOnly) {
      result.readOnly = this.readOnly;
    }
    if (this.state.focusFunc != null) {
      result.onFocus = this.handleFocus;
    }
    if (this.state.blurFunc != null) {
      result.onBlur = this.handleBlur;
    }
    return result;
  }

  @computed
  get validationProps(): object {
    return currentValidationProps(this);
  }

  accessBySteps(steps: string[]): Accessor {
    throw new Error("Cannot step through field accessor");
  }
}
