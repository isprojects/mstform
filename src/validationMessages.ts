import { observable, action, IObservableArray } from "mobx";

export type Message = {
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

export class ValidationEntries {
  validations: IObservableArray<ValidationEntry> = observable.array();

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

  @action
  clear() {
    this.validations.clear();
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
