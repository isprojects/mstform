import { types, IStateTreeNode } from "mobx-state-tree";

const Workspace = types.model("Workspace", {
  foo: types.string,
  bar: types.number;
});

const w = Workspace.create({ foo: "FOO", bar: 3 });

class Form<FormDefinition extends { [key: string]: Field<any> }> {
  definition: FormDefinition;

  constructor(definition: FormDefinition) {
    this.definition = definition;
  }

  create(node: IStateTreeNode): FormState<FormDefinition> {
    return new FormState(this, node);
  }
}

class FormState<FormDefinition extends { [key: string]: Field<any> }> {
  form: Form<FormDefinition>;
  node: IStateTreeNode;

  constructor(form: Form<FormDefinition>, node: IStateTreeNode) {
    this.form = form;
    this.node = node;
  }

  value(path): any {
    return this.node[path];
  }

  convert(path, raw: string): any {
    return this.form.definition[path].convert(raw);
  }

  access<
    K extends keyof FormDefinition,
  >(name: K): FieldAccessor<FormDefinition, FormDefinition[K], FormDefinition[K]['t']> {
    return new FieldAccessor(this, this.form.definition[name], name);
  }
}

class Field<Value> {
  constructor(public convert: Converter<Value>) {}

  value(node: IStateTreeNode, path: string): Value {
    return node[path];
  }

  get t(): Value;
}

class FieldAccessor<
  FormDefinition extends { [key: string]: Field<any> },
  TField extends Field<Value>,
  Value
> {
  state: FormState<FormDefinition>;
  field: TField;
  path: string;

  constructor(state: FormState<FormDefinition>, field: TField, path: string) {
    this.state = state;
    this.field = field;
    this.path = path;
  }

  get value(): Value {
    return this.field.value(this.state.node, this.path);
  }

  convert(raw: string): Value {
    return this.state.convert(this.path, raw);
  }
}

export interface Converter<Value> {
  (value: string): Value | undefined;
}

const definition2 = {
  foo: new Field<string>(value => value),
  bar: new Field<number>(value => parseInt(value, 10))
};

interface Definition {
  foo: string;
}

let definition: Definition = {
  foo: "FOO"
};

const form = new Form(definition2);

const state = form.create(w);

const accessor = state.access("foo");

const accessor2 = state.access("bar");

const value = accessor.value;

const value2 = state.access("bar").value;

// function form(definition) {
//   return new Form(definition);
// }

// function field<T>() {}

// const f = form({
//   foo: field<string>()
// });

// const state = f.create(w);
// const f1 = state.access("foo").value;
