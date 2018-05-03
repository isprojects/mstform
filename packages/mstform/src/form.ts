import {
  resolvePath,
  IStateTreeNode,
  applyPatch,
  types,
  getType,
  IModelType,
  IType
} from "mobx-state-tree";
import { identity, pathToSteps } from "./utils";
import { TypeFlags } from "./typeflags";

import { observable, action, computed, isObservable } from "mobx";

export type FormDefinition = {
  [key: string]:
    | Field<any, any>
    | RepeatingForm<any>
    | RepeatingField<any, any>;
};

export type FieldProps<T extends FormDefinition> = {
  [K in keyof T]: T[K] extends Field<any, any> ? K : never
};

export type Fields = {
  [key: string]: Field<any, any>;
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
  fields: Fields;

  constructor(
    public modelType: IModelType<any, any>,
    public definition: D,
    behavior?: FormBehavior
  ) {
    if (!behavior) {
      behavior = new FormBehavior();
    }
    this.behavior = behavior;
    const fields: Fields = {};
    Object.keys(definition).forEach(key => {
      const field = definition[key];
      if (field instanceof Field) {
        fields[key] = field;
      }
    });
    this.fields = fields;
  }

  create(node: IStateTreeNode): FormState<D> {
    return new FormState<D>(this, node);
  }
}

export class Field<R, V> {
  rawValidators: Validator<R>[];
  validators: Validator<V>[];
  getRaw: RawGetter<R>;

  constructor(public options?: FieldOptionDefinition<R, V>) {
    if (!options) {
      this.rawValidators = [];
      this.validators = [];
    } else {
      this.rawValidators = options.rawValidators ? options.rawValidators : [];
      this.validators = options.validators ? options.validators : [];
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
      return new ProcessResponse<V>(null, "conversion error");
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
      subType = (subType as IModelType<any, any>).properties[step];
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
      throw new Error("Cannot access non-field");
    }
    return new FieldAccessor(this, field, "", name);
  }

  repeatingField(name: string): any {}

  repeatingForm(name: string): any {}
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

  handleChange = async (...args: any[]) => {
    const raw = this.field.getRaw(...args);
    this.state.raw.set(this.path, raw);
    this.state.errors.delete(this.path);

    const processResult = await this.field.process(
      this.state.form.behavior,
      this.state.getMstType(this.path),
      raw
    );
    // XXX compare with previous raw?

    if (processResult.error != null) {
      this.state.errors.set(this.path, processResult.error);
      return;
    }

    applyPatch(this.state.node, [
      { op: "replace", path: this.path, value: processResult.value }
    ]);
  };
}
