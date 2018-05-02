import { types, IStateTreeNode } from "mobx-state-tree";

const Workspace = types.model("Workspace", {
  foo: types.string
});

const w = Workspace.create({ foo: "FOO" });

class Form<FormDefinition> {
  definition: FormDefinition;

  constructor(definition: FormDefinition) {
    this.definition = definition;
  }

  create(node: IStateTreeNode): FormState<FormDefinition> {
    return new FormState(this, node);
  }
}

class FormState<FormDefinition> {
  form: Form<FormDefinition>;
  node: IStateTreeNode;

  constructor(form: Form<FormDefinition>, node: IStateTreeNode) {
    this.form = form;
    this.node = node;
  }

  value(path): any {
    return this.node[path];
  }

  access<K extends keyof FormDefinition>(
    name: K
  ): FieldAccessor<FormDefinition, FormDefinition[K]> {
    return new FieldAccessor(this, name);
  }
}

class FieldAccessor<FormDefinition, Value> {
  state: FormState<FormDefinition>;
  path: string;

  constructor(state: FormState<FormDefinition>, path: string) {
    this.state = state;
    this.path = path;
  }

  get value(): Value {
    return this.state.value(this.path);
  }
}

interface Definition {
  foo: string;
}

let definition: Definition = {
  foo: "FOO"
};

const form = new Form(definition);

const state = form.create(w);

const accessor = state.access("foo");

const value = accessor.value;

// function form(definition) {
//   return new Form(definition);
// }

// function field<T>() {}

// const f = form({
//   foo: field<string>()
// });

// const state = f.create(w);
// const f1 = state.access("foo").value;
