import { computed, makeObservable } from "mobx";
import { FormDefinition, Group } from "./form";
import { AnyFormState } from "./state";
import { FormAccessorBase } from "./form-accessor-base";

export class GroupAccessor<D extends FormDefinition<any>> {
  constructor(
    public state: AnyFormState,
    public definition: D,
    public parent: FormAccessorBase<any, any, any>,
    public group: Group<D>
  ) {
    makeObservable(this);
  }

  @computed
  get isValid(): boolean {
    return this.hasFeedback(this.isValidForNames.bind(this));
  }

  @computed
  get isWarningFree(): boolean {
    return this.hasFeedback(this.isWarningFreeForNames.bind(this));
  }

  @computed
  get isDirty(): boolean {
    return this.hasFeedback(this.isDirtyForNames.bind(this));
  }

  hasFeedback(feedbackFunc: (names: (keyof D)[]) => boolean): boolean {
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
    return keys.filter((name) => !names.includes(name));
  }

  isValidForNames(names: (keyof D)[]): boolean {
    return names.every((key) => {
      const accessor = this.parent.access(key as string);
      if (accessor == null) {
        return true;
      }
      return accessor.isValid;
    });
  }

  isWarningFreeForNames(names: (keyof D)[]): boolean {
    return names.every((key) => {
      const accessor = this.parent.access(key as string);
      if (accessor == null) {
        return true;
      }
      return accessor.isWarningFree;
    });
  }

  isDirtyForNames(names: (keyof D)[]): boolean {
    return names.some((key) => {
      const accessor = this.parent.access(key as string);
      if (accessor == null) {
        return false;
      }
      return accessor.isDirty;
    });
  }
}
