import { computed } from "mobx";
import { FormDefinition } from "./form";
import { FormState } from "./state";
import { Accessor, FieldAccess, RepeatingFormAccess } from "./accessor";
import { FormAccessor } from "./form-accessor";

// XXX this is so close to FormAccessor and RepeatingFormIndexedAccessor
// We need to consolidate the code.
export class SubFormAccessor<M, D extends FormDefinition<M>> {
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
