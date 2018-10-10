import { pathToSteps, isInt } from "./utils";

type MessagesArray = MessagesObject[];
type MessagesObject = {
  [key: string]: string | MessagesObject | MessagesArray;
};
export type Messages = undefined | MessagesObject;

type SomeMessage = MessagesObject | MessagesArray | string | undefined;

export function resolveMessage(
  messages: Messages,
  path: string
): string | undefined {
  return resolveSteps(messages, pathToSteps(path));
}

function resolveSteps(messages: Messages, steps: string[]): string | undefined {
  if (messages === undefined) {
    return undefined;
  }
  if (steps.length === 0) {
    return getMessage(messages);
  }
  return resolveStep(messages, steps);
}

function resolveStep(messages: SomeMessage, steps: string[]) {
  if (messages === undefined) {
    return undefined;
  }
  if (typeof messages === "string") {
    return resolveString(messages, steps);
  }
  if (messages instanceof Array) {
    return resolveArray(messages, steps);
  }
  if (messages instanceof Object) {
    return resolveObject(messages, steps);
  }
  return undefined;
}

function resolveObject(
  messages: MessagesObject,
  steps: string[]
): string | undefined {
  if (steps.length === 0) {
    return getMessage(messages);
  }
  const [first, ...rest] = steps;
  if (rest.length === 0) {
    const propError = getPropMessage(messages, first);
    if (propError !== undefined) {
      return propError;
    }
  }
  return resolveStep(messages[first], rest);
}

function resolveString(messages: string, steps: string[]): string | undefined {
  if (steps.length > 0) {
    return undefined;
  }
  return messages;
}

function resolveArray(
  messages: MessagesArray,
  steps: string[]
): string | undefined {
  const [first, ...rest] = steps;
  if (!isInt(first)) {
    return undefined;
  }
  const value = messages[parseInt(first, 10)];
  return resolveStep(value, rest);
}

function getMessage(value: SomeMessage): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "string") {
    return undefined;
  }
  if (value instanceof Array) {
    return undefined;
  }
  return messageValue(value.__message__);
}

function getPropMessage(
  value: MessagesObject,
  step: string
): string | undefined {
  return messageValue(value["__message__" + step]);
}

function messageValue(error: any): string | undefined {
  if (error === undefined) {
    return undefined;
  }
  if (typeof error !== "string") {
    return undefined;
  }
  return error;
}
