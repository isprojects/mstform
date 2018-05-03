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
