export function identity<T>(value: T): T {
  return value;
}

export function pathToSteps(path: string): string[] {
  if (path.startsWith("/")) {
    path = path.slice(1);
  }
  return path.split("/");
}

export function stepsToPath(parts: string[]): string {
  const result = parts.join("/");
  if (!result.startsWith("/")) {
    return "/" + result;
  }
  return result;
}

export function isInt(s: string): boolean {
  return Number.isInteger(parseInt(s, 10));
}

export function getByPath(obj: any, path: string): string | undefined {
  return getBySteps(obj, pathToSteps(path));
}

function getBySteps(obj: any, steps: string[]): string | undefined {
  const [first, ...rest] = steps;
  if (rest.length === 0) {
    return obj[first];
  }
  let sub = obj[first];
  if (sub === undefined) {
    return undefined;
  }
  return getBySteps(sub, rest);
}

export function deleteByPath(obj: any, path: string) {
  return deleteBySteps(obj, pathToSteps(path));
}

function deleteBySteps(obj: any, steps: string[]) {
  const [first, ...rest] = steps;
  if (rest.length === 0) {
    delete obj[first];
  }
  let sub = obj[first];
  if (sub === undefined) {
    return;
  }
  deleteBySteps(sub, rest);
}

export function deepCopy(o: any): any {
  // it's a crazy technique but it works for plain JSON, and
  // we use it for errors which is plain JSON
  return JSON.parse(JSON.stringify(o));
}
