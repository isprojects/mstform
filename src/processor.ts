import {
  getSnapshot,
  applyPatch,
  getEnv,
  IAnyModelType,
  Instance
} from "mobx-state-tree";
import { observable, action } from "mobx";
import { ChangeTracker, DebounceOptions } from "./changeTracker";

export interface SaveFunc<M> {
  (node: Instance<M>): Promise<Partial<ProcessResult> | undefined | null>;
}

type Message = {
  path: string;
  message: string;
};

class ValidationEntry {
  id: string;
  messages: Map<string, string> = observable.map();

  constructor(id: string, messages: Message[]) {
    this.id = id;
    this.setMessages(messages);
  }

  @action
  setMessages(messages: Message[]) {
    this.messages.clear();
    messages.forEach(message => {
      this.messages.set(message.path, message.message);
    });
  }

  getMessage(path: string): string | undefined {
    return this.messages.get(path);
  }
}

type Validation = {
  id: string;
  messages: Message[];
};

class ValidationEntries {
  validations: ValidationEntry[] = observable.array();

  @action
  update(updatedValidations: Validation[]) {
    const m: Map<string, Validation> = new Map();
    updatedValidations.forEach(validation => {
      m.set(validation.id, validation);
    });
    this.validations.forEach(validation => {
      const updated = m.get(validation.id);
      if (updated == null) {
        return;
      }
      validation.setMessages(updated.messages);
      m.delete(validation.id);
    });
    m.forEach(validation => {
      this.validations.push(
        new ValidationEntry(validation.id, validation.messages)
      );
    });
  }

  getMessage(path: string): string | undefined {
    for (const v of this.validations) {
      const foundMessage = v.getMessage(path);
      if (foundMessage != null) {
        return foundMessage;
      }
    }
    return undefined;
  }
}

type Update = {
  path: string;
  value?: any;
  inclusion?: any;
  model_key?: string;
};

type ValidationInfo = {
  id: string;
  messages: Message[];
};

export type ProcessResult = {
  updates: Update[];
  errorValidations: ValidationInfo[];
  warningValidations: ValidationInfo[];
};

export interface Process {
  (snapshot: any, path: string): Promise<ProcessResult>;
}

export interface ApplyUpdate {
  (node: Instance<IAnyModelType>, update: any): void;
}

function defaultApplyUpdate(node: Instance<IAnyModelType>, update: any): void {
  applyPatch(node, [{ op: "replace", path: update.path, value: update.value }]);
}

export type ProcessorOptions = { applyUpdate?: ApplyUpdate } & Partial<
  DebounceOptions
>;

export class Processor<M extends IAnyModelType> {
  errorValidations: ValidationEntries;
  warningValidations: ValidationEntries;
  changeTracker: ChangeTracker;
  applyUpdate: ApplyUpdate;

  constructor(
    public node: Instance<M>,
    public save?: SaveFunc<M>,
    public process?: Process,
    { debounce, delay, applyUpdate = defaultApplyUpdate }: ProcessorOptions = {}
  ) {
    this.node = node;
    this.errorValidations = new ValidationEntries();
    this.warningValidations = new ValidationEntries();
    this.changeTracker = new ChangeTracker(
      (path: string) => this.realProcess(path),
      { debounce, delay }
    );
    this.applyUpdate = applyUpdate;
  }

  run(path: string) {
    // XXX this.errorValidations.remove(path)
    this.changeTracker.change(path);
  }

  loadInclusion(modelKey: string, inclusion: any) {
    return getEnv(this.node).inclusionLoader.includeReference(
      modelKey,
      inclusion
    );
  }

  runProcessResult(processResult: ProcessResult) {
    const { updates, errorValidations, warningValidations } = processResult;
    updates.forEach(update => {
      // anything that has changed by the user in the mean time shouldn't
      // be updated, as the user input takes precedence
      if (this.changeTracker.hasChanged(update.path)) {
        return;
      }
      this.applyUpdate(this.node, update);
    });
    this.errorValidations.update(errorValidations);
    this.warningValidations.update(warningValidations);
  }

  async realSave(): Promise<boolean> {
    if (this.save == null) {
      throw new Error("Cannot save if save function is not configured");
    }
    const processResult = await this.save(this.node);

    if (processResult == null) {
      return true;
    }
    const completeProcessResult: ProcessResult = {
      updates: [],
      errorValidations: [],
      warningValidations: [],
      ...processResult
    };
    this.runProcessResult(completeProcessResult);
    return false;
  }

  async realProcess(path: string) {
    if (this.process == null) {
      return;
    }
    const processResult = await this.process(getSnapshot(this.node), path);
    this.runProcessResult(processResult);
  }

  isFinished() {
    return this.changeTracker.isFinished();
  }

  getError(path: string): string | undefined {
    return this.errorValidations.getMessage(path);
  }
  getWarning(path: string): string | undefined {
    return this.warningValidations.getMessage(path);
  }
}