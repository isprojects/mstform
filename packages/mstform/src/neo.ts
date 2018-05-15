import { IModelType, types } from "mobx-state-tree";

export interface Convert<R, V> {
  (raw: R): V;
}

export interface Validate<V> {
  (value: V): string | false;
}

const numberConvert: Convert<string, number> = raw => {
  return parseInt(raw, 10);
};

const stringConvert: Convert<string, string> = raw => {
  return raw;
};

interface FieldDefinition<R, V> {
  converter: Convert<R, V>;
  rawValidate?: Validate<R>;
  validate?: Validate<V>;
  message?: string;
}

class Field<R, V> {
  public converter: Convert<R, V>;

  constructor(public definition: FieldDefinition<R, V>) {
    this.converter = definition.converter;
  }

  get RawType(): R {
    throw new Error("");
  }

  get ValueType(): V {
    throw new Error("");
  }
}

type FormDefinition<M> = { [K in keyof M]: Field<any, M[K]> };

class Accessor<R, V> {}

class Form<M, D extends FormDefinition<M>> {
  constructor(public modelType: IModelType<any, M>, public definition: D) {}

  accessor<K extends keyof M>(name: K): Accessor<D[K]["RawType"], M[K]> {
    return new Accessor();
  }
}

const M = types.model({
  foo: types.string
});

const N = types.model({
  bar: types.number
});

const form = new Form(M, { foo: new Field({ converter: stringConvert }) });
// const form2 = new Form(M, {
//   foo: { raw: types.number, field: { convert: value => value } }
// });
const value = form.accessor("foo");

const form2 = new Form(N, { bar: new Field({ converter: numberConvert }) });

const value2 = form2.accessor("bar");
