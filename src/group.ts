import { IModelType } from "mobx-state-tree";
import { IFormAccessor } from "./accessor";
import { FormDefinition } from "./form";

export class Group<M> {
  constructor(
    public model: IModelType<any, M>,
    public allowedKeys: (keyof M)[]
  ) {}

  access<D extends FormDefinition<M>>(formAccessor: IFormAccessor<M, D>) {
    return formAccessor.restricted(this.allowedKeys);
  }
}
