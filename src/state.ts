import { action, computed, observable, IReactionDisposer } from "mobx";
import { IType, onPatch, resolvePath, applyPatch } from "mobx-state-tree";
import {
  Accessor,
  ExtraValidation,
  FieldAccess,
  FieldAccessor,
  FieldAccessorAllows,
  FormAccessor,
  IFormAccessor,
  RepeatingFormAccess,
  RepeatingFormAccessorAllows,
  RepeatingFormAccessor,
  RepeatingFormIndexedAccessor,
  SubFormAccess
} from "./accessor";
import { Form, FormDefinition, Field } from "./form";
import {
  deepCopy,
  deleteByPath,
  getByPath,
  isInt,
  pathToSteps,
  stepsToPath
} from "./utils";

export interface SaveFunc<M> {
  (node: M): any;
}

export interface FocusFunc<M, R, V> {
  (event: any, accessor: FieldAccessor<M, R, V>): void;
}

// TODO: implement blur and pause validation
// blur would validate immediately after blur
// pause would show validation after the user stops input for a while
export type ValidationOption = "immediate" | "no"; //  | "blur" | "pause";

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
  isReadOnly?: FieldAccessorAllows;
  isRepeatingFormDisabled?: RepeatingFormAccessorAllows;
  extraValidation?: ExtraValidation;
  focus?: FocusFunc<M, any, any>;
}

export type SaveStatusOptions = "before" | "rightAfter" | "after";

export class FormState<M, D extends FormDefinition<M>>
  implements IFormAccessor<M, D> {
  // @observable
  // raw: Map<string, any>;

  // @observable
  // errors: Map<string, string>;

  @observable
  additionalErrorTree: any;

  // @observable
  // validating: Map<string, boolean>;

  // @observable
  // addModePaths: Map<string, boolean>;

  @observable
  derivedDisposers: Map<string, IReactionDisposer>;

  @observable
  saveStatus: SaveStatusOptions = "before";

  formAccessor: FormAccessor<M, D>;
  saveFunc: SaveFunc<M>;
  validationBeforeSave: ValidationOption;
  validationAfterSave: ValidationOption;
  validationPauseDuration: number;
  isDisabledFunc: FieldAccessorAllows;
  isHiddenFunc: FieldAccessorAllows;
  isReadOnlyFunc: FieldAccessorAllows;
  isRepeatingFormDisabledFunc: RepeatingFormAccessorAllows;
  extraValidationFunc: ExtraValidation;
  private noRawUpdate: boolean;
  focusFunc: FocusFunc<M, any, any> | null;

  constructor(
    public form: Form<M, D>,
    public node: M,
    options?: FormStateOptions<M>
  ) {
    //    this.raw = observable.map();
    // this.errors = observable.map();
    // this.validating = observable.map();
    // this.addModePaths = observable.map();
    this.derivedDisposers = observable.map();
    this.additionalErrorTree = {};
    this.noRawUpdate = false;

    onPatch(node, patch => {
      if (patch.op === "remove") {
        this.removePath(patch.path);
      } else if (patch.op === "add") {
        this.addPath(patch.path);
      } else if (patch.op === "replace") {
        this.replacePath(patch.path);
      }
    });

    const addMode: boolean = options != null ? options.addMode || false : false;

    this.formAccessor = new FormAccessor(
      this,
      this.form.definition,
      null,
      addMode
    );
    if (options == null) {
      this.saveFunc = defaultSaveFunc;
      this.isDisabledFunc = () => false;
      this.isHiddenFunc = () => false;
      this.isReadOnlyFunc = () => false;
      this.isRepeatingFormDisabledFunc = () => false;
      this.extraValidationFunc = () => false;
      this.validationBeforeSave = "immediate";
      this.validationAfterSave = "immediate";
      this.validationPauseDuration = 0;
      // this.addModePaths.set("/", false);
      this.focusFunc = null;
    } else {
      this.saveFunc = options.save ? options.save : defaultSaveFunc;
      this.isDisabledFunc = options.isDisabled
        ? options.isDisabled
        : () => false;
      this.isHiddenFunc = options.isHidden ? options.isHidden : () => false;
      this.isReadOnlyFunc = options.isReadOnly
        ? options.isReadOnly
        : () => false;
      this.isRepeatingFormDisabledFunc = options.isRepeatingFormDisabled
        ? options.isRepeatingFormDisabled
        : () => false;
      this.extraValidationFunc = options.extraValidation
        ? options.extraValidation
        : () => false;
      // this.addModePaths.set("/", options.addMode || false);
      const validation = options.validation || {};
      this.validationBeforeSave = validation.beforeSave || "immediate";
      this.validationAfterSave = validation.afterSave || "immediate";
      this.validationPauseDuration = validation.pauseDuration || 0;
      this.focusFunc = options.focus ? options.focus : null;
    }
  }

  // @action
  // setError(path: string, value: string) {
  //   this.errors.set(path, value);
  // }

  // @action
  // deleteError(path: string) {
  //   this.errors.delete(path);
  // }

  // @action
  // setValidating(path: string, value: boolean) {
  //   this.validating.set(path, value);
  // }

  @action
  setSaveStatus(status: SaveStatusOptions) {
    this.saveStatus = status;
  }

  // @action
  // setRaw(path: string, value: any) {
  //   if (this.saveStatus === "rightAfter") {
  //     this.setSaveStatus("after");
  //   }
  //   this.raw.set(path, value);
  // }

  @action
  setValueWithoutRawUpdate(path: string, value: any) {
    this.noRawUpdate = true;
    applyPatch(this.node, [{ op: "replace", path, value }]);
    this.noRawUpdate = false;
  }

  @action
  setDerivedDisposer(path: string, disposer: IReactionDisposer) {
    this.derivedDisposers.set(path, disposer);
  }

  @action
  replacePath(path: string) {
    if (this.noRawUpdate) {
      return;
    }
    const fieldAccessor = this.accessByPath(path);
    if (
      fieldAccessor === undefined ||
      !(fieldAccessor instanceof FieldAccessor)
    ) {
      // if this is any other accessor or undefined, we cannot re-render
      // as there is no raw
      return;
    }
    // set raw from value directly without re-converting
    fieldAccessor.setRawFromValue();
  }

  @action
  removePath(path: string) {
    const accessor = this.accessByPath(path);
    if (
      accessor === undefined ||
      !(accessor instanceof RepeatingFormIndexedAccessor)
    ) {
      // if this isn't a repeating indexed accessor we don't need to react
      return;
    }
    accessor.remove();

    // this.derivedDisposers = removePath(
    //   this.derivedDisposers,
    //   path,
    //   (value: IReactionDisposer) => {
    //     value();
    //   }
    // );
    // this.addModePaths.set(path, true);
  }

  @action
  addPath(path: string) {
    // we want to avoid accessing the newly added item directly, as
    // that would add it to the accessor map
    const steps = pathToSteps(path);
    if (steps.length === 0) {
      return;
    }
    const index = parseInt(steps[steps.length - 1], 10);
    // we don't care about insertions of non-indexed things
    if (isNaN(index)) {
      return;
    }

    const accessor = this.accessByPath(
      stepsToPath(steps.slice(0, steps.length - 1))
    );
    if (
      accessor === undefined ||
      !(accessor instanceof RepeatingFormAccessor)
    ) {
      // if this isn't a repeating indexed accessor we don't need to react
      return;
    }

    accessor.addIndex(index);

    // this.raw = addPath(this.raw, path);
    // this.errors = addPath(this.errors, path);
    // this.validating = addPath(this.validating, path);
    // this.addModePaths = addPath(this.addModePaths, path);
    // this.derivedDisposers = addPath(this.derivedDisposers, path);
    // this.addModePaths.set(path, true);
  }

  async validate(): Promise<boolean> {
    return this.formAccessor.validate();
  }

  @computed
  get isValid(): boolean {
    return this.formAccessor.isValid;
  }

  @action
  async save(): Promise<boolean> {
    const isValid = await this.validate();
    this.setSaveStatus("rightAfter");
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
    const additionalErrors = deepCopy(errors);
    this.flatAccessors.map(accessor => {
      const error = getByPath(errors, accessor.path);
      if (error != null) {
        accessor.setError(error);
        // this.errors.set(accessor.path, error);
        // delete from remaining structure
        deleteByPath(additionalErrors, accessor.path);
      }
    });
    this.additionalErrorTree = additionalErrors;
  }

  @action
  clearErrors() {
    this.additionalErrorTree = {};
    this.flatAccessors.map(accessor => {
      accessor.clearError();
    });
  }

  // isKnownAddModePath(path: string): boolean {
  //   let found;
  //   let foundKey = "";
  //   this.addModePaths.forEach((value, key) => {
  //     if (path.startsWith(key)) {
  //       if (key.length < foundKey.length) {
  //         return;
  //       }
  //       foundKey = key;
  //       found = value;
  //       return;
  //     }
  //   });
  //   if (found === undefined) {
  //     return false;
  //   }
  //   return found;
  // }

  // addMode(path: string): boolean {
  //   return this.isKnownAddModePath(path) && this.raw.get(path) === undefined;
  // }

  getValue(path: string): any {
    return resolvePath(this.node, path);
  }

  // getError(path: string): string | undefined {
  //   return this.errors.get(path);
  // }

  // XXX we can remove this from the API?
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
    return this.flatAccessors.some(
      accessor =>
        accessor instanceof FieldAccessor ? accessor.isValidating : false
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

  accessByPath(path: string): Accessor | undefined {
    const steps = pathToSteps(path);
    return this.accessBySteps(steps);
  }

  accessBySteps(steps: string[]): Accessor | undefined {
    return this.formAccessor.accessBySteps(steps);
  }

  access(name: string): Accessor | undefined {
    return this.formAccessor.access(name);
  }

  restricted<K extends keyof M>(allowedKeys: K[]): IFormAccessor<M, D> {
    return this.formAccessor.restricted(allowedKeys);
  }

  field<K extends keyof M>(name: K): FieldAccess<M, D, K> {
    return this.formAccessor.field(name);
  }

  repeatingForm<K extends keyof M>(name: K): RepeatingFormAccess<M, D, K> {
    return this.formAccessor.repeatingForm(name);
  }

  subForm<K extends keyof M>(name: K): SubFormAccess<M, D, K> {
    return this.formAccessor.subForm(name);
  }

  repeatingField(name: string): any {
    // not implemented yet
  }

  additionalError(name: string): string | undefined {
    const result = this.additionalErrorTree[name];
    if (typeof result !== "string") {
      return undefined;
    }
    return result;
  }

  @computed
  get additionalErrors(): string[] {
    const result: string[] = [];
    Object.keys(this.additionalErrorTree).forEach(key => {
      const value = this.additionalErrorTree[key];
      if (typeof value !== "string") {
        return;
      }
      result.push(value);
    });
    result.sort();
    return result;
  }
}

async function defaultSaveFunc() {
  console.warn("No mstform save function configured");
  return null;
}
