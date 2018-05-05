import { IModelType, types } from "mobx-state-tree";

const Model = types.model({
  foo: types.maybe(types.number),
  bar: types.string
});

const RawModel = types.model({
  foo: types.string,
  bar: types.string
});

interface Convert<R, V> {
  (raw: R): V;
}

interface Definition<R, V> {
  convert: Convert<R, V>;
}

type Fields<M> = { [K in keyof M]?: Field<any, M[K]> };

class MstForm<M> {
  constructor(public model: IModelType<any, M>, public fields: Fields<M>) {}

  access<K extends keyof M>(name: K): Accessor<any, M[K]> {
    const field = this.fields[name];
    if (field == null) {
      throw new Error("Unknown field");
    }
    return new Accessor(field as Field<any, M[K]>);
  }
}

class Accessor<R, V> {
  constructor(public field: Field<any, V>) {}
  Type(): V {
    throw new Error("just for typechecking");
  }
  RawType(): R {
    throw new Error("just for typechecking");
  }
}

class Field<R, V> {
  constructor(public definition: Definition<R, V>) {}
  //, public raw: IType<any, R>) {}

  RawType(): R {
    throw new Error("just for typechecking");
  }
}

// class StringField<V> extends Field<string, V> {
//   constructor(public definition: Definition<string, V>) {
//     super(definition, types.string);
//   }
// }

const form = new MstForm(Model, {
  foo: new Field({ convert: (raw: string) => parseInt(raw) }),
  bar: new Field({ convert: raw => raw.toString() })
});

const fields = form.fields;

const a = form.access("foo");
const f = a.field;
const fr = a.field.RawType();
const v = a.Type();
const r = a.RawType();
