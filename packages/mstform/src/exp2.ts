function access<T, K extends keyof T>(
  definition: T,
  name: K
): FieldAccessor<T, T[K]> {
  return new FieldAccessor<T, T[K]>(definition, name);
}

class FieldAccessor<T, V> {
  definition: T;
  path: string;

  constructor(definition: T, path: string) {
    this.definition = definition;
    this.path = path;
  }

  get value(): V {
    return this.definition[this.path];
  }
}

interface Definition {
  foo: string;
}

let definition: Definition = {
  foo: "FOO"
};

const a = access(definition, "foo");
