import { computed, makeObservable, override } from "mobx";
import { IAnyModelType, Instance } from "mobx-state-tree";

import { FormDefinition, GroupDefinition } from "./form";
import { AnyFormState } from "./state";
import { FormAccessorBase } from "./form-accessor-base";
import { ISubFormAccessor, IAnyFormAccessor } from "./interfaces";

export class SubFormAccessor<
    D extends FormDefinition<M>,
    G extends GroupDefinition<D>,
    M extends IAnyModelType
  >
  extends FormAccessorBase<D, G, M>
  implements ISubFormAccessor<D, G, M>
{
  constructor(
    public state: AnyFormState,
    definition: D,
    groupDefinition: G | undefined,
    public parent: IAnyFormAccessor,
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
