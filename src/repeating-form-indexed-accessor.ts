import { action, observable, computed } from "mobx";

import { FormDefinition, GroupDefinition } from "./form";
import { FormState } from "./state";
import { FormAccessorBase } from "./form-accessor-base";
import {
  IRepeatingFormIndexedAccessor,
  IRepeatingFormAccessor
} from "./interfaces";

export class RepeatingFormIndexedAccessor<
  D extends FormDefinition<any>,
  G extends GroupDefinition<D>
> extends FormAccessorBase<D, G>
  implements IRepeatingFormIndexedAccessor<D, G> {
  @observable
  index: number;

  constructor(
    public state: FormState<any, any, any>,
    definition: D,
    groupDefinition: G | undefined,
    public parent: IRepeatingFormAccessor<D, G>,
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
    this.setAddModeDefaults(addModeDefaults);
  }

  @computed
  get addMode(): boolean {
    return this._addMode || this.parent.addMode;
  }
}
