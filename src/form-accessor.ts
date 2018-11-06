import { observable, computed, action } from "mobx";
import {
  SubForm,
  Field,
  FormDefinition,
  RepeatingForm,
  GroupDefinition,
  Group
} from "./form";
import { FormState } from "./state";
import {
  Accessor,
  FieldAccess,
  RepeatingFormAccess,
  SubFormAccess,
  GroupAccess
} from "./accessor";
import { FieldAccessor } from "./field-accessor";
import { SubFormAccessor } from "./sub-form-accessor";
import { RepeatingFormAccessor } from "./repeating-form-accessor";
import { RepeatingFormIndexedAccessor } from "./repeating-form-indexed-accessor";
import { GroupAccessor } from "./group-accessor";
import { ValidateOptions } from "./validate-options";

export class FormAccessor<
  D extends FormDefinition<any>,
  G extends GroupDefinition<any, D>
> {
  private keys: string[];
  fieldAccessors: Map<keyof D, FieldAccessor<any, any>> = observable.map();
  repeatingFormAccessors: Map<
    keyof D,
    RepeatingFormAccessor<any, any>
  > = observable.map();
  subFormAccessors: Map<
    keyof D,
    SubFormAccessor<any, any, any>
  > = observable.map();
  groupAccessors: Map<keyof G, GroupAccessor<any, any>> = observable.map();

  @observable
  _addMode: boolean;

  constructor(
    public state: FormState<any, D, G>,
    public definition: any,
    public groupDefinition: any,
    public parent:
      | FormAccessor<any, any>
      | SubFormAccessor<any, any, any>
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

  async validate(options?: ValidateOptions): Promise<boolean> {
    const promises = this.accessors.map(accessor => accessor.validate(options));
    const values = await Promise.all(promises);
    const ignoreGetError = options != null ? options.ignoreGetError : false;
    if (!ignoreGetError) {
      values.push(this.errorValue === undefined); // add possible error of the form itself
    }
    return values.every(value => value);
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
        result.push(this.field(key as keyof D));
      } else if (entry instanceof RepeatingForm) {
        result.push(this.repeatingForm(key as keyof D));
      } else if (entry instanceof SubForm) {
        result.push(this.subForm(key as keyof D));
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
      return this.field(name as keyof D);
    } catch {
      try {
        return this.repeatingForm(name as keyof D);
      } catch {
        try {
          return this.subForm(name as keyof D);
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
        this.createField(key as keyof D, entry);
      } else if (entry instanceof RepeatingForm) {
        this.createRepeatingForm(key as keyof D, entry);
      } else if (entry instanceof SubForm) {
        this.createSubForm(key as keyof D, entry);
      }
    });
    if (this.groupDefinition != null) {
      // we don't have access to the group definition here yet
      Object.keys(this.groupDefinition).forEach(key => {
        const entry = this.groupDefinition[key];
        this.createGroup(key, entry);
      });
    }
  }

  createField<K extends keyof D>(name: K, field: Field<any, any>) {
    const result = new FieldAccessor(this.state, field, this, name as string);
    this.fieldAccessors.set(name, result);
  }

  field<K extends keyof D>(name: K): FieldAccess<D, K> {
    const accessor = this.fieldAccessors.get(name);
    if (accessor == null) {
      throw new Error(`${name} is not a Field`);
    }
    return accessor;
  }

  createRepeatingForm<K extends keyof D>(
    name: K,
    repeatingForm: RepeatingForm<any, any, any>
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

  repeatingForm<K extends keyof D>(name: K): RepeatingFormAccess<D, K> {
    const accessor = this.repeatingFormAccessors.get(name);
    if (accessor == null) {
      throw new Error(`${name} is not a RepeatingForm`);
    }
    return accessor;
  }

  createSubForm<K extends keyof D>(name: K, subForm: SubForm<any, any, any>) {
    const result = new SubFormAccessor(
      this.state,
      subForm.definition,
      subForm.groupDefinition,
      this,
      name as string
    );
    this.subFormAccessors.set(name, result);
    result.initialize();
  }

  subForm<K extends keyof D>(name: K): SubFormAccess<D, K> {
    const accessor = this.subFormAccessors.get(name);
    if (accessor == null) {
      throw new Error(`${name} is not a SubForm`);
    }
    return accessor;
  }

  createGroup<K extends keyof G>(name: K, group: Group<any, any>) {
    const result = new GroupAccessor(this.state, this.definition, this, group);
    this.groupAccessors.set(name, result);
  }

  group<K extends keyof G>(name: K): GroupAccess<any, D> {
    const accessor = this.groupAccessors.get(name);
    if (accessor == null) {
      throw new Error(`${name} is not a Group`);
    }
    return accessor;
  }

  repeatingField(name: string): any {
    // not implemented yet
  }

  @computed
  get errorValue(): string | undefined {
    return this.state.getErrorFunc(this);
  }

  @computed
  get error(): string | undefined {
    return this.errorValue;
  }

  @computed
  get warningValue(): string | undefined {
    return this.state.getWarningFunc(this);
  }

  @computed
  get warning(): string | undefined {
    return this.warningValue;
  }
}
