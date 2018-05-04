import { IModelType, types } from "mobx-state-tree";

const Model = types.model({
  foo: types.number,
  bar: types.string
});

interface Convert<V> {
  (raw: string): V;
}

interface Definition<V> {
  convert: Convert<V>;
}

type Fields<M> = { [K in keyof M]?: Definition<M[K]> };

class MstForm<M> {
  constructor(public model: IModelType<any, M>, public fields: Fields<M>) {}
  access<K extends keyof M>(name: K): Accessor<M[K]> {
    return new Accessor();
  }
}

class Accessor<V> {
  Type(): V {
    throw new Error("just for typechecking");
  }
}

class Field<V> {
  Type(): V {
    throw new Error("just for typechecking");
  }
}

const form = new MstForm(Model, {
  foo: { convert: (raw: string) => parseInt(raw) }
});

const a = form.access("foo");
const v = a.Type();
