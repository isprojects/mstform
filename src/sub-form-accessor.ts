import { computed } from "mobx";

import { FormDefinition, GroupDefinition } from "./form";
import { FormState } from "./state";
import { FormAccessorBase } from "./form-accessor-base";
import { ISubFormAccessor, IFormAccessor } from "./interfaces";

export class SubFormAccessor<
  D extends FormDefinition<any>,
  G extends GroupDefinition<D>
> extends FormAccessorBase<D, G> implements ISubFormAccessor<D, G> {
  constructor(
    public state: FormState<any, any, any>,
    definition: D,
    groupDefinition: G | undefined,
    public parent: IFormAccessor<any, any>,
    public name: string
  ) {
    super(definition, groupDefinition, parent, false);
    this.name = name;
    this.initialize();
  }

  @computed
  get path(): string {
    return this.parent.path + "/" + this.name;
  }

  @computed
  get value(): any {
    return this.state.getValue(this.path);
  }
}
