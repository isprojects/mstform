import { action, computed, observable } from "mobx";
import { IType, onPatch, resolvePath } from "mobx-state-tree";
import {
  Accessor,
  ExtraValidation,
  FieldAccess,
  FieldAccessorAllows,
  FormAccessor,
  IFormAccessor,
  RepeatingFormAccess,
  RepeatingFormAccessorAllows
} from "./accessor";
import { Form, FormDefinition } from "./form";
import { SaveFunc, ValidationOption } from "./types";
import { addPath, getByPath, isInt, pathToSteps, removePath } from "./utils";

export interface FormStateOptions<M> {
  save?: SaveFunc<M>;
  addMode?: boolean;
  validation?: {
    beforeSave?: ValidationOption;
    afterSave?: ValidationOption;
    pauseDuration?: number;
  };
  isDisabled?: FieldAccessorAllows;
  isHidden?: FieldAccessorAllows;
  isRepeatingFormDisabled?: RepeatingFormAccessorAllows;
  extraValidation?: ExtraValidation;
}

export class FormState<M, D extends FormDefinition<M>>
  implements IFormAccessor<M, D> {
  @observable raw: Map<string, any>;
  @observable errors: Map<string, string>;
  @observable validating: Map<string, boolean>;
  @observable addModePaths: Map<string, boolean>;
  formAccessor: FormAccessor<M, D>;
  saveFunc: SaveFunc<M>;
  validationBeforeSave: ValidationOption;
  validationAfterSave: ValidationOption;
  validationPauseDuration: number;
  @observable saveStatus: "before" | "rightAfter" | "after" = "before";
  isDisabledFunc: FieldAccessorAllows;
  isHiddenFunc: FieldAccessorAllows;
  isRepeatingFormDisabledFunc: RepeatingFormAccessorAllows;
  extraValidationFunc: ExtraValidation;

  constructor(
    public form: Form<M, D>,
    public node: M,
    options?: FormStateOptions<M>
  ) {
    this.raw = observable.map();
    this.errors = observable.map();
    this.validating = observable.map();
    this.addModePaths = observable.map();

    onPatch(node, patch => {
      if (patch.op === "remove") {
        this.removePath(patch.path);
      } else if (patch.op === "add") {
        this.addPath(patch.path);
      }
    });
    this.formAccessor = new FormAccessor(this, this.form.definition, "");
    if (options == null) {
      this.saveFunc = defaultSaveFunc;
      this.isDisabledFunc = () => false;
      this.isHiddenFunc = () => false;
      this.isRepeatingFormDisabledFunc = () => false;
      this.extraValidationFunc = () => false;
      this.validationBeforeSave = "immediate";
      this.validationAfterSave = "immediate";
      this.validationPauseDuration = 0;
      this.addModePaths.set("/", false);
    } else {
      this.saveFunc = options.save ? options.save : defaultSaveFunc;
      this.isDisabledFunc = options.isDisabled
        ? options.isDisabled
        : () => false;
      this.isHiddenFunc = options.isHidden ? options.isHidden : () => false;
      this.isRepeatingFormDisabledFunc = options.isRepeatingFormDisabled
        ? options.isRepeatingFormDisabled
        : () => false;
      this.extraValidationFunc = options.extraValidation
        ? options.extraValidation
        : () => false;
      this.addModePaths.set("/", options.addMode || false);
      const validation = options.validation || {};
      this.validationBeforeSave = validation.beforeSave || "immediate";
      this.validationAfterSave = validation.afterSave || "immediate";
      this.validationPauseDuration = validation.pauseDuration || 0;
    }
  }

  @action
  setError(path: string, value: string) {
    this.errors.set(path, value);
  }

  @action
  deleteError(path: string) {
    this.errors.delete(path);
  }

  @action
  setValidating(path: string, value: boolean) {
    this.validating.set(path, value);
  }

  @action
  setRaw(path: string, value: any) {
    if (this.saveStatus === "rightAfter") {
      this.saveStatus = "after";
    }
    this.raw.set(path, value);
  }

  @action
  removePath(path: string) {
    this.raw = removePath(this.raw, path);
    this.errors = removePath(this.errors, path);
    this.validating = removePath(this.validating, path);
    this.addModePaths = removePath(this.addModePaths, path);
  }

  @action
  addPath(path: string) {
    this.raw = addPath(this.raw, path);
    this.errors = addPath(this.errors, path);
    this.validating = addPath(this.validating, path);
    this.addModePaths = addPath(this.addModePaths, path);
  }

  async validate(): Promise<boolean> {
    return await this.formAccessor.validate();
  }

  @action
  async save(): Promise<boolean> {
    const isValid = await this.validate();
    this.saveStatus = "rightAfter";
    if (!isValid) {
      return false;
    }
    let errors;

    errors = await this.saveFunc(this.node);
    if (errors != null) {
      this.setErrors(errors);
      return false;
    }
    this.clearErrors();
    return true;
  }

  @action
  setErrors(errors: any) {
    this.flatAccessors.map(accessor => {
      const error = getByPath(errors, accessor.path);
      if (error != null) {
        this.errors.set(accessor.path, error);
      }
    });
  }

  @action
  clearErrors() {
    this.errors.clear();
  }

  isKnownAddModePath(path: string): boolean {
    let found;
    this.addModePaths.forEach((value, key) => {
      if (path.startsWith(key)) {
        found = value;
        return;
      }
    });
    if (found === undefined) {
      return false;
    }
    return found;
  }

  addMode(path: string): boolean {
    return this.isKnownAddModePath(path) && this.raw.get(path) === undefined;
  }

  getValue(path: string): any {
    return resolvePath(this.node, path);
  }

  getError(path: string): string | undefined {
    return this.errors.get(path);
  }

  getMstType(path: string): IType<any, any> {
    const steps = pathToSteps(path);
    let subType: IType<any, any> = this.form.model;
    for (const step of steps) {
      if (isInt(step)) {
        subType = subType.getChildType(step);
        continue;
      }
      subType = subType.getChildType(step);
    }
    return subType;
  }

  @computed
  get isValidating(): boolean {
    return (
      Array.from(this.validating.values()).filter(value => value).length > 0
    );
  }

  @computed
  get accessors(): Accessor[] {
    return this.formAccessor.accessors;
  }

  @computed
  get flatAccessors(): Accessor[] {
    return this.formAccessor.flatAccessors;
  }

  field<K extends keyof M>(name: K): FieldAccess<M, D, K> {
    return this.formAccessor.field(name);
  }

  repeatingForm<K extends keyof M>(name: K): RepeatingFormAccess<M, D, K> {
    return this.formAccessor.repeatingForm(name);
  }

  repeatingField(name: string): any {}
}

async function defaultSaveFunc() {
  console.warn("No mstform save function configured");
  return null;
}
