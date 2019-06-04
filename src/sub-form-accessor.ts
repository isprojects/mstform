import { computed } from "mobx";
import { FormDefinition, GroupDefinition } from "./form";
import { FormState } from "./state";
import { FormAccessor } from "./form-accessor";
import { FormAccessorBase } from "./form-accessor-base";
import { ValidateOptions } from "./validate-options";
import { pathToFieldref } from "./utils";
import { ExternalMessages } from "./validationMessages";
import { IFormAccessor } from "./interfaces";

export class SubFormAccessor<
  D extends FormDefinition<any>,
  G extends GroupDefinition<D>
> extends FormAccessorBase<D, G> implements IFormAccessor<D, G> {
  formAccessor: FormAccessor<D, G>;

  externalErrors = new ExternalMessages();
  externalWarnings = new ExternalMessages();

  constructor(
    public state: FormState<any, any, any>,
    public definition: D,
    public groupDefinition: G | undefined,
    public parent: FormAccessor<any, any>,
    public name: string
  ) {
    super();
    this.name = name;
    this.formAccessor = new FormAccessor(
      state,
      definition,
      groupDefinition,
      this,
      false
    );
  }

  dispose() {
    // no op
  }

  clear() {
    // no op
  }

  validate(options?: ValidateOptions): boolean {
    const values = this.accessors.map(accessor => accessor.validate(options));
    const ignoreGetError = options != null ? options.ignoreGetError : false;
    if (!ignoreGetError) {
      values.push(this.errorValue === undefined);
    }
    return values.every(value => value);
  }

  @computed
  get disabled(): boolean {
    return this.parent.disabled ? true : this.state.isDisabledFunc(this);
  }

  @computed
  get hidden(): boolean {
    return this.parent.hidden ? true : this.state.isHiddenFunc(this);
  }

  @computed
  get readOnly(): boolean {
    return this.parent.readOnly ? true : this.state.isReadOnlyFunc(this);
  }

  @computed
  get inputAllowed(): boolean {
    return !this.disabled && !this.hidden && !this.readOnly;
  }

  @computed
  get path(): string {
    return this.parent.path + "/" + this.name;
  }

  @computed
  get fieldref(): string {
    return pathToFieldref(this.path);
  }

  @computed
  get value(): any {
    return this.state.getValue(this.path);
  }

  @computed
  get addMode(): boolean {
    return this.parent.addMode;
  }
}
