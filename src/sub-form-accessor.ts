import { computed } from "mobx";
import { FormDefinition } from "./form";
import { FormState } from "./state";
import { FormAccessor } from "./form-accessor";
import { FormAccessorBase } from "./form-accessor-base";
import { ValidateOptions } from "./validate-options";

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

  async validate(options?: ValidateOptions): Promise<boolean> {
    const promises = this.accessors.map(accessor => accessor.validate(options));
    const values = await Promise.all(promises);
    const ignoreGetError = options != null ? options.ignoreGetError : false;
    if (!ignoreGetError) {
      values.push(this.errorValue === undefined);
    }
    return values.every(value => value);
  }

  @computed
  get path(): string {
    return this.parent.path + "/" + this.name;
  }

  @computed
  get addMode(): boolean {
    return this.parent.addMode;
  }
}
