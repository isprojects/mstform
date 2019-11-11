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

import {
  Field,
  ProcessValue,
  ValidationMessage,
  ProcessOptions,
  errorMessage
} from "./form";
import { FormState } from "./state";
import { FormAccessorBase } from "./form-accessor-base";
import { currentValidationProps } from "./validation-props";
import { ValidateOptions } from "./validate-options";
import { References } from "./references";
import { pathToFieldref } from "./utils";
import { IAccessor, IFormAccessor } from "./interfaces";
import { AccessorBase } from "./accessor-base";

export class FieldAccessor<R, V> extends AccessorBase implements IAccessor {
  @observable
  _raw: R | undefined;

  @observable
  _value: V;

  _disposer: IReactionDisposer | undefined;

  _references?: References<any, any>;

  constructor(
    public state: FormState<any, any, any>,
    public field: Field<R, V>,
    parent: IFormAccessor<any, any>,
    public name: string
  ) {
    super(parent);
    this.createDerivedReaction();
    this._value = state.getValue(this.path);
    if (field.options && field.options.references) {
      const options = field.options.references;
      const dependentQuery = options.dependentQuery || (() => ({}));
      this._references = new References(
        this,
        options.source,
        dependentQuery,
        !!options.autoLoad
      );
    }
  }

  @computed
  get path(): string {
    return (this.parent as FormAccessorBase<any, any>).path + "/" + this.name;
  }

  dispose() {
    if (this._disposer == null) {
      return;
    }
    this._disposer();
  }

  clear() {
    this.dispose();
  }

  @computed
  get fieldref(): string {
    return pathToFieldref(this.path);
  }

  @computed
  get context(): any {
    return this.state.context;
  }

  async loadReferences(q?: any) {
    if (this._references == null) {
      return undefined;
    }
    return this._references.load(q);
  }

  references(q?: any) {
    if (this._references == null) {
      return undefined;
    }
    return this._references.references(q);
  }

  getReferenceById(id: any) {
    if (this._references == null) {
      return undefined;
    }
    return this._references.getById(id);
  }

  @computed
  get isEmpty(): boolean {
    if (this.field.converter.emptyImpossible) {
      return false;
    }
    return this.raw === this.field.converter.emptyRaw;
  }

  @computed
  get isEmptyAndRequired(): boolean {
    return this.isEmpty && this.required;
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
      () => {
        return this.node != null ? derivedFunc(this.node) : undefined;
      },
      (derivedValue: any) => {
        if (derivedValue === undefined) {
          return;
        }
        this.setRaw(
          this.field.render(
            derivedValue,
            this.state.stateConverterOptionsWithContext(this)
          )
        );
      }
    );
    this._disposer = disposer;
  }

  // XXX I think this should become private (_node), unless I
  // guarantee the type without a lot of complication
  @computed
  get node(): any {
    // XXX it's possible for this to be called for a node that has since
    // been removed. It's not ideal but we return undefined in such a case.
    try {
      return this.state.getValue(
        (this.parent as FormAccessorBase<any, any>).path
      );
    } catch {
      return undefined;
    }
  }

  @computed
  get addMode(): boolean {
    if (this._raw !== undefined) {
      return false;
    }
    // field accessor overrides this to look at raw value
    return this._addMode || (this.parent as FormAccessorBase<any, any>).addMode;
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
    return this.field.render(
      this.value,
      this.state.stateConverterOptionsWithContext(this)
    );
  }

  @action
  setValue(value: V) {
    // if there are no changes, don't do anything
    if (comparer.structural(this._value, value)) {
      return;
    }

    this._value = value;
    this.state.setValueWithoutRawUpdate(this.path, value);
    // XXX maybe rename this to 'update' as change might imply onChange
    // this is why I named 'updateFunc' on state that way instead of
    // 'changeFunc'
    const changeFunc = this.field.changeFunc;
    if (changeFunc != null) {
      changeFunc(this.node, value);
    }
    const updateFunc = this.state.updateFunc;
    if (updateFunc != null) {
      updateFunc(this);
    }
  }

  @action
  setValueAndRawWithoutChangeEvent(value: V) {
    // if there are no changes, don't do anything
    if (comparer.structural(this._value, value)) {
      return;
    }

    this._value = value;
    this.state.setValueWithoutRawUpdate(this.path, value);
    this._raw = this.field.render(
      value,
      this.state.stateConverterOptionsWithContext(this)
    );
  }

  @computed
  get value(): V {
    if (this.addMode) {
      throw new Error(
        "Cannot access field in add mode until it has been set once"
      );
    }
    return this._value;
  }

  @computed
  get required(): boolean {
    return (
      !this.field.converter.neverRequired &&
      (this.field.required ||
        this._isRequired ||
        this.state.isRequiredFunc(this))
    );
  }

  validate(options?: ValidateOptions): boolean {
    const ignoreRequired = options != null ? options.ignoreRequired : false;
    const ignoreGetError = options != null ? options.ignoreGetError : false;
    this.setRaw(this.raw, { ignoreRequired });
    if (ignoreGetError) {
      return this.isInternallyValid;
    }
    return this.isValid;
  }

  // XXX move into interface
  @computed
  get isInternallyValid(): boolean {
    // is internally valid even if getError gives an error
    return this._error === undefined;
  }

  @computed
  get isValid(): boolean {
    return this.errorValue === undefined;
  }

  @computed
  get requiredError(): string {
    const requiredError = this.field.requiredError || this.state._requiredError;
    return errorMessage(requiredError, this.state.context);
  }

  @action
  setRaw(raw: R, options?: ProcessOptions) {
    if (this.state.saveStatus === "rightAfter") {
      this.state.setSaveStatus("after");
    }

    this._raw = raw;

    const stateConverterOptions = this.state.stateConverterOptionsWithContext(
      this
    );

    raw = this.field.converter.preprocessRaw(raw, stateConverterOptions);

    if (this.field.isRequired(raw, this.required, options)) {
      if (!this.field.converter.emptyImpossible) {
        this.setValue(this.field.converter.emptyValue);
      }
      this.setError(this.requiredError);
      return;
    }

    let processResult;
    try {
      processResult = this.field.process(raw, stateConverterOptions);
    } catch (e) {
      this.setError("Something went wrong");
      return;
    }

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

    this.setValue(processResult.value);
  }

  @action
  setRawFromValue() {
    // we get the value ignoring add mode
    // this is why we can't use this.value
    const value = this.state.getValue(this.path);
    this._value = value;

    // we don't use setRaw on the field as the value is already
    // correct. setting raw causes addMode for the field
    // to be disabled
    this._raw = this.field.render(
      value,
      this.state.stateConverterOptionsWithContext(this)
    );
    // trigger validation
    this.validate();
  }

  @action
  setValueAndUpdateRaw(value: V) {
    // We want to update a value through the accessor and also update the raw
    this.setValue(value);
    this.setRawFromValue();
  }

  // XXX should these go into interface / base class?
  @action
  setError(error: string) {
    this._error = error;
  }

  // backward compatibility -- use setRaw instead
  handleChange = (...args: any[]) => {
    const raw = this.field.getRaw(...args);
    this.setRaw(raw);
  };

  handleFocus = (event: any) => {
    if (this.state.focusFunc == null) {
      return;
    }
    this.state.focusFunc(event, this);
  };

  handleBlur = (event: any) => {
    if (this.field.postprocess && !this._error) {
      this.setRawFromValue();
    }
    if (this.state.blurFunc != null) {
      this.state.blurFunc(event, this);
    }
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
    if (this.state.blurFunc != null || this.field.postprocess) {
      result.onBlur = this.handleBlur;
    }
    return result;
  }

  @computed
  get validationProps(): object {
    return currentValidationProps(this);
  }

  accessBySteps(steps: string[]): IAccessor {
    throw new Error("Cannot step through field accessor");
  }
}
