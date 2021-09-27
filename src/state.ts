import { action, computed, observable, makeObservable, override } from "mobx";
import {
  onPatch,
  resolvePath,
  applyPatch,
  IAnyModelType,
  Instance,
} from "mobx-state-tree";

import {
  Form,
  FormDefinition,
  ValidationResponse,
  GroupDefinition,
  ErrorFunc,
  IDisposer,
  RepeatingForm,
} from "./form";
import { pathToSteps, stepsToPath } from "./utils";
import { FieldAccessor } from "./field-accessor";
import { FormAccessorBase } from "./form-accessor-base";
import { RepeatingFormAccessor } from "./repeating-form-accessor";
import { SubFormAccessor } from "./sub-form-accessor";
import { RepeatingFormIndexedAccessor } from "./repeating-form-indexed-accessor";
import { ValidateOptions } from "./validate-options";
import {
  StateConverterOptions,
  StateConverterOptionsWithContext,
} from "./converter";
import { checkConverterOptions } from "./decimalParser";
import {
  Backend,
  ProcessorOptions,
  Process,
  SaveFunc,
  ProcessAll,
  AccessUpdate,
} from "./backend";
import { Validation } from "./validationMessages";
import {
  IAccessor,
  IFormAccessor,
  IRepeatingFormAccessor,
  ISubFormAccessor,
} from "./interfaces";

export interface AccessorAllows {
  (accessor: IAccessor): boolean;
}

export interface ErrorOrWarning {
  (accessor: IAccessor): string | undefined;
}

export interface ExtraValidation {
  (fieldAccessor: FieldAccessor<any, any>, value: any): ValidationResponse;
}

export interface RepeatingFormAccessorAllows {
  (repeatingFormAccessor: RepeatingFormAccessor<any, any, any>): boolean;
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
  process?: Process<M>;
  processAll?: ProcessAll<M>;
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
  isEnabled?: AccessorAllows;

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

  addModeDefaults?: string[];
}

export type SaveStatusOptions = "before" | "rightAfter" | "after";

export class FormState<
    D extends FormDefinition<M>,
    G extends GroupDefinition<D>,
    M extends IAnyModelType
  >
  extends FormAccessorBase<D, G, M>
  implements IFormAccessor<D, G, M>
{
  @observable
  saveStatus: SaveStatusOptions = "before";

  validationBeforeSave: ValidationOption;
  validationAfterSave: ValidationOption;
  validationPauseDuration: number;
  isDisabledFunc: AccessorAllows;
  isHiddenFunc: AccessorAllows;
  isReadOnlyFunc: AccessorAllows;
  isRequiredFunc: AccessorAllows;
  isEnabledFunc: AccessorAllows;
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
      isEnabled = () => false,
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
      requiredError = "Required",
      addModeDefaults = [],
    }: FormStateOptions<M> = {}
  ) {
    super(form.definition, form.groupDefinition, undefined, addMode);
    makeObservable(this);

    this.noRawUpdate = false;

    this._onPatchDisposer = onPatch(node, (patch) => {
      if (patch.op === "remove") {
        this.removePath(patch.path);
      } else if (patch.op === "add") {
        this.addPath(patch.path);
      } else if (patch.op === "replace") {
        this.replacePath(patch.path);
      }
    });

    this.isDisabledFunc = isDisabled;
    this.isHiddenFunc = isHidden;
    this.isReadOnlyFunc = isReadOnly;
    this.isRequiredFunc = isRequired;
    this.isEnabledFunc = isEnabled;
    this.getErrorFunc = getError;
    this.getWarningFunc = getWarning;
    this.extraValidationFunc = extraValidation;
    const validationOptions: ValidationOptions = {
      beforeSave: "immediate",
      afterSave: "immediate",
      pauseDuration: 0,
      ...validation,
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
        this,
        node,
        backend.save,
        backend.process,
        backend.processAll,
        backend
      );
      this.processor = processor;

      this.updateFunc = (accessor: FieldAccessor<any, any>) => {
        if (update != null) {
          update(accessor);
        }
        processor.run(accessor.path);
      };
    }
    this.initialize();

    // this has to happen after initialization
    if (addMode) {
      this.setAddModeDefaults(addModeDefaults);
    }
  }

  // needed by FormAccessor base
  get state() {
    return this;
  }

  // normally context is determined from state, but state owns it
  @override
  get context(): any {
    return this._context;
  }

  dispose(): void {
    // clean up onPatch
    this._onPatchDisposer();
    // do dispose on all accessors, cleaning up
    this.flatAccessors.forEach((accessor) => {
      accessor.dispose();
    });
  }

  // we delegate the creation to here to avoid circular dependencies
  // between form accessor and its subclasses
  createRepeatingFormAccessor(
    repeatingForm: RepeatingForm<any, any>,
    parent: IFormAccessor<any, any, any>,
    name: string
  ): IRepeatingFormAccessor<any, any, any> {
    return new RepeatingFormAccessor(this, repeatingForm, parent, name);
  }

  createSubFormAccessor(
    definition: any,
    groupDefinition: any,
    parent: IFormAccessor<any, any, any>,
    name: string
  ): ISubFormAccessor<any, any, any> {
    return new SubFormAccessor(this, definition, groupDefinition, parent, name);
  }

  @computed
  get path(): string {
    return "";
  }

  @override
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

  @computed
  get liveOnly(): boolean {
    return this.saveStatus === "before";
  }

  stateConverterOptionsWithContext(
    accessor: any
  ): StateConverterOptionsWithContext {
    return {
      context: this.context,
      accessor: accessor,
      ...this._converterOptions,
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
    if (accessor === undefined) {
      return;
    }

    if (accessor instanceof RepeatingFormAccessor) {
      accessor.addIndex(index);
      return;
    }

    if (Array.isArray(accessor.value)) {
      this.replacePath(stepsToPath(steps.slice(0, steps.length - 1)));
    }

    // we cannot set it into add mode here, as this can be triggered
    // by code like applySnapshot. Instead use the RepeatingFormAccessor
    // API to ensure add mode is set
    return;
  }

  @action
  async save(options: ValidateOptions = {}): Promise<boolean> {
    if (this.processor == null) {
      throw new Error("Cannot save without backend configuration");
    }
    let extraOptions = {};
    if (this.processor.process == null) {
      extraOptions = { ignoreGetError: true };
    }
    const isValid = this.validate({ ...extraOptions, ...options });

    if (!options.ignoreSaveStatus) {
      this.setSaveStatus("rightAfter");
    }
    if (!isValid) {
      return false;
    }

    return this.processor.realSave();
  }

  @action
  async resetSaveStatus() {
    this.setSaveStatus("before");
  }

  @action
  async processAll(liveOnly?: boolean) {
    if (this.processor == null) {
      throw new Error("Cannot process all without backend configuration");
    }

    return this.processor.realProcessAll(liveOnly);
  }

  @action
  setExternalValidations(
    validations: Validation[],
    messageType: "error" | "warning"
  ) {
    // a map of path to a map of validation_id -> message.
    const pathToValidations = new Map<string, Map<string, string>>();
    // which validation ids are touched at all
    const affectedValidationIds = new Set<string>();
    validations.forEach((validation) => {
      affectedValidationIds.add(validation.id);
      validation.messages.forEach((message) => {
        let validationIdToMessage = pathToValidations.get(message.path);
        if (validationIdToMessage == null) {
          validationIdToMessage = new Map<string, string>();
        }
        pathToValidations.set(message.path, validationIdToMessage);
        validationIdToMessage.set(validation.id, message.message);
      });
    });
    [this, ...this.flatAccessors].forEach((accessor) => {
      const validationIdToMessage = pathToValidations.get(accessor.path);
      const externalMessages =
        messageType === "error"
          ? accessor.externalErrors
          : accessor.externalWarnings;
      externalMessages.update(validationIdToMessage, affectedValidationIds);
    });
  }

  @action
  clearExternalValidations(messageType: "error" | "warning") {
    [this, ...this.flatAccessors].forEach((accessor) => {
      const externalMessages =
        messageType === "error"
          ? accessor.externalErrors
          : accessor.externalWarnings;
      externalMessages.clear();
    });
  }

  @action
  clearAllValidations() {
    this.clearExternalValidations("error");
    this.clearExternalValidations("warning");
    this.flatAccessors.forEach((accessor) => {
      accessor.clearError();
    });
  }

  @action
  setAccessUpdate(accessUpdate: AccessUpdate) {
    const accessor = this.accessByPath(accessUpdate.path);
    if (accessor === undefined) {
      return;
    }
    accessor.setAccess(accessUpdate);
  }

  getValue(path: string): any {
    return resolvePath(this.node, path);
  }

  accessByPath(path: string): IAccessor | undefined {
    const steps = pathToSteps(path);
    return this.accessBySteps(steps);
  }

  @computed
  get canShowValidationMessages(): boolean {
    // immediately after a save we always want messages
    if (this.saveStatus === "rightAfter") {
      return true;
    }
    const policy =
      this.saveStatus === "before"
        ? this.validationBeforeSave
        : this.validationAfterSave;
    if (policy === "immediate") {
      return true;
    }
    if (policy === "no") {
      return false;
    }
    // not implemented yet
    if (policy === "blur" || policy === "pause") {
      return false;
    }
    return true;
  }
}
