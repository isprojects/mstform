import { computed } from "mobx";
import { FormDefinition, Group } from "./form";
import { FormState } from "./state";
import { FormAccessor } from "./form-accessor";

export class GroupAccessor<D extends FormDefinition<any>> {
  constructor(
    public state: FormState<any, any, any>,
    public definition: D,
    public parent: FormAccessor<any, any>,
    public group: Group<D>
  ) {}

  @computed
  get isValid(): boolean {
    const include = this.group.options.include;
    const exclude = this.group.options.exclude;
    if (include != null && exclude != null) {
      throw new Error("Cannot include and exclude fields at the same time.");
    }
    if (include != null) {
      return this.isValidForNames(include);
    }
    if (exclude != null) {
      return this.isValidForNames(this.notExcluded(exclude));
    }
    throw new Error("Must include or exclude some fields");
  }

  @computed
  get isWarningFree(): boolean {
    const include = this.group.options.include;
    if (include != null) {
      return this.isWarningFreeForNames(include);
    }
    throw new Error("Must include fields to determine warnings");
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
      return !accessor.hasWarning;
    });
  }
}
