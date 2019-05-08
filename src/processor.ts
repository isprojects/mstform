import {
  getSnapshot,
  applyPatch,
  getEnv,
  IAnyModelType,
  Instance
} from "mobx-state-tree";
import { observable, action } from "mobx";
import { ChangeTracker, DebounceFunc } from "./changeTracker";

// modify a
// modify a
// modify a -> debounced call to the server
// modify b
// modify b
// a resolves
// -> debounced call of b to the server
// b resolves

// we keep track of all paths we need to send to the server we memoize and
// debounce this, so that only after a bit of typing on a path a process
// request is made. the process requests are then resolved in sequence - the
// first process request is resolved before the second one is issued, as it
// could result in an update to a field.

// so we keep a list of process requests, with the field included
// we execute each item of this list in sequence
// while this is happening we create a new list of process requests
// once the original process requests lists is processed, the new
// list is also processed. this way it's impossible to process out of sequence

// this means it's possible to be typing
// in a field already only for it to be cleared by the server. that sucks. the
// reason for the strict sequencing is that we can't issue another process
// request with an inconsistent state - the update can affect validation
// behavior.

// what if we gave up the strict sequencing? we'd end up with inconsistent
// state if we modify one field while a field is to be cleared in the future

// what if we showed the form in a loading state while a process is taking
// place? but we cannot indicate which field is in a loading state.

// an alternative is to indeed send the clearing and defaulting information
// to the client. this means that for each relationship, we should
// send the related information to the client. as a result of this, we
// can pre-fill immediately and also clear immediately.
// this works differently than for dimensions, however.

// we send the first one immediately to the server
// once it resolves, we n

// we keep a sequence of items we need to resolve
//

// TODO:
// * abstract away inclusion handling

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

type ProcessResult = {
  updates: Update[];
  errorValidations: ValidationInfo[];
  warningValidations: ValidationInfo[];
};

interface Process {
  (snapshot: any, path: string): Promise<ProcessResult>;
}

class FormProcessor {
  errorValidations: ValidationEntries;
  warningValidations: ValidationEntries;
  changeTracker: ChangeTracker;

  constructor(
    public node: Instance<IAnyModelType>,
    public process: Process,
    { debounce }: { debounce?: DebounceFunc } = {}
  ) {
    this.node = node;
    this.errorValidations = new ValidationEntries();
    this.warningValidations = new ValidationEntries();
    this.changeTracker = new ChangeTracker(
      (path: string) => this.realProcess(path),
      { debounce }
    );
  }

  run(path: string) {
    this.changeTracker.change(path);
  }

  loadInclusion(modelKey: string, inclusion: any) {
    return getEnv(this.node).inclusionLoader.includeReference(
      modelKey,
      inclusion
    );
  }

  async realProcess(path: string) {
    const processResult = await this.process(getSnapshot(this.node), path);
    const { updates, errorValidations, warningValidations } = processResult;
    updates.forEach(update => {
      if (update.value !== undefined) {
        applyPatch(this.node, [
          { op: "replace", path: update.path, value: update.value }
        ]);
      } else if (update.inclusion !== undefined) {
        applyPatch(this.node, [
          {
            op: "replace",
            path: update.path,
            value: this.loadInclusion(
              update.model_key as string,
              update.inclusion
            )
          }
        ]);
      }
    });
    this.errorValidations.update(errorValidations);
    this.warningValidations.update(warningValidations);
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

export { FormProcessor };
