import { IObservableArray } from "mobx";
import { IModelType, types } from "mobx-state-tree";
import { RepeatingFormAccessor } from ".";

const N = types.model("N", { bar: types.string });
const M = types.model("M", { qux: types.number, foo: types.array(N) });

type ArrayEntryType<T> = T extends IObservableArray<infer A> ? A : never;

type FormDefinition<M> = {
  [K in keyof M]?: Field<M[K]> | RepeatingForm<ArrayEntryType<M[K]>>
};
interface FieldDefinition<V> {
  convert?(R: any): V;
}

class Form<M> {
  constructor(
    public model: IModelType<any, M>,
    public definition: FormDefinition<M>
  ) {}

  field<K extends keyof M>(name: K): FieldAccessor<M[K]> {
    const field = this.definition[name];
    if (field == null || !(field instanceof Field)) {
      throw new Error("cannot");
    }
    return new FieldAccessor(field);
  }
  repeatingForm<K extends keyof M>(
    name: K
  ): RepeatingFormAccessor<ArrayEntryType<M[K]>> {
    const repeatingForm = this.definition[name];
    if (repeatingForm == null || !(repeatingForm instanceof RepeatingForm)) {
      throw new Error("cannot");
    }
    return new RepeatingFormAccessor(repeatingForm);
  }
}

class Field<V> {
  constructor(public definition: FieldDefinition<V>) {}
  get Type(): V {
    throw new Error("just for introspection");
  }
}
class RepeatingForm<M> {
  constructor(public definition: FormDefinition<M>) {}
}

class FieldAccessor<V> {
  constructor(public field: Field<V>) {}
  get Type(): V {
    throw new Error("Cannot");
  }
}

class RepeatingFormAccessor<M> {
  constructor(public repeatingForm: RepeatingForm<M>) {}

  field<K extends keyof M>(name: K): FieldAccessor<M[K]> {
    const field = this.repeatingForm.definition[name];
    if (field == null || !(field instanceof Field)) {
      throw new Error("cannot");
    }
    return new FieldAccessor(field);
  }
}

const form = new Form(M, {
  foo: new RepeatingForm({ bar: new Field({ convert: value => "foo" }) }),
  qux: new Field({ convert: value => 3 })
});

const qux = form.field("qux");
const foo = form.repeatingForm("foo");
const bar = foo.field("bar");
