import { computed } from "mobx";
import { FormDefinition } from "./form";
import { FormState } from "./state";
import { FormAccessor } from "./form-accessor";
import { FormAccessorBase } from "./form-accessor-base";

export class SubFormAccessor<
  M,
  D extends FormDefinition<M>
> extends FormAccessorBase<M, D> {
  formAccessor: FormAccessor<M, D>;

  constructor(
    public state: FormState<any, any>,
    public definition: any,
    public parent: FormAccessor<any, any>,
    public name: string
  ) {
    super();
    this.name = name;
    this.formAccessor = new FormAccessor(state, definition, this, false);
  }

  clear() {
    // no op
  }

  async validate(): Promise<boolean> {
    return this.errorValue === undefined;
  }

  @computed
  get path(): string {
    return this.parent.path + "/" + this.name;
  }

  @computed
  get addMode(): boolean {
    return this.parent.addMode;
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
