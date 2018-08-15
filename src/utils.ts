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

export function removePath(
  map: Map<string, any>,
  path: string,
  disposeFunc?: any
): Map<string, any> {
  const parts = pathToSteps(path);
  const last = parts[parts.length - 1];
  let removedIndex = parseInt(last, 10);
  const basePath = stepsToPath(parts.slice(0, parts.length - 1));

  const result = new Map();
  map.forEach((value, key) => {
    if (!key.startsWith(basePath)) {
      result.set(key, value);
      return;
    }
    const withoutBase = key.slice(basePath.length + 1);
    const pathParts = pathToSteps(withoutBase);

    const number = parseInt(pathParts[0], 10);

    if (isNaN(number)) {
      result.set(key, value);
      return;
    }
    if (number < removedIndex) {
      result.set(key, value);
      return;
    } else if (number === removedIndex) {
      if (disposeFunc != null) {
        disposeFunc(value);
      }
      return;
    }
    const restParts = pathParts.slice(1);
    const newPath =
      basePath + stepsToPath([(number - 1).toString(), ...restParts]);
    result.delete(key);
    result.set(newPath, value);
  });
  return result;
}

export function addPath(map: Map<string, any>, path: string): Map<string, any> {
  const parts = pathToSteps(path);
  const last = parts[parts.length - 1];
  let addedIndex = parseInt(last, 10);
  if (isNaN(addedIndex)) {
    return map;
  }
  const basePath = stepsToPath(parts.slice(0, parts.length - 1));
  const result = new Map();
  map.forEach((value, key) => {
    if (!key.startsWith(basePath)) {
      result.set(key, value);
      return;
    }
    const withoutBase = key.slice(basePath.length + 1);
    const pathParts = pathToSteps(withoutBase);

    const number = parseInt(pathParts[0], 10);
    if (isNaN(number)) {
      result.set(key, value);
      return;
    }
    // if number is before the currently added index, we want it as is
    if (number < addedIndex) {
      result.set(key, value);
      return;
    }
    // if it's greater or equal, we want to shift them
    const restParts = pathParts.slice(1);
    const newPath =
      basePath + stepsToPath([(number + 1).toString(), ...restParts]);
    result.set(newPath, value);
  });
  // we return the result with a gap for the newly added item
  return result;
}

export function deepCopy(o: any): any {
  // it's a crazy technique but it works for plain JSON, and
  // we use it for errors which is plain JSON
  return JSON.parse(JSON.stringify(o));
}
