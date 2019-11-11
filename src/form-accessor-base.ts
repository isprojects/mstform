import { observable, computed, action } from "mobx";

import {
  SubForm,
  Field,
  FormDefinition,
  RepeatingForm,
  GroupDefinition,
  Group
} from "./form";
import {
  FieldAccess,
  RepeatingFormAccess,
  SubFormAccess,
  GroupAccess
} from "./accessor";
import { FieldAccessor } from "./field-accessor";
import { GroupAccessor } from "./group-accessor";
import { ValidateOptions } from "./validate-options";
import {
  IAccessor,
  IFormAccessor,
  ISubFormAccessor,
  IRepeatingFormAccessor,
  IParentAccessor
} from "./interfaces";
import { AccessorBase } from "./accessor-base";

export abstract class FormAccessorBase<
  D extends FormDefinition<any>,
  G extends GroupDefinition<D>
> extends AccessorBase implements IFormAccessor<D, G> {
  public keys: (keyof D)[];
  fieldAccessors: Map<keyof D, FieldAccessor<any, any>> = observable.map();
  repeatingFormAccessors: Map<
    keyof D,
    IRepeatingFormAccessor<any, any>
  > = observable.map();
  subFormAccessors: Map<keyof D, ISubFormAccessor<any, any>> = observable.map();
  groupAccessors: Map<keyof G, GroupAccessor<any>> = observable.map();

  abstract path: string;

  constructor(
    public definition: any,
    public groupDefinition: any,
    parent: IParentAccessor,
    addMode: boolean
  ) {
    super(parent);
    this.keys = Object.keys(this.definition);
    this._addMode = addMode;
  }

  validate(options?: ValidateOptions): boolean {
    const values = this.accessors.map(accessor => accessor.validate(options));
    const ignoreGetError = options != null ? options.ignoreGetError : false;
    if (!ignoreGetError) {
      values.push(this.errorValue === undefined); // add possible error of the form itself
    }
    return values.every(value => value);
  }

  dispose() {
    // no op
  }

  @computed
  get value(): any {
    return this.state.getValue(this.path);
  }

  @computed
  get isValid(): boolean {
    return this.accessors.every(accessor => accessor.isValid);
  }

  @computed
  get accessors(): IAccessor[] {
    const result: IAccessor[] = [];

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

  @action
  setAddModeDefaults(addModeDefaults: string[]) {
    const fieldrefSet = new Set<string>();
    const fieldrefPrefix = this.fieldref !== "" ? this.fieldref + "." : "";

    addModeDefaults.forEach(fieldref => {
      fieldrefSet.add(fieldrefPrefix + fieldref);
    });
    this.accessors.forEach(accessor => {
      if (accessor instanceof FieldAccessor) {
        if (fieldrefSet.has(accessor.fieldref)) {
          if (accessor.field.derivedFunc == null) {
            accessor.setRawFromValue();
          } else {
            accessor.setValueAndRawWithoutChangeEvent(
              accessor.field.derivedFunc(accessor.node)
            );
          }
        }
      }
    });
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

  access(name: string): IAccessor | undefined {
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

  accessBySteps(steps: string[]): IAccessor | undefined {
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
    const result = new FieldAccessor(
      this.state,
      field,
      this as IFormAccessor<D, G>,
      name as string
    );
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
    repeatingForm: RepeatingForm<any, any>
  ) {
    const result = this.state.createRepeatingFormAccessor(
      repeatingForm,
      this as FormAccessorBase<any, any>,
      name as string
    );
    this.repeatingFormAccessors.set(name, result);
  }

  repeatingForm<K extends keyof D>(name: K): RepeatingFormAccess<D, K> {
    const accessor = this.repeatingFormAccessors.get(name);
    if (accessor == null) {
      throw new Error(`${name} is not a RepeatingForm`);
    }
    return accessor;
  }

  createSubForm<K extends keyof D>(name: K, subForm: SubForm<any, any>) {
    const result = this.state.createSubFormAccessor(
      subForm.definition,
      subForm.groupDefinition,
      this as FormAccessorBase<any, any>,
      name as string
    );
    this.subFormAccessors.set(name, result);
  }

  subForm<K extends keyof D>(name: K): SubFormAccess<D, K> {
    const accessor = this.subFormAccessors.get(name);
    if (accessor == null) {
      throw new Error(`${name} is not a SubForm`);
    }
    return accessor;
  }

  createGroup<K extends keyof G>(name: K, group: Group<any>) {
    const result = new GroupAccessor(this.state, this.definition, this, group);
    this.groupAccessors.set(name, result);
  }

  group<K extends keyof G>(name: K): GroupAccess<D> {
    const accessor = this.groupAccessors.get(name);
    if (accessor == null) {
      throw new Error(`${name} is not a Group`);
    }
    return accessor;
  }

  repeatingField(name: string): any {
    // not implemented yet
  }
}
