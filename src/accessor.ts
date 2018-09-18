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
import { applyPatch, resolvePath } from "mobx-state-tree";
import {
  SubForm,
  ArrayEntryType,
  Form,
  Field,
  FormDefinition,
  Group,
  RepeatingFormDefinitionType,
  SubFormDefinitionType,
  ProcessValue,
  RawType,
  RepeatingForm,
  ValidationMessage,
  ValidationResponse
} from "./form";
import { FormState } from "./state";

export interface FieldAccessorAllows {
  (fieldAccessor: FieldAccessor<any, any, any>): boolean;
}

export interface ExtraValidation {
  (fieldAccessor: FieldAccessor<any, any, any>, value: any): ValidationResponse;
}

export interface RepeatingFormAccessorAllows {
  (repeatingFormAccessor: RepeatingFormAccessor<any, any>): boolean;
}

export interface ValidationProps {
  (accessor: FieldAccessor<any, any, any>): object;
}

export type Accessor =
  | FormAccessor<any, any>
  | FieldAccessor<any, any, any>
  | RepeatingFormAccessor<any, any>
  | RepeatingFormIndexedAccessor<any, any>
  | SubFormAccessor<any, any>;

export type FieldAccess<
  M,
  D extends FormDefinition<M>,
  K extends keyof M
> = FieldAccessor<M, RawType<D[K]>, M[K]>;

export type RepeatingFormAccess<
  M,
  D extends FormDefinition<M>,
  K extends keyof M
> = RepeatingFormAccessor<
  ArrayEntryType<M[K]>,
  RepeatingFormDefinitionType<D[K]>
>;

export type SubFormAccess<
  M,
  D extends FormDefinition<M>,
  K extends keyof M
> = SubFormAccessor<M[K], SubFormDefinitionType<D[K]>>;

export interface IFormAccessor<M, D extends FormDefinition<M>> {
  validate(): Promise<boolean>;

  isValid: boolean;

  field<K extends keyof M>(name: K): FieldAccess<M, D, K>;

  repeatingForm<K extends keyof M>(name: K): RepeatingFormAccess<M, D, K>;

  access(name: string): Accessor | undefined;

  accessors: Accessor[];

  flatAccessors: Accessor[];
}

let currentValidationProps: ValidationProps = () => {
  return {};
};

export function setupValidationProps(validationProps: ValidationProps) {
  currentValidationProps = validationProps;
}

export class FormAccessor<M, D extends FormDefinition<M>>
  implements IFormAccessor<M, D> {
  private keys: string[];
  fieldAccessors: Map<keyof M, FieldAccessor<any, any, any>> = observable.map();
  repeatingFormAccessors: Map<
    keyof M,
    RepeatingFormAccessor<any, any>
  > = observable.map();
  subFormAccessors: Map<keyof M, SubFormAccessor<any, any>> = observable.map();

  @observable
  _addMode: boolean;

  constructor(
    public state: FormState<M, D>,
    public definition: any,
    public parent:
      | FormAccessor<any, any>
      | SubFormAccessor<any, any>
      | RepeatingFormAccessor<any, any>
      | RepeatingFormIndexedAccessor<any, any>
      | null,
    addMode: boolean,
    public allowedKeys?: string[]
  ) {
    this.keys =
      allowedKeys != null ? allowedKeys : Object.keys(this.definition);
    this._addMode = addMode;
    this.initialize();
  }

  async validate(): Promise<boolean> {
    const promises = this.accessors.map(accessor => accessor.validate());
    const values = await Promise.all(promises);
    return values.every(value => value);
  }

  setError(error: string) {
    // no op
  }

  clearError() {
    // no op
  }

  clear() {
    // no op
  }

  @computed
  get path(): string {
    if (this.parent == null) {
      return "";
    }
    return this.parent.path;
  }

  @computed
  get isValid(): boolean {
    return this.accessors.every(accessor => accessor.isValid);
  }

  @computed
  get accessors(): Accessor[] {
    const result: Accessor[] = [];

    this.keys.forEach(key => {
      const entry = this.definition[key];
      if (entry instanceof Field) {
        result.push(this.field(key as keyof M));
      } else if (entry instanceof RepeatingForm) {
        result.push(this.repeatingForm(key as keyof M));
      } else if (entry instanceof SubForm) {
        result.push(this.subForm(key as keyof M));
      }
    });
    return result;
  }

  @computed
  get flatAccessors(): Accessor[] {
    const result: Accessor[] = [];
    this.accessors.forEach(accessor => {
      if (accessor instanceof FieldAccessor) {
        result.push(accessor);
      } else if (accessor instanceof RepeatingFormAccessor) {
        result.push(...accessor.flatAccessors);
        result.push(accessor);
      } else if (accessor instanceof SubFormAccessor) {
        result.push(...accessor.flatAccessors);
        result.push(accessor);
      }
    });
    return result;
  }

  @computed
  get addMode(): boolean {
    if (this._addMode) {
      return true;
    }
    if (this.parent == null) {
      return false;
    }
    return this.parent.addMode;
  }

  access(name: string): Accessor | undefined {
    if (!this.keys.includes(name)) {
      return undefined;
    }

    // XXX catching errors isn't ideal
    try {
      return this.field(name as keyof M);
    } catch {
      try {
        return this.repeatingForm(name as keyof M);
      } catch {
        try {
          return this.subForm(name as keyof M);
        } catch {
          return undefined;
        }
      }
    }
  }

  accessBySteps(steps: string[]): Accessor | undefined {
    if (steps.length === 0) {
      return this;
    }
    const [first, ...rest] = steps;
    const accessor = this.access(first);
    if (rest.length === 0) {
      return accessor;
    }
    if (accessor === undefined) {
      return accessor;
    }
    return accessor.accessBySteps(rest);
  }

  initialize() {
    this.keys.forEach(key => {
      const entry = this.definition[key];
      if (entry instanceof Field) {
        this.createField(key as keyof M, entry);
      } else if (entry instanceof RepeatingForm) {
        this.createRepeatingForm(key as keyof M, entry);
      } else if (entry instanceof SubForm) {
        this.createSubForm(key as keyof M, entry);
      }
    });
  }

  createField<K extends keyof M>(name: K, field: Field<any, any>) {
    const result = new FieldAccessor(this.state, field, this, name as string);
    this.fieldAccessors.set(name, result);
  }

  field<K extends keyof M>(name: K): FieldAccess<M, D, K> {
    const accessor = this.fieldAccessors.get(name);
    if (accessor == null) {
      throw new Error(`${name} is not a Field`);
    }
    return accessor;
  }

  createRepeatingForm<K extends keyof M>(
    name: K,
    repeatingForm: RepeatingForm<any, any>
  ) {
    const result = new RepeatingFormAccessor(
      this.state,
      repeatingForm,
      this,
      name as string
    );
    this.repeatingFormAccessors.set(name, result);
    result.initialize();
  }

  repeatingForm<K extends keyof M>(name: K): RepeatingFormAccess<M, D, K> {
    const accessor = this.repeatingFormAccessors.get(name);
    if (accessor == null) {
      throw new Error(`${name} is not a RepeatingForm`);
    }
    return accessor;
  }

  createSubForm<K extends keyof M>(name: K, subForm: SubForm<any, any>) {
    const result = new SubFormAccessor(
      this.state,
      subForm.definition,
      this,
      name as string
    );
    this.subFormAccessors.set(name, result);
    result.initialize();
  }

  subForm<K extends keyof M>(name: K): SubFormAccess<M, D, K> {
    const accessor = this.subFormAccessors.get(name);
    if (accessor == null) {
      throw new Error(`${name} is not a SubForm`);
    }
    return accessor;
  }

  repeatingField(name: string): any {
    // not implemented yet
  }
}

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
    return this._error;
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

  async validate(): Promise<boolean> {
    await this.setRaw(this.raw);
    return this.isValid;
  }

  @computed
  get isValid(): boolean {
    return this.errorValue === undefined;
  }

  @action
  async setRaw(raw: R) {
    if (this.state.saveStatus === "rightAfter") {
      this.state.setSaveStatus("after");
    }

    this._raw = raw;
    this._isValidating = true;
    let processResult;
    try {
      // XXX is await correct here? we should await the result
      // later
      processResult = await this.field.process(raw);
    } catch (e) {
      this._error = "Something went wrong";
      this._isValidating = false;
      return;
    }

    const currentRaw = this._raw;

    // if the raw changed in the mean time, bail out
    if (!comparer.structural(currentRaw, raw)) {
      return;
    }
    // validation only is complete if the currentRaw has been validated
    this._isValidating = false;

    if (processResult instanceof ValidationMessage) {
      this._error = processResult.message;
      return;
    } else {
      this._error = undefined;
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
      this._error = extraResult;
    }

    // if there are no changes, don't do anything
    if (comparer.structural(this.value, processResult.value)) {
      return;
    }

    this.state.setValueWithoutRawUpdate(this.path, processResult.value);

    const changeFunc = this.field.changeFunc;
    if (changeFunc != null) {
      changeFunc(this.node, processResult.value);
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

export class RepeatingFormAccessor<M, D extends FormDefinition<M>> {
  name: string;

  @observable
  _error: string | undefined;

  @observable
  repeatingFormIndexedAccessors: Map<
    number,
    RepeatingFormIndexedAccessor<any, any>
  > = observable.map();

  constructor(
    public state: FormState<any, any>,
    public repeatingForm: RepeatingForm<M, D>,
    public parent: FormAccessor<any, any>,
    name: string
  ) {
    this.name = name;
  }

  clear() {
    // no op
  }

  @computed
  get path(): string {
    return this.parent.path + "/" + this.name;
  }

  @action
  setError(error: string) {
    this._error = error;
  }

  @action
  clearError() {
    this._error = undefined;
  }

  async validate(): Promise<boolean> {
    const promises: Promise<any>[] = [];
    for (const accessor of this.accessors) {
      promises.push(accessor.validate());
    }
    const values = await Promise.all(promises);
    return values.every(value => value);
  }

  @computed
  get addMode(): boolean {
    return this.parent.addMode;
  }

  @computed
  get isValid(): boolean {
    return this.accessors.every(accessor => accessor.isValid);
  }

  initialize() {
    const entries = this.state.getValue(this.path);
    let i = 0;
    entries.forEach(() => {
      this.createFormIndexedAccessor(i);
      i++;
    });
  }

  createFormIndexedAccessor(index: number) {
    const result = new RepeatingFormIndexedAccessor(
      this.state,
      this.repeatingForm.definition,
      this,
      index
    );
    this.repeatingFormIndexedAccessors.set(index, result);
    result.initialize();
  }

  index(index: number): RepeatingFormIndexedAccessor<M, D> {
    const accessor = this.repeatingFormIndexedAccessors.get(index);
    if (accessor == null) {
      throw new Error(`${index} is not a RepeatingFormIndexedAccessor`);
    }
    return accessor;
  }

  @computed
  get disabled(): boolean {
    return this.state.isRepeatingFormDisabledFunc(this);
  }

  @computed
  get accessors(): RepeatingFormIndexedAccessor<M, D>[] {
    const result = [];
    for (let index = 0; index < this.length; index++) {
      result.push(this.index(index));
    }
    return result;
  }

  @computed
  get flatAccessors(): Accessor[] {
    const result: Accessor[] = [];
    this.accessors.forEach(accessor => {
      result.push(...accessor.flatAccessors);
    });
    return result;
  }

  accessBySteps(steps: string[]): Accessor | undefined {
    const [first, ...rest] = steps;
    const nr = parseInt(first, 10);
    if (isNaN(nr)) {
      throw new Error("Expected index of repeating form");
    }
    const accessor = this.index(nr);
    return accessor.accessBySteps(rest);
  }

  @computed
  get error(): string | undefined {
    return this._error;
  }

  insert(index: number, node: any) {
    const path = this.path + "/" + index;
    applyPatch(this.state.node, [{ op: "add", path, value: node }]);
  }

  push(node: any) {
    const a = resolvePath(this.state.node, this.path) as any[];
    const path = this.path + "/" + a.length;
    applyPatch(this.state.node, [{ op: "add", path, value: node }]);
  }

  remove(node: any) {
    const a = resolvePath(this.state.node, this.path) as any[];
    const index = a.indexOf(node);
    if (index === -1) {
      throw new Error("Cannot find node to remove.");
    }
    applyPatch(this.state.node, [
      { op: "remove", path: this.path + "/" + index }
    ]);
  }

  removeIndex(index: number) {
    const accessors = this.repeatingFormIndexedAccessors;
    const isRemoved = accessors.delete(index);
    if (!isRemoved) {
      return;
    }
    const toDelete: number[] = [];
    const toInsert: RepeatingFormIndexedAccessor<any, any>[] = [];

    accessors.forEach((accessor, i) => {
      if (i <= index) {
        return;
      }
      accessor.setIndex(i - 1);
      toDelete.push(i);
      toInsert.push(accessor);
    });
    this.executeRenumber(toDelete, toInsert);
  }

  addIndex(index: number) {
    const accessors = this.repeatingFormIndexedAccessors;

    const toDelete: number[] = [];
    const toInsert: RepeatingFormIndexedAccessor<any, any>[] = [];
    accessors.forEach((accessor, i) => {
      if (i < index) {
        return;
      }
      accessor.setIndex(i + 1);
      toDelete.push(i);
      toInsert.push(accessor);
    });
    this.executeRenumber(toDelete, toInsert);
    this.createFormIndexedAccessor(index);
  }

  private executeRenumber(
    toDelete: number[],
    toInsert: RepeatingFormIndexedAccessor<any, any>[]
  ) {
    const accessors = this.repeatingFormIndexedAccessors;

    // first remove all accessors that are renumbered
    toDelete.forEach(index => {
      accessors.delete(index);
    });
    // insert renumbered accessors all at once afterwards
    toInsert.forEach(accessor => {
      accessors.set(accessor.index, accessor);
    });
  }

  get length(): number {
    const a = resolvePath(this.state.node, this.path) as any[];
    return a.length;
  }
}

export class RepeatingFormIndexedAccessor<M, D extends FormDefinition<M>>
  implements IFormAccessor<M, D> {
  formAccessor: FormAccessor<M, D>;

  @observable
  _error: string | undefined;

  @observable
  index: number;

  @observable
  _addMode: boolean = false;

  constructor(
    public state: FormState<any, any>,
    public definition: any,
    public parent: RepeatingFormAccessor<any, any>,
    index: number
  ) {
    this.index = index;
    this.formAccessor = new FormAccessor(state, definition, this, false);
  }

  initialize() {
    this.formAccessor.initialize();
  }

  clear() {
    this.formAccessor.flatAccessors.forEach(accessor => {
      accessor.clear();
    });
    return this.parent.removeIndex(this.index);
  }

  async validate(): Promise<boolean> {
    return this.formAccessor.validate();
  }

  @computed
  get path(): string {
    return this.parent.path + "/" + this.index;
  }

  @action
  setIndex(index: number) {
    this.index = index;
  }

  @action
  setError(error: string) {
    this._error = error;
  }

  @action
  setAddMode() {
    this._addMode = true;
  }

  @action
  clearError() {
    this._error = undefined;
  }

  @computed
  get error(): string | undefined {
    return this._error;
  }

  @computed
  get isValid(): boolean {
    return this.formAccessor.isValid;
  }

  @computed
  get addMode(): boolean {
    return this._addMode || this.parent.addMode;
  }

  access(name: string): Accessor | undefined {
    return this.formAccessor.access(name);
  }

  accessBySteps(steps: string[]): Accessor | undefined {
    if (steps.length === 0) {
      return this;
    }
    return this.formAccessor.accessBySteps(steps);
  }

  field<K extends keyof M>(name: K): FieldAccess<M, D, K> {
    return this.formAccessor.field(name);
  }

  repeatingForm<K extends keyof M>(name: K): RepeatingFormAccess<M, D, K> {
    return this.formAccessor.repeatingForm(name);
  }

  @computed
  get accessors(): Accessor[] {
    return this.formAccessor.accessors;
  }

  @computed
  get flatAccessors(): Accessor[] {
    return this.formAccessor.flatAccessors;
  }
}

// XXX this is so close to FormAccessor and RepeatingFormIndexedAccessor
// We need to consolidate the code.
export class SubFormAccessor<M, D extends FormDefinition<M>>
  implements IFormAccessor<M, D> {
  formAccessor: FormAccessor<M, D>;

  constructor(
    public state: FormState<any, any>,
    public definition: any,
    public parent: FormAccessor<any, any>,
    public name: string
  ) {
    this.name = name;
    this.formAccessor = new FormAccessor(state, definition, this, false);
  }

  initialize() {
    this.formAccessor.initialize();
  }

  async validate(): Promise<boolean> {
    return this.formAccessor.validate();
  }

  setError(error: string) {
    // no op
  }

  clearError() {
    // no op
  }

  clear() {
    // no op
  }

  @computed
  get path(): string {
    return this.parent.path + "/" + this.name;
  }

  @computed
  get isValid(): boolean {
    return this.formAccessor.isValid;
  }

  @computed
  get addMode(): boolean {
    return this.parent.addMode;
  }

  access(name: string): Accessor | undefined {
    return this.formAccessor.access(name);
  }

  accessBySteps(steps: string[]): Accessor | undefined {
    if (steps.length === 0) {
      return this;
    }
    return this.formAccessor.accessBySteps(steps);
  }

  field<K extends keyof M>(name: K): FieldAccess<M, D, K> {
    return this.formAccessor.field(name);
  }

  repeatingForm<K extends keyof M>(name: K): RepeatingFormAccess<M, D, K> {
    return this.formAccessor.repeatingForm(name);
  }

  @computed
  get accessors(): Accessor[] {
    return this.formAccessor.accessors;
  }

  @computed
  get flatAccessors(): Accessor[] {
    return this.formAccessor.flatAccessors;
  }
}
