import { applyPatch, IAnyModelType, Instance } from "mobx-state-tree";

import { ChangeTracker, DebounceOptions } from "./changeTracker";
import { Message } from "./validationMessages";
import { FormState } from "./state";

type Update = {
  path: string;
  value?: any;
  inclusion?: any;
  model_key?: string;
};

export type AccessUpdate = {
  path: string;
  readOnly?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  required?: boolean;
  enabled?: boolean;
};

type ValidationInfo = {
  id: string;
  messages: Message[];
};

export type ProcessResult = {
  updates: Update[];
  accessUpdates: AccessUpdate[];
  errorValidations: ValidationInfo[];
  warningValidations: ValidationInfo[];
};

export interface SaveFunc<M> {
  (node: Instance<M>): Promise<Partial<ProcessResult> | undefined | null>;
}

export interface Process<M> {
  (
    node: Instance<M>,
    path: string,
    liveOnly: boolean,
    paths?: string[]
  ): Promise<Partial<ProcessResult>>;
}

export interface ProcessAll<M> {
  (node: Instance<M>, liveOnly: boolean): Promise<Partial<ProcessResult>>;
}

export interface ApplyUpdate {
  (node: Instance<IAnyModelType>, update: any): void;
}

function defaultApplyUpdate(node: Instance<IAnyModelType>, update: any): void {
  applyPatch(node, [{ op: "replace", path: update.path, value: update.value }]);
}

export type ProcessorOptions = {
  applyUpdate?: ApplyUpdate;
  bulkProcess?: boolean;
} & Partial<DebounceOptions>;

export class Backend<M extends IAnyModelType> {
  changeTracker: ChangeTracker;
  applyUpdate: ApplyUpdate;
  bulkProcess: boolean;

  constructor(
    public state: FormState<any, any, M>,
    public node: Instance<M>,
    public save?: SaveFunc<M>,
    public process?: Process<M>,
    public processAll?: ProcessAll<M>,
    {
      debounce,
      delay,
      applyUpdate = defaultApplyUpdate,
      bulkProcess = false,
    }: ProcessorOptions = {}
  ) {
    this.changeTracker = new ChangeTracker(
      (path: string, paths: string[] = []) => this.realProcess(path, paths),
      { debounce, delay },
      bulkProcess
    );
    this.applyUpdate = applyUpdate;
    this.bulkProcess = bulkProcess;
  }

  run(path: string) {
    this.changeTracker.change(path);
  }

  runProcessResult(processResult: ProcessResult) {
    const { updates, accessUpdates, errorValidations, warningValidations } =
      processResult;
    updates.forEach((update) => {
      // anything that has changed by the user in the mean time shouldn't
      // be updated, as the user input takes precedence
      if (this.changeTracker.hasChanged(update.path)) {
        return;
      }
      this.applyUpdate(this.node, update);
    });
    accessUpdates.forEach((accessUpdate) => {
      this.state.setAccessUpdate(accessUpdate);
    });

    this.state.setExternalValidations(errorValidations, "error");
    this.state.setExternalValidations(warningValidations, "warning");
  }

  async realSave(): Promise<boolean> {
    if (this.save == null) {
      throw new Error("Cannot save if save function is not configured");
    }
    const processResult = await this.save(this.node);

    if (processResult == null) {
      this.clearValidations();
      return true;
    }
    const completeProcessResult: ProcessResult = {
      updates: [],
      accessUpdates: [],
      errorValidations: [],
      warningValidations: [],
      ...processResult,
    };
    this.runProcessResult(completeProcessResult);
    return false;
  }

  async realProcessAll(liveOnly?: boolean) {
    if (this.processAll == null) {
      throw new Error(
        "Cannot process all if processAll function is not configured"
      );
    }
    const processResult = await this.processAll(
      this.node,
      liveOnly != null ? liveOnly : this.state.liveOnly
    );
    this.clearValidations();

    const completeProcessResult: ProcessResult = {
      updates: [],
      accessUpdates: [],
      errorValidations: [],
      warningValidations: [],
      ...processResult,
    };
    this.runProcessResult(completeProcessResult);
  }

  async clearValidations() {
    this.state.clearExternalValidations("error");
    this.state.clearExternalValidations("warning");
  }

  async realProcess(path: string, paths: string[]) {
    if (this.process == null) {
      return;
    }
    let processResult;
    try {
      processResult = await this.process(
        this.node,
        path,
        this.state.liveOnly,
        paths
      );
    } catch (e) {
      console.error("Unexpected error during process:", e);
      return;
    }
    const completeProcessResult: ProcessResult = {
      updates: [],
      accessUpdates: [],
      errorValidations: [],
      warningValidations: [],
      ...processResult,
    };
    this.runProcessResult(completeProcessResult);
  }

  isFinished() {
    return this.changeTracker.isFinished();
  }
}
