import { IModelType, types } from "mobx-state-tree";

const Model = types.model({
  foo: types.maybe(types.number),
  bar: types.string
});

interface Convert<V> {
  (raw: string): V;
}

interface Definition<V> {
  convert: Convert<V>;
}

type Fields<M> = { [K in keyof M]?: Field<M[K]> };

class MstForm<M> {
  constructor(public model: IModelType<any, M>, public fields: Fields<M>) {}
  access<K extends keyof M>(name: K): Accessor<M[K]> {
    const field = this.fields[name];
    if (field == null) {
      throw new Error("Unknown field");
    }
    return new Accessor(field as Field<M[K]>);
  }
}

class Accessor<V> {
  constructor(public field: Field<V>) {}
  Type(): V {
    throw new Error("just for typechecking");
  }
}

class Field<V> {
  constructor(public definition: Definition<V>) {}
}

const form = new MstForm(Model, {
  foo: new Field({ convert: raw => parseInt(raw) }),
  bar: new Field({ convert: raw => raw })
});

const fields = form.fields;

const a = form.access("foo");
const f = a.field;
const v = a.Type();
