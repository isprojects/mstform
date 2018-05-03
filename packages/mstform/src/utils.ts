import { isObservable } from "mobx";
// have to use this here but loses type information
export const equal = require("fast-deep-equal");

export function identity<T>(value: T): T {
  return value;
}

export function pathToSteps(path: string): string[] {
  if (path.startsWith("/")) {
    path = path.slice(1);
  }
  return path.split("/");
}

export function isInt(s: string): boolean {
  return Number.isInteger(parseInt(s, 10));
}

export function unwrap(o: any): any {
  if (isObservable(o)) {
    return o.toJS();
  }
  return o;
}
