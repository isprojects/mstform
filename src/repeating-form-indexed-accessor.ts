import { action, observable, computed } from "mobx";

import { FormDefinition, GroupDefinition } from "./form";
import { FormState } from "./state";
import { RepeatingFormAccessor } from "./repeating-form-accessor";
import { setAddModeDefaults } from "./addMode";
import { FormAccessorBase } from "./form-accessor-base";
import { FormAccessor } from "./form-accessor";
import { pathToFieldref } from "./utils";
import { ExternalMessages } from "./validationMessages";
import { IAccessor } from "./interfaces";

export class RepeatingFormIndexedAccessor<
  D extends FormDefinition<any>,
  G extends GroupDefinition<D>
> extends FormAccessorBase<D, G> implements IAccessor {
  formAccessor: FormAccessor<D, G>;

  @observable
  index: number;

  @observable
  _addMode: boolean = false;

  externalErrors = new ExternalMessages();
  externalWarnings = new ExternalMessages();

  constructor(
    public state: FormState<any, any, any>,
    public definition: D,
    public groupDefinition: G | undefined,
    public parent: RepeatingFormAccessor<D, G>,
    index: number
  ) {
    super();
    this.index = index;
    this.formAccessor = new FormAccessor(
      state,
      definition,
      groupDefinition,
      this,
      false
    );
  }

  dispose() {
    // no op
  }

  clear() {
    this.formAccessor.flatAccessors.forEach(accessor => {
      accessor.clear();
    });
    return this.parent.removeIndex(this.index);
  }

  @computed
  get disabled(): boolean {
    return this.parent.disabled ? true : this.state.isDisabledFunc(this);
  }

  @computed
  get hidden(): boolean {
    return this.parent.hidden ? true : this.state.isHiddenFunc(this);
  }

  @computed
  get readOnly(): boolean {
    return this.parent.readOnly ? true : this.state.isReadOnlyFunc(this);
  }

  @computed
  get inputAllowed(): boolean {
    return !this.disabled && !this.hidden && !this.readOnly;
  }

  @computed
  get path(): string {
    return this.parent.path + "/" + this.index;
  }

  @computed
  get fieldref(): string {
    return pathToFieldref(this.path);
  }

  @computed
  get value(): any {
    return this.state.getValue(this.path);
  }

  @action
  setIndex(index: number) {
    this.index = index;
  }

  @action
  setAddMode(addModeDefaults: string[]) {
    this._addMode = true;
    setAddModeDefaults(this.formAccessor, addModeDefaults);
  }

  @computed
  get addMode(): boolean {
    return this._addMode || this.parent.addMode;
  }
}
