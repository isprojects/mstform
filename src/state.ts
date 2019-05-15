import { action, computed, observable } from "mobx";
import {
  onPatch,
  resolvePath,
  applyPatch,
  IAnyModelType,
  Instance
} from "mobx-state-tree";
import { Accessor } from "./accessor";
import {
  Form,
  FormDefinition,
  ValidationResponse,
  GroupDefinition,
  ErrorFunc,
  IDisposer
} from "./form";
import { pathToSteps, stepsToPath, pathToFieldref } from "./utils";
import { FieldAccessor } from "./field-accessor";
import { FormAccessor } from "./form-accessor";
import { RepeatingFormAccessor } from "./repeating-form-accessor";
import { RepeatingFormIndexedAccessor } from "./repeating-form-indexed-accessor";
import { FormAccessorBase } from "./form-accessor-base";
import { ValidateOptions } from "./validate-options";
import {
  StateConverterOptions,
  StateConverterOptionsWithContext
} from "./converter";
import { checkConverterOptions } from "./decimalParser";
import { Backend, ProcessorOptions, Process, SaveFunc } from "./backend";

export interface AccessorAllows {
  (accessor: Accessor): boolean;
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

export type BackendOptions<M> = {
  save?: SaveFunc<M>;
  process?: Process;
};

type ValidationOptions = {
  beforeSave: ValidationOption;
  afterSave: ValidationOption;
  pauseDuration: number;
};

export interface FormStateOptions<M> {
  addMode?: boolean;
  validation?: Partial<ValidationOptions>;
  isDisabled?: AccessorAllows;
  isHidden?: AccessorAllows;
  isReadOnly?: AccessorAllows;
  isRequired?: AccessorAllows;

  getError?: ErrorOrWarning;
  getWarning?: ErrorOrWarning;

  backend?: BackendOptions<M> & ProcessorOptions;

  extraValidation?: ExtraValidation;
  focus?: EventFunc<any, any>;
  blur?: EventFunc<any, any>;
  update?: UpdateFunc<any, any>;

  context?: any;
  converterOptions?: StateConverterOptions;
  requiredError?: string | ErrorFunc;
}

export type SaveStatusOptions = "before" | "rightAfter" | "after";

export class FormState<
  M extends IAnyModelType,
  D extends FormDefinition<M>,
  G extends GroupDefinition<D>
> extends FormAccessorBase<D, G> {
  @observable
  saveStatus: SaveStatusOptions = "before";

  formAccessor: FormAccessor<D, G>;
  validationBeforeSave: ValidationOption;
  validationAfterSave: ValidationOption;
  validationPauseDuration: number;
  isDisabledFunc: AccessorAllows;
  isHiddenFunc: AccessorAllows;
  isReadOnlyFunc: AccessorAllows;
  isRequiredFunc: AccessorAllows;
  getErrorFunc: ErrorOrWarning;
  getWarningFunc: ErrorOrWarning;
  extraValidationFunc: ExtraValidation;
  private noRawUpdate: boolean;
  focusFunc: EventFunc<any, any> | undefined;
  blurFunc: EventFunc<any, any> | undefined;
  updateFunc: UpdateFunc<any, any> | undefined;

  processor: Backend<M> | undefined;

  _context: any;
  _converterOptions: StateConverterOptions;
  _requiredError: string | ErrorFunc;
  _onPatchDisposer: IDisposer;

  constructor(
    public form: Form<M, D, G>,
    public node: Instance<M>,
    {
      addMode = false,
      isDisabled = () => false,
      isHidden = () => false,
      isReadOnly = () => false,
      isRequired = () => false,
      getError = () => undefined,
      getWarning = () => undefined,
      backend = undefined,
      extraValidation = () => false,
      validation = {},
      focus,
      blur,
      update,
      context,
      converterOptions = {},
      requiredError = "Required"
    }: FormStateOptions<M> = {}
  ) {
    super();
    this.noRawUpdate = false;

    this._onPatchDisposer = onPatch(node, patch => {
      if (patch.op === "remove") {
        this.removePath(patch.path);
      } else if (patch.op === "add") {
        this.addPath(patch.path);
      } else if (patch.op === "replace") {
        this.replacePath(patch.path);
      }
    });

    this.formAccessor = new FormAccessor(
      this,
      this.form.definition,
      this.form.groupDefinition,
      null,
      addMode
    );
    this.formAccessor.initialize();

    this.isDisabledFunc = isDisabled;
    this.isHiddenFunc = isHidden;
    this.isReadOnlyFunc = isReadOnly;
    this.isRequiredFunc = isRequired;
    this.getErrorFunc = getError;
    this.getWarningFunc = getWarning;
    this.extraValidationFunc = extraValidation;
    const validationOptions: ValidationOptions = {
      beforeSave: "immediate",
      afterSave: "immediate",
      pauseDuration: 0,
      ...validation
    };
    this.validationBeforeSave = validationOptions.beforeSave;
    this.validationAfterSave = validationOptions.afterSave;
    this.validationPauseDuration = validationOptions.pauseDuration;
    this.focusFunc = focus;
    this.blurFunc = blur;
    this.updateFunc = update;
    this._context = context;
    this._converterOptions = converterOptions;
    this._requiredError = requiredError;

    checkConverterOptions(this._converterOptions);

    if (backend != null) {
      const processor = new Backend(
        node,
        backend.save,
        backend.process,
        backend
      );
      this.processor = processor;
      this.getErrorFunc = (accessor: Accessor): string | undefined => {
        const result = getError(accessor);
        if (result != null) {
          return result;
        }
        return processor.getError(accessor.path);
      };
      this.getWarningFunc = (accessor: Accessor): string | undefined => {
        const result = getWarning(accessor);
        if (result != null) {
          return result;
        }
        return processor.getWarning(accessor.path);
      };
      this.updateFunc = (accessor: FieldAccessor<any, any>) => {
        if (update != null) {
          update(accessor);
        }
        processor.run(accessor.path);
      };
    }
  }

  dispose(): void {
    // clean up onPatch
    this._onPatchDisposer();
    // do dispose on all accessors, cleaning up
    this.formAccessor.flatAccessors.forEach(accessor => {
      accessor.dispose();
    });
  }

  @computed
  get context(): any {
    return this._context;
  }

  @computed
  get path(): string {
    return "/";
  }

  @computed
  get fieldref(): string {
    return pathToFieldref(this.path);
  }

  @computed
  get value(): Instance<M> {
    return this.node;
  }

  @computed
  get processPromise(): Promise<void> {
    if (this.processor == null) {
      return Promise.resolve();
    }
    return this.processor.isFinished();
  }

  stateConverterOptionsWithContext(
    accessor: any
  ): StateConverterOptionsWithContext {
    return {
      context: this.context,
      accessor: accessor,
      ...this._converterOptions
    };
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
    if (this.processor == null) {
      throw new Error("Cannot save without backend configuration");
    }
    if (options == null) {
      options = {};
    }
    let extraOptions = {};
    if (this.processor.process == null) {
      extraOptions = { ignoreGetError: true };
    }
    const isValid = this.validate({ ...extraOptions, ...options });

    // if we ignored required, we need to re-validate to restore
    // the required messages (if any)
    // XXX does this make sense to move this to validate itself?
    if (options != null && options.ignoreRequired) {
      // we don't care about the answer, only about updating the messages
      // in the UI
      this.validate(extraOptions);
    }

    this.setSaveStatus("rightAfter");

    if (!isValid) {
      return false;
    }

    return this.processor.realSave();
  }

  getValue(path: string): any {
    return resolvePath(this.node, path);
  }

  accessByPath(path: string): Accessor | undefined {
    const steps = pathToSteps(path);
    return this.accessBySteps(steps);
  }

  accessBySteps(steps: string[]): Accessor | undefined {
    return this.formAccessor.accessBySteps(steps);
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
