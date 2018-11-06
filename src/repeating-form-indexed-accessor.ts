import { action, observable, computed } from "mobx";
import { FormDefinition, GroupDefinition } from "./form";
import { FormState } from "./state";
import { RepeatingFormAccessor } from "./repeating-form-accessor";
import { FormAccessorBase } from "./form-accessor-base";
import { FormAccessor } from "./form-accessor";

export class RepeatingFormIndexedAccessor<
  D extends FormDefinition<any>,
  G extends GroupDefinition<D>
> extends FormAccessorBase<D, G> {
  formAccessor: FormAccessor<D, G>;

  @observable
  index: number;

  @observable
  _addMode: boolean = false;

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

  clear() {
    this.formAccessor.flatAccessors.forEach(accessor => {
      accessor.clear();
    });
    return this.parent.removeIndex(this.index);
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
  setAddMode() {
    this._addMode = true;
  }

  @computed
  get addMode(): boolean {
    return this._addMode || this.parent.addMode;
  }
}
