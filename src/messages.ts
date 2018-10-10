import { pathToSteps } from "./utils";

type MessagesArray = MessagesObject[];
type MessagesObject = {
  [key: string]: string | MessagesObject | MessagesArray;
};
type Messages = undefined | MessagesObject;

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
  const [first, ...rest] = steps;
  if (messages instanceof Object) {
  }
}

function resolveStep(
  messages: MessagesObject | MessagesArray | string,
  steps: string[]
) {
  const [first, ...rest] = steps;

  if (typeof messages === "string") {
    return resolveString(messages, steps);
  }
}

function resolveObject(
  messages: MessagesObject,
  steps: string[]
): string | undefined {
  const [first, ...rest] = steps;
  const value = messages[first];
  if (typeof value === "string") {
    if (rest.length !== 0) {
      return undefined;
    }
    return value;
  }
  return resolveStep(value, rest);
}
