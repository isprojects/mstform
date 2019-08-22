import { computed } from "mobx";
import { FormDefinition, Group } from "./form";
import { FormState } from "./state";
import { FormAccessorBase } from "./form-accessor-base";

export class GroupAccessor<D extends FormDefinition<any>> {
  constructor(
    public state: FormState<any, any, any>,
    public definition: D,
    public parent: FormAccessorBase<any, any>,
    public group: Group<D>
  ) {}

  @computed
  get isValid(): boolean {
    return this.hasFeedback(this.isValidForNames.bind(this));
  }

  @computed
  get isWarningFree(): boolean {
    return this.hasFeedback(this.isWarningFreeForNames.bind(this));
  }

  hasFeedback(feedbackFunc: Function): boolean {
    const include = this.group.options.include;
    const exclude = this.group.options.exclude;
    if (include != null && exclude != null) {
      throw new Error("Cannot include and exclude fields at the same time.");
    }
    if (include != null) {
      return feedbackFunc(include);
    }
    if (exclude != null) {
      return feedbackFunc(this.notExcluded(exclude));
    }
    throw new Error("Must include or exclude some fields");
  }

  notExcluded(names: (keyof D)[]): (keyof D)[] {
    const keys = this.parent.keys as (keyof D)[];
    return keys.filter(name => !names.includes(name));
  }

  isValidForNames(names: (keyof D)[]): boolean {
    return names.every(key => {
      const accessor = this.parent.access(key as string);
      if (accessor == null) {
        return true;
      }
      return accessor.isValid;
    });
  }

  isWarningFreeForNames(names: (keyof D)[]): boolean {
    return names.every(key => {
      const accessor = this.parent.access(key as string);
      if (accessor == null) {
        return true;
      }
      return accessor.isWarningFree;
    });
  }
}
