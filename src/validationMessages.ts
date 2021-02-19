import { observable, action, computed, makeObservable } from "mobx";

export type Message = {
  path: string;
  message: string;
};

export class ExternalMessages {
  messages: Map<string, string> = observable.map();

  constructor() {
    makeObservable(this);
  }

  @action
  update(
    validationIdToMessage: Map<string, string> | undefined,
    affectedValidationIds: Set<string>
  ) {
    // remove all keys that are in affected validation ids
    affectedValidationIds.forEach(key => {
      this.messages.delete(key);
    });
    // now add in the new messages if they exist
    if (validationIdToMessage == null) {
      return;
    }
    validationIdToMessage.forEach((value, key) => {
      this.messages.set(key, value);
    });
  }

  @action
  clear() {
    this.messages.clear();
  }

  @computed
  get message() {
    if (this.messages.size === 0) {
      return undefined;
    }
    return Array.from(this.messages.values())[0];
  }
}

export type Validation = {
  id: string;
  messages: Message[];
};
