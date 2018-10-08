import { action, observable, computed } from "mobx";
import { FormDefinition } from "./form";
import { FormState } from "./state";
import { RepeatingFormAccessor } from "./repeating-form-accessor";
import { FormAccessorBase } from "./form-accessor-base";
import { FormAccessor } from "./form-accessor";

export class RepeatingFormIndexedAccessor<
  M,
  D extends FormDefinition<M>
> extends FormAccessorBase<M, D> {
  formAccessor: FormAccessor<M, D>;

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
    super();
    this.index = index;
    this.formAccessor = new FormAccessor(state, definition, this, false);
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
