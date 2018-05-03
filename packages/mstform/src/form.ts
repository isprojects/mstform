import { observable, action, computed, isObservable } from "mobx";
import {
  resolvePath,
  IStateTreeNode,
  applyPatch,
  types,
  getType,
  IModelType,
  IType,
  onPatch
} from "mobx-state-tree";
import {
  identity,
  pathToSteps,
  isInt,
  equal,
  unwrap,
  getByPath
} from "./utils";
import { TypeFlags } from "./typeflags";

export type FormDefinition = {
  [key: string]:
    | Field<any, any>
    | RepeatingForm<any>
    | RepeatingField<any, any>;
};

export type FieldProps<T extends FormDefinition> = {
  [K in keyof T]: T[K] extends Field<any, any> ? T[K] : never
};

export type RepeatingFormProps<T extends FormDefinition> = {
  [K in keyof T]: T[K] extends RepeatingForm<any> ? T[K] : never
};

export type RepeatingFieldProps<T extends FormDefinition> = {
  [K in keyof T]: T[K] extends RepeatingField<any, any> ? T[K] : never
};

export type ValidationResponse = string | null | undefined | false;

export type Converter<R, V> = {
  convert(raw: R): V | undefined;
  render(value: V): R;
};

export type Accessor<D extends FormDefinition> =
  | FieldAccessor<D, any, any>
  | RepeatingFormAccessor<D, any>
  | RepeatingFormIndexedAccessor<D, any>;

export interface RawGetter<R> {
  (...args: any[]): R;
}

export interface Validator<V> {
  (value: V): ValidationResponse | Promise<ValidationResponse>;
}

export interface FieldOptionDefinition<R, V> {
  rawValidators?: Validator<R>[];
  validators?: Validator<V>[];
  converter?: Converter<R, V>;
  getRaw?: RawGetter<R>;
  conversionError?: string;
}

export interface SaveFunc {
  (node: IStateTreeNode): any;
}

export interface FormStateOptions {
  save?: SaveFunc;
}

export class ProcessResponse<TValue> {
  value: TValue | null;
  error: string | null;

  constructor(value: TValue | null, error: string | null) {
    this.value = value;
    this.error = error;
  }
}

const numberConverter: Converter<string, number> = {
  render(value: number): string {
    return value.toString();
  },
  convert(raw: string): number | undefined {
    const result = parseInt(raw, 10);
    if (isNaN(result)) {
      return undefined;
    }
    return result;
  }
};

export class FormBehavior {
  getConverter(mstType: IType<any, any>): Converter<any, any> | undefined {
    if (mstType.flags & TypeFlags.Number) {
      return numberConverter;
    }
    return { convert: identity, render: identity };
  }
  getRawGetter(mstType: any): RawGetter<any> {
    return identity;
  }
}

export class Form<D extends FormDefinition> {
  behavior: FormBehavior;

  constructor(
    public modelType: IModelType<any, any>,
    public definition: D,
    behavior?: FormBehavior
  ) {
    if (!behavior) {
      behavior = new FormBehavior();
    }
    this.behavior = behavior;
  }

  create(node: IStateTreeNode, options?: FormStateOptions): FormState<D> {
    return new FormState<D>(this, node, options);
  }
}

export class Field<R, V> {
  rawValidators: Validator<R>[];
  validators: Validator<V>[];
  getRaw: RawGetter<R>;
  conversionError: string;

  constructor(public options?: FieldOptionDefinition<R, V>) {
    if (!options) {
      this.rawValidators = [];
      this.validators = [];
      this.conversionError = "Could not convert";
    } else {
      this.rawValidators = options.rawValidators ? options.rawValidators : [];
      this.validators = options.validators ? options.validators : [];
      this.conversionError = options.conversionError || "Could not convert";
    }

    if (!options || options.getRaw == null) {
      this.getRaw = (...args) => args[0] as R;
    } else {
      this.getRaw = options.getRaw;
    }
  }

  get rawType(): R {
    throw new Error("fail");
  }

  get valueType(): V {
    throw new Error("fail");
  }

  converter(behavior: FormBehavior, mstType: IType<any, any>): Converter<R, V> {
    if (this.options == null || this.options.converter == null) {
      const converter = behavior.getConverter(mstType);
      if (converter == null) {
        throw new Error("Cannot convert");
      }
      return converter;
    }
    return this.options.converter;
  }

  convert(
    behavior: FormBehavior,
    mstType: IType<any, any>,
    raw: R
  ): V | undefined {
    const converter = this.converter(behavior, mstType);
    return converter.convert(raw);
  }
  render(behavior: FormBehavior, mstType: IType<any, any>, value: V): R {
    const converter = this.converter(behavior, mstType);
    return converter.render(value);
  }

  async process(
    behavior: FormBehavior,
    mstType: IType<any, any>,
    raw: R
  ): Promise<ProcessResponse<V>> {
    for (const validator of this.rawValidators) {
      const validationResponse = await validator(raw);
      if (typeof validationResponse === "string" && validationResponse) {
        return new ProcessResponse<V>(null, validationResponse);
      }
    }
    const result = this.convert(behavior, mstType, raw);
    if (result === undefined) {
      return new ProcessResponse<V>(null, this.conversionError);
    }
    for (const validator of this.validators) {
      const validationResponse = await validator(result);
      if (typeof validationResponse === "string" && validationResponse) {
        return new ProcessResponse<V>(null, validationResponse);
      }
    }
    return new ProcessResponse<V>(result, null);
  }
}

export class RepeatingForm<D extends FormDefinition> {
  constructor(public definition: D) {}
}

export class RepeatingField<R, V> {
  constructor(public options?: FieldOptionDefinition<R, V>) {}
}

export class FormState<D extends FormDefinition> {
  raw: Map<string, any>;
  errors: Map<string, string>;
  validating: Map<string, boolean>;
  formAccessor: FormAccessor<D, D>;
  saveFunc?: SaveFunc;

  constructor(
    public form: Form<D>,
    public node: IStateTreeNode,
    options?: FormStateOptions
  ) {
    this.raw = observable.map();
    this.errors = observable.map();
    this.validating = observable.map();
    onPatch(node, patch => {
      if (patch.op === "remove") {
        this.removeInfo(patch.path);
      }
    });
    this.formAccessor = new FormAccessor(this, this.form.definition, "");
    if (options == null) {
      this.saveFunc = undefined;
    } else {
      this.saveFunc = options.save;
    }
  }

  @action
  removeInfo(path: string) {
    this.raw.forEach((value, key) => {
      if (key.startsWith(path)) {
        this.raw.delete(key);
      }
    });
    this.errors.forEach((value, key) => {
      if (key.startsWith(path)) {
        this.errors.delete(key);
      }
    });
    this.validating.forEach((value, key) => {
      if (key.startsWith(path)) {
        this.validating.delete(key);
      }
    });
  }

  async validate(): Promise<boolean> {
    return await this.formAccessor.validate();
  }

  async save(): Promise<boolean> {
    if (this.saveFunc == null) {
      throw Error("No save configured");
    }
    const isValid = await this.validate();
    if (!isValid) {
      return false;
    }
    const errors = await this.saveFunc(this.node);
    if (errors != null) {
      this.setErrors(errors);
      return false;
    }
    this.clearErrors();
    return true;
  }

  @action
  setErrors(errors: any) {
    this.flatAccessors.map(accessor => {
      const error = getByPath(errors, accessor.path);
      if (error != null) {
        this.errors.set(accessor.path, error);
      }
    });
  }

  @action
  clearErrors() {
    this.errors.clear();
  }

  getValue(path: string): any {
    return resolvePath(this.node, path);
  }

  getError(path: string): string | undefined {
    return this.errors.get(path);
  }

  getMstType(path: string): IType<any, any> {
    const steps = pathToSteps(path);
    let subType: IType<any, any> = this.form.modelType;
    for (const step of steps) {
      if (isInt(step)) {
        subType = subType.getChildType(step);
        continue;
      }
      subType = subType.getChildType(step);
    }
    return subType;
  }

  @computed
  get isValidating(): boolean {
    return (
      Array.from(this.validating.values()).filter(value => value).length > 0
    );
  }

  @computed
  get accessors(): Accessor<D>[] {
    return this.formAccessor.accessors;
  }

  @computed
  get flatAccessors(): Accessor<D>[] {
    return this.formAccessor.flatAccessors;
  }

  field<K extends keyof FieldProps<D>>(
    name: K
  ): FieldAccessor<
    D,
    D[K] extends Field<any, any> ? D[K]["rawType"] : never,
    D[K] extends Field<any, any> ? D[K]["valueType"] : never
  > {
    return this.formAccessor.field(name);
  }

  repeatingForm<K extends keyof RepeatingFormProps<D>>(
    name: string
  ): RepeatingFormAccessor<
    D,
    D[K] extends RepeatingForm<any> ? D[K]["definition"] : never
  > {
    return this.formAccessor.repeatingForm(name);
  }

  repeatingField(name: string): any {}
}

export class FormAccessor<D extends FormDefinition, R extends FormDefinition> {
  constructor(
    public state: FormState<D>,
    public definition: R,
    public path: string
  ) {}

  async validate(): Promise<boolean> {
    const promises = this.accessors.map(accessor => accessor.validate());
    const values = await Promise.all(promises);
    return values.filter(value => !value).length === 0;
  }

  @computed
  get accessors(): Accessor<D>[] {
    const result: Accessor<D>[] = [];

    Object.keys(this.definition).forEach(key => {
      const entry = this.definition[key];
      if (entry instanceof Field) {
        result.push(this.field(key));
      } else if (entry instanceof RepeatingForm) {
        result.push(this.repeatingForm(key));
      }
    });
    return result;
  }

  @computed
  get flatAccessors(): Accessor<D>[] {
    const result: Accessor<D>[] = [];
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

  field<K extends keyof FieldProps<D>>(
    name: K
  ): FieldAccessor<
    D,
    R[K] extends Field<any, any> ? R[K]["rawType"] : never,
    R[K] extends Field<any, any> ? R[K]["valueType"] : never
  > {
    const field = this.definition[name];
    if (!(field instanceof Field)) {
      throw new Error("Not accessing a Field instance");
    }
    return new FieldAccessor(this.state, field, this.path, name);
  }

  repeatingForm<K extends keyof RepeatingFormProps<D>>(
    name: string
  ): RepeatingFormAccessor<
    D,
    R[K] extends RepeatingForm<any> ? R[K]["definition"] : never
  > {
    const repeatingForm = this.definition[name];
    if (!(repeatingForm instanceof RepeatingForm)) {
      throw new Error("Not accessing a RepeatingForm instance");
    }
    return new RepeatingFormAccessor(
      this.state,
      repeatingForm,
      this.path,
      name
    );
  }

  repeatingField(name: string): any {}
}

export class FieldAccessor<D extends FormDefinition, R, V> {
  path: string;
  name: string;

  constructor(
    public state: FormState<D>,
    public field: Field<R, V>,
    path: string,
    name: string
  ) {
    this.name = name;
    this.path = path + "/" + name;
  }

  @computed
  get raw(): R {
    const result = this.state.raw.get(this.path);
    if (result !== undefined) {
      return result as R;
    }
    return this.field.render(
      this.state.form.behavior,
      this.state.getMstType(this.path),
      this.state.getValue(this.path)
    );
  }

  @computed
  get value(): V {
    return this.state.getValue(this.path);
  }

  @computed
  get error(): string | undefined {
    return this.state.getError(this.path);
  }

  @computed
  get isValidating(): boolean {
    return this.state.validating.get(this.path) || false;
  }

  async validate(): Promise<boolean> {
    await this.setRaw(this.raw);
    return this.error === undefined;
  }

  @action
  async setRaw(raw: R) {
    this.state.raw.set(this.path, raw);
    this.state.errors.delete(this.path);
    this.state.validating.set(this.path, true);
    let processResult;
    try {
      processResult = await this.field.process(
        this.state.form.behavior,
        this.state.getMstType(this.path),
        raw
      );
    } catch (e) {
      this.state.errors.set(this.path, "Something went wrong");
      this.state.validating.set(this.path, false);
      return;
    }

    const currentRaw = this.state.raw.get(this.path);

    // if the raw changed in the mean time, bail out
    if (!equal(unwrap(currentRaw), unwrap(raw))) {
      return;
    }
    this.state.validating.set(this.path, false);

    if (processResult.error != null) {
      this.state.errors.set(this.path, processResult.error);
      return;
    }

    applyPatch(this.state.node, [
      { op: "replace", path: this.path, value: processResult.value }
    ]);
  }

  handleChange = async (...args: any[]) => {
    const raw = this.field.getRaw(...args);
    await this.setRaw(raw);
  };
}

export class RepeatingFormAccessor<
  D extends FormDefinition,
  R extends FormDefinition
> {
  name: string;
  path: string;

  constructor(
    public state: FormState<D>,
    public repeatingForm: RepeatingForm<R>,
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

  index(index: number): RepeatingFormIndexedAccessor<D, R> {
    return new RepeatingFormIndexedAccessor(
      this.state,
      this.repeatingForm.definition,
      this.path,
      index
    );
  }

  @computed
  get accessors(): RepeatingFormIndexedAccessor<D, R>[] {
    const result = [];
    for (let index = 0; index < this.length; index++) {
      result.push(this.index(index));
    }
    return result;
  }

  @computed
  get flatAccessors(): Accessor<D>[] {
    const result: Accessor<D>[] = [];
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
    const a = resolvePath(this.state.node, this.path) as any[];
    const copy = a.slice();
    copy.splice(index, 0, node);
    applyPatch(this.state.node, [
      { op: "replace", path: this.path, value: copy }
    ]);
  }

  push(node: any) {
    const a = resolvePath(this.state.node, this.path) as any[];
    const copy = a.slice();
    copy.push(node);
    applyPatch(this.state.node, [
      { op: "replace", path: this.path, value: copy }
    ]);
  }

  remove(node: any) {
    const a = resolvePath(this.state.node, this.path) as any[];
    const copy = a.slice();
    const index = copy.indexOf(node);
    if (index === -1) {
      throw new Error("Cannot find node to remove.");
    }
    copy.splice(index, 1);
    applyPatch(this.state.node, [
      { op: "replace", path: this.path, value: copy }
    ]);
  }

  get length(): number {
    const a = resolvePath(this.state.node, this.path) as any[];
    return a.length;
  }
}

export class RepeatingFormIndexedAccessor<
  D extends FormDefinition,
  R extends FormDefinition
> {
  path: string;
  formAccessor: FormAccessor<D, R>;

  constructor(
    public state: FormState<D>,
    public definition: R,
    path: string,
    public index: number
  ) {
    this.path = path + "/" + index;
    this.formAccessor = new FormAccessor(state, definition, path + "/" + index);
  }

  async validate(): Promise<boolean> {
    return this.formAccessor.validate();
  }

  field<K extends keyof FieldProps<R>>(
    name: K
  ): FieldAccessor<
    D,
    R[K] extends Field<any, any> ? R[K]["rawType"] : never,
    R[K] extends Field<any, any> ? R[K]["valueType"] : never
  > {
    return this.formAccessor.field(name);
  }

  repeatingForm<K extends keyof RepeatingFormProps<D>>(
    name: string
  ): RepeatingFormAccessor<
    D,
    R[K] extends RepeatingForm<any> ? R[K]["definition"] : never
  > {
    return this.formAccessor.repeatingForm(name);
  }

  @computed
  get accessors(): Accessor<D>[] {
    return this.formAccessor.accessors;
  }

  @computed
  get flatAccessors(): Accessor<D>[] {
    return this.formAccessor.flatAccessors;
  }
}
