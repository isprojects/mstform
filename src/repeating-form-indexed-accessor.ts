import { action, observable, computed } from "mobx";
import { IAnyModelType, Instance } from "mobx-state-tree";

import { FormDefinition, GroupDefinition } from "./form";
import { FormState } from "./state";
import { FormAccessorBase } from "./form-accessor-base";
import {
  IRepeatingFormIndexedAccessor,
  IRepeatingFormAccessor
} from "./interfaces";

export class RepeatingFormIndexedAccessor<
  D extends FormDefinition<M>,
  G extends GroupDefinition<D>,
  M extends IAnyModelType
> extends FormAccessorBase<D, G, M>
  implements IRepeatingFormIndexedAccessor<D, G, M> {
  @observable
  index: number;

  constructor(
    public state: FormState<any, any, any>,
    definition: D,
    groupDefinition: G | undefined,
    public parent: IRepeatingFormAccessor<D, G, M>,
    index: number
  ) {
    super(definition, groupDefinition, parent, false);
    this.index = index;
    this.initialize();
  }

  clear() {
    this.flatAccessors.forEach(accessor => {
      accessor.clear();
    });
    this.parent.removeIndex(this.index);
    this.dispose();
  }

  @computed
  get path(): string {
    return this.parent.path + "/" + this.index;
  }

  @computed
  get isValid(): boolean {
    return (
      this.errorValue == null &&
      this.accessors.every(accessor => accessor.isValid)
    );
  }

  @computed
  get value(): Instance<M> {
    return this.state.getValue(this.path);
  }

  @action
  setIndex(index: number) {
    this.index = index;
  }

  @action
  setAddMode(addModeDefaults: string[]) {
    this._addMode = true;
    this.setAddModeDefaults(addModeDefaults);
  }

  @computed
  get addMode(): boolean {
    return this._addMode || this.parent.addMode;
  }
}
