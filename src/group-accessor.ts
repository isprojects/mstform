import { computed } from "mobx";
import { FormDefinition, Group } from "./form";
import { FormState } from "./state";
import { FormAccessor } from "./form-accessor";

export class GroupAccessor<M, D extends FormDefinition<M>> {
  constructor(
    public state: FormState<any, any, any>,
    public definition: D,
    public parent: FormAccessor<any, any>,
    public group: Group<D>
  ) {}

  @computed
  get isValid(): boolean {
    const include = this.group.options.include;
    if (include == null) {
      return true;
    }
    return include.every(key => {
      const accessor = this.parent.access(key as string);
      if (accessor == null) {
        return true;
      }
      return accessor.isValid;
    });
  }
}
