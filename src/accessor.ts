import { action, computed, isObservable, toJS, reaction, comparer } from "mobx";
import { applyPatch, resolvePath } from "mobx-state-tree";
import {
  ArrayEntryType,
  Field,
  FormDefinition,
  FormDefinitionEntry,
  FormDefinitionType,
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
  | FieldAccessor<any, any, any>
  | RepeatingFormAccessor<any, any>
  | RepeatingFormIndexedAccessor<any, any>;

export type FieldAccess<
  M,
  D extends FormDefinition<M>,
  K extends keyof M
> = FieldAccessor<M, RawType<D[K]>, M[K]>;

export type RepeatingFormAccess<
  M,
  D extends FormDefinition<M>,
  K extends keyof M
> = RepeatingFormAccessor<ArrayEntryType<M[K]>, FormDefinitionType<D[K]>>;

export interface IFormAccessor<M, D extends FormDefinition<M>> {
  validate(): Promise<boolean>;

  isValid: boolean;

  restricted<K extends keyof M>(allowedKeys: K[]): IFormAccessor<M, D>;

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

  constructor(
    public state: FormState<M, D>,
    public definition: any,
    public node: M,
    public path: string,
    public allowedKeys?: string[]
  ) {
    this.keys =
      allowedKeys != null ? allowedKeys : Object.keys(this.definition);
  }

  async validate(): Promise<boolean> {
    const promises = this.accessors.map(accessor => accessor.validate());
    const values = await Promise.all(promises);
    return values.every(value => value);
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
      }
    });
    return result;
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
        return undefined;
      }
    }
  }

  accessBySteps(steps: string[]): Accessor | undefined {
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

  private getDefinitionEntry<K extends keyof M>(
    name: K
  ): FormDefinitionEntry<M, K> | undefined {
    if (!this.keys.includes(name as string)) {
      return undefined;
    }
    return this.definition[name];
  }

  restricted<K extends keyof M>(allowedKeys: K[]): IFormAccessor<M, D> {
    allowedKeys.forEach(key => {
      if (!this.keys.includes(key as string)) {
        throw new Error(
          "Cannot restrict FormAccessor to non-existent key: " + key
        );
      }
    });
    return new FormAccessor(
      this.state,
      this.definition,
      this.node,
      this.path,
      allowedKeys as string[]
    );
  }

  field<K extends keyof M>(name: K): FieldAccess<M, D, K> {
    const field = this.getDefinitionEntry(name);
    if (field == null) {
      throw new Error(`Field ${name} is not in group`);
    }
    if (!(field instanceof Field)) {
      throw new Error("Not accessing a Field instance");
    }
    return new FieldAccessor(
      this.state,
      field,
      this.node,
      this.path,
      name as string
    );
  }

  repeatingForm<K extends keyof M>(name: K): RepeatingFormAccess<M, D, K> {
    const repeatingForm = this.getDefinitionEntry(name);
    if (repeatingForm == null) {
      throw new Error(`RepeatingForm ${name} is not in group`);
    }
    if (!(repeatingForm instanceof RepeatingForm)) {
      throw new Error("Not accessing a RepeatingForm instance");
    }

    const nodes = (this.node[name] as any) as ArrayEntryType<M[K]>[];

    return new RepeatingFormAccessor(
      this.state,
      repeatingForm,
      nodes,
      this.path,
      name as string
    );
  }

  repeatingField(name: string): any {
    // not implemented yet
  }
}

export class FieldAccessor<M, R, V> {
  path: string;
  name: string;

  constructor(
    public state: FormState<any, any>,
    public field: Field<R, V>,
    public node: M,
    path: string,
    name: string
  ) {
    this.name = name;
    this.path = path + "/" + name;

    this.createDerivedReaction();
  }

  createDerivedReaction() {
    const derivedFunc = this.field.derivedFunc;
    if (derivedFunc == null) {
      return;
    }

    if (this.state.derivedDisposers.get(this.path)) {
      return;
    }
    const disposer = reaction(
      () => derivedFunc(this.node),
      derivedValue => {
        this.setRaw(this.field.render(derivedValue));
      }
    );
    this.state.setDerivedDisposer(this.path, disposer);
  }

  @computed
  get addMode(): boolean {
    return this.state.addMode(this.path);
  }

  @computed
  get raw(): R {
    const result = this.state.raw.get(this.path);
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
    return this.state.getError(this.path);
  }

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
    return this.state.validating.get(this.path) || false;
  }

  @computed
  get disabled(): boolean {
    return this.state.isDisabledFunc(this);
  }

  @computed
  get hidden(): boolean {
    return this.state.isHiddenFunc(this);
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
    this.state.setRaw(this.path, raw);
    this.state.setValidating(this.path, true);
    let processResult;
    try {
      // XXX is await correct here? we should await the result
      // later
      processResult = await this.field.process(raw);
    } catch (e) {
      this.state.setError(this.path, "Something went wrong");
      this.state.setValidating(this.path, false);
      return;
    }

    const currentRaw = this.state.raw.get(this.path);

    // if the raw changed in the mean time, bail out
    if (!comparer.structural(currentRaw, raw)) {
      return;
    }
    // validation only is complete if the currentRaw has been validated
    this.state.setValidating(this.path, false);

    if (processResult instanceof ValidationMessage) {
      this.state.setError(this.path, processResult.message);
      return;
    } else {
      this.state.deleteError(this.path);
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
      this.state.setError(this.path, extraResult);
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
  path: string;

  constructor(
    public state: FormState<any, any>,
    public repeatingForm: RepeatingForm<M, D>,
    public nodes: M[],
    path: string,
    name: string
  ) {
    this.name = name;
    this.path = path + "/" + name;
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
  get isValid(): boolean {
    return this.accessors.every(accessor => accessor.isValid);
  }

  index(index: number): RepeatingFormIndexedAccessor<M, D> {
    return new RepeatingFormIndexedAccessor(
      this.state,
      this.repeatingForm.definition,
      this.nodes[index],
      this.path,
      index
    );
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
    return this.state.errors.get(this.path);
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

  get length(): number {
    const a = resolvePath(this.state.node, this.path) as any[];
    return a.length;
  }
}

export class RepeatingFormIndexedAccessor<M, D extends FormDefinition<M>>
  implements IFormAccessor<M, D> {
  path: string;
  formAccessor: FormAccessor<M, D>;

  constructor(
    public state: FormState<any, any>,
    public definition: any,
    public node: M,
    path: string,
    public index: number
  ) {
    this.path = path + "/" + index;
    this.formAccessor = new FormAccessor(
      state,
      definition,
      node,
      path + "/" + index
    );
  }

  async validate(): Promise<boolean> {
    return this.formAccessor.validate();
  }

  @computed
  get isValid(): boolean {
    return this.formAccessor.isValid;
  }

  access(name: string): Accessor | undefined {
    return this.formAccessor.access(name);
  }

  accessBySteps(steps: string[]): Accessor | undefined {
    const [first, ...rest] = steps;
    const accessor = this.access(first);
    if (rest.length === 0) {
      return accessor;
    }
    if (accessor === undefined) {
      return undefined;
    }
    return accessor.accessBySteps(steps);
  }

  restricted<K extends keyof M>(allowedKeys: K[]): IFormAccessor<M, D> {
    return this.formAccessor.restricted(allowedKeys);
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
