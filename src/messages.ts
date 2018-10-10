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
    return getError(messages);
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
  const [first, ...rest] = steps;
  if (rest.length === 0) {
    return resolveObjectFinalStep(messages, first);
  }
  return resolveStep(messages[first], rest);
}

function resolveObjectFinalStep(
  messages: MessagesObject,
  step: string
): string | undefined {
  const propError = getPropError(messages, step);
  if (propError !== undefined) {
    return propError;
  }
  const value = messages[step];
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Array) {
    return undefined;
  }
  if (value instanceof Object) {
    return getError(value);
  }
  return undefined;
}

function getError(value: SomeMessage): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "string") {
    return undefined;
  }
  if (value instanceof Array) {
    return undefined;
  }
  return errorValue(value.__error__);
}

function getPropError(value: MessagesObject, step: string): string | undefined {
  return errorValue(value["__error__" + step]);
}

function errorValue(error: any): string | undefined {
  if (error === undefined) {
    return undefined;
  }
  if (typeof error !== "string") {
    return undefined;
  }
  return error;
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
