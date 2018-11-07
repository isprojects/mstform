import { action, computed, observable } from "mobx";
import { IType, onPatch, resolvePath, applyPatch } from "mobx-state-tree";
import { Accessor } from "./accessor";
import {
  Form,
  FormDefinition,
  ValidationResponse,
  GroupDefinition
} from "./form";
import {
  deepCopy,
  deleteByPath,
  getByPath,
  isInt,
  pathToSteps,
  stepsToPath
} from "./utils";
import { FieldAccessor } from "./field-accessor";
import { FormAccessor } from "./form-accessor";
import { RepeatingFormAccessor } from "./repeating-form-accessor";
import { RepeatingFormIndexedAccessor } from "./repeating-form-indexed-accessor";
import { FormAccessorBase } from "./form-accessor-base";
import { ValidateOptions } from "./validate-options";

export interface FieldAccessorAllows {
  (fieldAccessor: FieldAccessor<any, any>): boolean;
}

export interface ErrorOrWarning {
  (accessor: Accessor): string | undefined;
}

export interface ExtraValidation {
  (fieldAccessor: FieldAccessor<any, any>, value: any): ValidationResponse;
}

export interface RepeatingFormAccessorAllows {
  (repeatingFormAccessor: RepeatingFormAccessor<any, any>): boolean;
}

export interface SaveFunc<M> {
  (node: M): any;
}

export interface EventFunc<R, V> {
  (event: any, accessor: FieldAccessor<R, V>): void;
}

export interface UpdateFunc<R, V> {
  (accessor: FieldAccessor<R, V>): void;
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
  isRequired?: FieldAccessorAllows;

  getError?: ErrorOrWarning;
  getWarning?: ErrorOrWarning;

  extraValidation?: ExtraValidation;
  focus?: EventFunc<any, any>;
  blur?: EventFunc<any, any>;
  update?: UpdateFunc<any, any>;
}

export type SaveStatusOptions = "before" | "rightAfter" | "after";

export class FormState<
  M,
  D extends FormDefinition<M>,
  G extends GroupDefinition<D>
> extends FormAccessorBase<D, G> {
  @observable
  additionalErrorTree: any;

  @observable
  saveStatus: SaveStatusOptions = "before";

  formAccessor: FormAccessor<D, G>;
  saveFunc: SaveFunc<M>;
  validationBeforeSave: ValidationOption;
  validationAfterSave: ValidationOption;
  validationPauseDuration: number;
  isDisabledFunc: FieldAccessorAllows;
  isHiddenFunc: FieldAccessorAllows;
  isReadOnlyFunc: FieldAccessorAllows;
  isRequiredFunc: FieldAccessorAllows;
  isRepeatingFormDisabledFunc: RepeatingFormAccessorAllows;
  getErrorFunc: ErrorOrWarning;
  getWarningFunc: ErrorOrWarning;
  extraValidationFunc: ExtraValidation;
  private noRawUpdate: boolean;
  focusFunc: EventFunc<any, any> | null;
  blurFunc: EventFunc<any, any> | null;
  updateFunc: UpdateFunc<any, any> | null;

  constructor(
    public form: Form<M, D, G>,
    public node: M,
    options?: FormStateOptions<M>
  ) {
    super();
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
      this.form.groupDefinition,
      null,
      addMode
    );
    this.formAccessor.initialize();

    if (options == null) {
      this.saveFunc = defaultSaveFunc;
      this.isDisabledFunc = () => false;
      this.isHiddenFunc = () => false;
      this.isReadOnlyFunc = () => false;
      this.isRequiredFunc = () => false;
      this.isRepeatingFormDisabledFunc = () => false;
      this.getErrorFunc = () => undefined;
      this.getWarningFunc = () => undefined;
      this.blurFunc = () => undefined;
      this.extraValidationFunc = () => false;
      this.validationBeforeSave = "immediate";
      this.validationAfterSave = "immediate";
      this.validationPauseDuration = 0;
      this.focusFunc = null;
      this.blurFunc = null;
      this.updateFunc = null;
    } else {
      this.saveFunc = options.save ? options.save : defaultSaveFunc;
      this.isDisabledFunc = options.isDisabled
        ? options.isDisabled
        : () => false;
      this.isHiddenFunc = options.isHidden ? options.isHidden : () => false;
      this.isReadOnlyFunc = options.isReadOnly
        ? options.isReadOnly
        : () => false;
      this.isRequiredFunc = options.isRequired
        ? options.isRequired
        : () => false;
      this.isRepeatingFormDisabledFunc = options.isRepeatingFormDisabled
        ? options.isRepeatingFormDisabled
        : () => false;
      this.getErrorFunc = options.getError ? options.getError : () => undefined;
      this.getWarningFunc = options.getWarning
        ? options.getWarning
        : () => undefined;
      this.extraValidationFunc = options.extraValidation
        ? options.extraValidation
        : () => false;
      const validation = options.validation || {};
      this.validationBeforeSave = validation.beforeSave || "immediate";
      this.validationAfterSave = validation.afterSave || "immediate";
      this.validationPauseDuration = validation.pauseDuration || 0;
      this.focusFunc = options.focus ? options.focus : null;
      this.blurFunc = options.blur ? options.blur : null;
      this.updateFunc = options.update ? options.update : null;
    }
  }

  @action
  setSaveStatus(status: SaveStatusOptions) {
    this.saveStatus = status;
  }

  @action
  setValueWithoutRawUpdate(path: string, value: any) {
    this.noRawUpdate = true;
    applyPatch(this.node, [{ op: "replace", path, value }]);
    this.noRawUpdate = false;
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
    let accessor;
    try {
      accessor = this.accessByPath(path);
    } catch {
      // it's possible for a path to remove removed but it not
      // being part of a repeating form -- in case of arrays treated
      // as a value
      // XXX not ideal to catch errors here. instead perhaps accessByPath
      // should return undefined if it cannot resolve the path
      return;
    }

    if (
      accessor === undefined ||
      !(accessor instanceof RepeatingFormIndexedAccessor)
    ) {
      // if this isn't a repeating indexed accessor we don't need to react
      return;
    }
    accessor.clear();
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

    // we cannot set it into add mode here, as this can be triggered
    // by code like applySnapshot. Instead use the RepeatingFormAccessor
    // API to ensure add mode is set
  }

  @action
  async save(options?: ValidateOptions): Promise<boolean> {
    const isValid = await this.validate(options);
    this.setSaveStatus("rightAfter");
    if (!isValid) {
      return false;
    }
    const errors = await this.saveFunc(this.node);
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
      if (accessor instanceof FieldAccessor) {
        if (error != null) {
          accessor.setError(error);
          // this.errors.set(accessor.path, error);
          // delete from remaining structure
          deleteByPath(additionalErrors, accessor.path);
        }
      }
    });
    this.additionalErrorTree = additionalErrors;
  }

  @action
  clearErrors() {
    this.additionalErrorTree = {};
    this.flatAccessors.map(accessor => {
      if (accessor instanceof FieldAccessor) {
        accessor.clearError();
      }
    });
  }

  getValue(path: string): any {
    return resolvePath(this.node, path);
  }

  @computed
  get isValidating(): boolean {
    return this.flatAccessors.some(
      accessor =>
        accessor instanceof FieldAccessor ? accessor.isValidating : false
    );
  }

  accessByPath(path: string): Accessor | undefined {
    const steps = pathToSteps(path);
    return this.accessBySteps(steps);
  }

  accessBySteps(steps: string[]): Accessor | undefined {
    return this.formAccessor.accessBySteps(steps);
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

  @computed
  get isWarningFree(): boolean {
    if (this.formAccessor.warningValue !== undefined) {
      return false;
    }
    return !this.flatAccessors.some(
      accessor => (accessor ? accessor.warningValue !== undefined : false)
    );
  }
}

async function defaultSaveFunc() {
  console.warn("No mstform save function configured");
  return null;
}
