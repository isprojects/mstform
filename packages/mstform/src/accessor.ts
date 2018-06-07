import { action, computed, isObservable, toJS, reaction } from "mobx";
import { applyPatch, resolvePath } from "mobx-state-tree";
import {
  ArrayEntryType,
  Field,
  FormDefinition,
  FormDefinitionType,
  ProcessValue,
  RawType,
  RepeatingForm,
  ValidationMessage
} from "./form";
import { FormState } from "./state";
import { ValidationResponse } from "./types";
import { equal, unwrap } from "./utils";

export interface FieldAccessorAllows {
  (fieldAccessor: FieldAccessor<any, any, any>): boolean;
}

export interface ExtraValidation {
  (fieldAccessor: FieldAccessor<any, any, any>, value: any): ValidationResponse;
}

export interface RepeatingFormAccessorAllows {
  (repeatingFormAccessor: RepeatingFormAccessor<any, any>): boolean;
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

  field<K extends keyof M>(name: K): FieldAccess<M, D, K>;

  repeatingForm<K extends keyof M>(name: K): RepeatingFormAccess<M, D, K>;

  accessors: Accessor[];

  flatAccessors: Accessor[];
}

export class FormAccessor<M, D extends FormDefinition<M>>
  implements IFormAccessor<M, D> {
  constructor(
    public state: FormState<M, D>,
    public definition: any,
    public node: M,
    public path: string
  ) {}

  async validate(): Promise<boolean> {
    const promises = this.accessors.map(accessor => accessor.validate());
    const values = await Promise.all(promises);
    return values.filter(value => !value).length === 0;
  }

  @computed
  get accessors(): Accessor[] {
    const result: Accessor[] = [];

    Object.keys(this.definition).forEach(key => {
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

  field<K extends keyof M>(name: K): FieldAccess<M, D, K> {
    const field = this.definition[name];
    if (!(field instanceof Field)) {
      throw new Error("Not accessing a Field instance");
    }
    return new FieldAccessor(this.state, field, this.node, this.path, name);
  }

  repeatingForm<K extends keyof M>(name: K): RepeatingFormAccess<M, D, K> {
    const repeatingForm = this.definition[name];
    if (!(repeatingForm instanceof RepeatingForm)) {
      throw new Error("Not accessing a RepeatingForm instance");
    }

    // we know that the node is an array of M[] at this point
    const nodes = (this.node[name] as any) as M[];

    return new RepeatingFormAccessor(
      this.state,
      repeatingForm,
      nodes,
      this.path,
      name
    );
  }

  repeatingField(name: string): any {}
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
    process;
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
    if (!equal(unwrap(currentRaw), unwrap(raw))) {
      return;
    }
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
    if (equal(unwrap(this.value), unwrap(processResult.value))) {
      return;
    }

    applyPatch(this.state.node, [
      { op: "replace", path: this.path, value: processResult.value }
    ]);
    const changeFunc = this.field.changeFunc;
    if (changeFunc != null) {
      changeFunc(this.node, processResult.value);
    }
  }

  handleChange = async (...args: any[]) => {
    const raw = this.field.getRaw(...args);
    await this.setRaw(raw);
  };

  @computed
  get inputProps() {
    return {
      disabled: this.disabled,
      value: this.raw,
      onChange: this.handleChange
    };
  }

  @computed
  get validationProps() {
    const error = this.error;
    const isValidating = this.isValidating;
    if (!error) {
      return { validateStatus: isValidating ? "validating" : "" };
    }
    return {
      validateStatus: isValidating ? "validating" : "error",
      help: error
    };
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
    return values.filter(value => !value).length === 0;
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

  @computed
  get error(): string | undefined {
    return this.state.errors.get(this.path);
  }

  insert(index: number, node: any) {
    const path = this.path + "/" + index;
    applyPatch(this.state.node, [{ op: "add", path, value: node }]);
    // XXX ideally move this logic into onPatch handler
    this.state.addModePaths.set(path, true);
  }

  push(node: any) {
    const a = resolvePath(this.state.node, this.path) as any[];
    const path = this.path + "/" + a.length;
    applyPatch(this.state.node, [{ op: "add", path, value: node }]);
    // XXX ideally move this logic into onPatch handler
    this.state.addModePaths.set(path, true);
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
