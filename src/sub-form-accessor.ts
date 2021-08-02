import { computed, makeObservable, override } from "mobx";
import { IAnyModelType, Instance } from "mobx-state-tree";

import { FormDefinition, GroupDefinition } from "./form";
import { FormState } from "./state";
import { FormAccessorBase } from "./form-accessor-base";
import { ISubFormAccessor, IFormAccessor } from "./interfaces";

export class SubFormAccessor<
    D extends FormDefinition<M>,
    G extends GroupDefinition<D>,
    M extends IAnyModelType
  >
  extends FormAccessorBase<D, G, M>
  implements ISubFormAccessor<D, G, M>
{
  constructor(
    public state: FormState<any, any, any>,
    definition: D,
    groupDefinition: G | undefined,
    public parent: IFormAccessor<any, any, any>,
    public name: string
  ) {
    super(definition, groupDefinition, parent, false);
    makeObservable(this);
    this.name = name;
    this.initialize();
  }

  @computed
  get path(): string {
    return this.parent.path + "/" + this.name;
  }

  @override
  get value(): Instance<M> {
    return this.state.getValue(this.path);
  }

  @override
  get isValid(): boolean {
    return (
      this.errorValue == null &&
      this.accessors.every((accessor) => accessor.isValid)
    );
  }
}
