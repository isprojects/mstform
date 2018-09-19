import { action, observable, computed } from "mobx";
import { FormDefinition } from "./form";
import { FormState } from "./state";
import { Accessor, FieldAccess, RepeatingFormAccess } from "./accessor";
import { RepeatingFormAccessor } from "./repeating-form-accessor";
import { FormAccessor } from "./form-accessor";

export class RepeatingFormIndexedAccessor<M, D extends FormDefinition<M>> {
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
