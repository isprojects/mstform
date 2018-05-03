import { observable, action, computed, isObservable } from "mobx";
import {
  resolvePath,
  IStateTreeNode,
  applyPatch,
  types,
  getType,
  IModelType,
  IType
} from "mobx-state-tree";
import { identity, pathToSteps, isInt, equal, unwrap } from "./utils";
import { TypeFlags } from "./typeflags";

export type FormDefinition = {
  [key: string]:
    | Field<any, any>
    | RepeatingForm<any>
    | RepeatingField<any, any>;
};

export type FieldProps<T extends FormDefinition> = {
  [K in keyof T]: T[K] extends Field<any, any> ? K : never
};

export type RepeatingFormProps<T extends FormDefinition> = {
  [K in keyof T]: T[K] extends RepeatingForm<any> ? K : never
};

export type RepeatingFieldProps<T extends FormDefinition> = {
  [K in keyof T]: T[K] extends RepeatingField<any, any> ? K : never
};

export type ValidationResponse = string | null | undefined | false;

export type Converter<R, V> = {
  convert(raw: R): V | undefined;
  render(value: V): R;
};

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

  create(node: IStateTreeNode): FormState<D> {
    return new FormState<D>(this, node);
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

  constructor(public form: Form<D>, public node: IStateTreeNode) {
    this.raw = observable.map();
    this.errors = observable.map();
  }

  async validate(): Promise<boolean> {
    const promises: Promise<any>[] = [];
    Object.keys(this.form.definition).forEach(key => {
      const field = this.form.definition[key];
      if (field instanceof Field) {
        const sub = this.field(key);
        promises.push(sub.validate());
      }
    });
    const values = await Promise.all(promises);

    // If any value is not empty, that means that the form is invalid
    // and so, we return false
    const errors = values.filter(e => !!e);
    return errors.length === 0;
  }

  // async save() {
  //   if (this._save == null) {
  //     throw Error("No save configured");
  //   }
  //   const isValid = await this.validate();
  //   if (!isValid) {
  //     return false;
  //   }
  //   const errors = await this._save(this.value);
  //   if (errors != null) {
  //     this.setErrors(errors);
  //     return false;
  //   }
  //   this.clearErrors();
  //   return true;
  // }

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

  field<K extends keyof FieldProps<D>>(
    name: K
  ): FieldAccessor<
    D,
    D[K] extends Field<any, any> ? D[K]["rawType"] : never,
    D[K] extends Field<any, any> ? D[K]["valueType"] : never
  > {
    const field = this.form.definition[name];
    if (!(field instanceof Field)) {
      throw new Error("Not accessing a Field instance");
    }
    return new FieldAccessor(this, field, "", name);
  }

  repeatingForm<K extends keyof RepeatingFormProps<D>>(
    name: string
  ): RepeatingFormAccessor<
    D,
    D[K] extends RepeatingForm<any> ? D[K]["definition"] : never
  > {
    const repeatingForm = this.form.definition[name];
    if (!(repeatingForm instanceof RepeatingForm)) {
      throw new Error("Not accessing a RepeatingForm instance");
    }
    return new RepeatingFormAccessor(this, repeatingForm, "", name);
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

  async validate(): Promise<boolean> {
    await this.setRaw(this.raw);
    return this.error === undefined;
  }

  async setRaw(raw: R) {
    this.state.raw.set(this.path, raw);
    this.state.errors.delete(this.path);
    let processResult;
    try {
      processResult = await this.field.process(
        this.state.form.behavior,
        this.state.getMstType(this.path),
        raw
      );
    } catch (e) {
      this.state.errors.set(this.path, "Something went wrong");
      return;
    }

    const currentRaw = this.state.raw.get(this.path);

    // if the raw changed in the mean time, bail out
    if (!equal(unwrap(currentRaw), unwrap(raw))) {
      return;
    }

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

  index(index: number): RepeatingFormIndexedAccessor<D, R> {
    return new RepeatingFormIndexedAccessor(this.state, this, this.path, index);
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

  constructor(
    public state: FormState<D>,
    public repeatingFormAccessor: RepeatingFormAccessor<D, R>,
    path: string,
    public index: number
  ) {
    this.path = path + "/" + index;
  }

  field<K extends keyof FieldProps<R>>(
    name: K
  ): FieldAccessor<
    D,
    R[K] extends Field<any, any> ? R[K]["rawType"] : never,
    R[K] extends Field<any, any> ? R[K]["valueType"] : never
  > {
    const field = this.repeatingFormAccessor.repeatingForm.definition[name];
    if (!(field instanceof Field)) {
      throw new Error("Not accessing a Field instance");
    }
    return new FieldAccessor(
      this.repeatingFormAccessor.state,
      field,
      this.path,
      name
    );
  }
}
