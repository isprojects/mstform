import { action, computed } from "mobx";
import { FormDefinition } from "./form";
import {
  Accessor,
  FieldAccess,
  RepeatingFormAccess,
  SubFormAccess
} from "./accessor";
import { FormAccessor } from "./form-accessor";

// a base class that delegates to a form accessor
export abstract class FormAccessorBase<M, D extends FormDefinition<M>> {
  abstract formAccessor: FormAccessor<M, D>;

  initialize() {
    this.formAccessor.initialize();
  }

  async validate(): Promise<boolean> {
    return this.formAccessor.validate();
  }

  @action
  setError(error: string) {
    this.formAccessor.setError(error);
  }

  @action
  clearError() {
    this.formAccessor.clearError();
  }

  @computed
  get error(): string | undefined {
    return this.formAccessor.error;
  }

  @computed
  get isValid(): boolean {
    return this.formAccessor.isValid;
  }

  access(name: string): Accessor | undefined {
    return this.formAccessor.access(name);
  }

  accessBySteps(steps: string[]): Accessor | undefined {
    if (steps.length === 0) {
      if (this.formAccessor.parent == null) {
        throw new Error("Unknown parent");
      }
      return this.formAccessor.parent;
    }
    return this.formAccessor.accessBySteps(steps);
  }

  field<K extends keyof M>(name: K): FieldAccess<M, D, K> {
    return this.formAccessor.field(name);
  }

  repeatingForm<K extends keyof M>(name: K): RepeatingFormAccess<M, D, K> {
    return this.formAccessor.repeatingForm(name);
  }

  subForm<K extends keyof M>(name: K): SubFormAccess<M, D, K> {
    return this.formAccessor.subForm(name);
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
