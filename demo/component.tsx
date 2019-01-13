import React, { Component, PureComponent } from "react";
import { observer } from "mobx-react";
import { types, getSnapshot, getParent, destroy } from "mobx-state-tree";
import makeInspectable from "mobx-devtools-mst";
import { Field, Form, RepeatingForm, converters, FieldAccessor } from "../src/index";

const L = types
  .model("L", {
    c: types.string
  })
  .actions(self => ({
    remove(){
      getParent(self, 2).remove(self);
    }
  }));

// we have a MST model with a string field foo,
// and a few number fields
const M = types
  .model("M", {
    foo: types.string,
    a: types.number,
    b: types.number,
    derived: types.number,
    l: types.optional(types.string, ""),
    ls: types.array(L)
  })
  .actions(self => ({
    remove(ls) {
      destroy(ls);
    }
    , addLs(){
      const l = { c: self.l };
      self.ls.push(l);
    }
  }))
  .views(self => ({
    get calculated() {
      return self.a + self.b;
    }
  }));

// we create an instance of the model
const o = M.create({ foo: "FOO", a: 1, b: 3, derived: 4, ls: [ { c: "LSSS" }, { c: "teste" }, { c: "imprimindo" } ]});

makeInspectable(o);

// we expose this field in our form
const form = new Form(M, {
  foo: new Field(converters.string, {
    validators: [value => (value !== "correct" ? "Wrong" : false)]
  }),
  a: new Field(converters.number),
  b: new Field(converters.number),
  l: new Field(converters.string),
  ls: new RepeatingForm({
    c: new Field(converters.string)
  }),
  derived: new Field(converters.number, {
    derived: node => node.calculated
  })
});

type InlineErrorProps = {
  field?: FieldAccessor<any, any>;
};

@observer
class InlineError extends Component<InlineErrorProps> {
  render() {
    const { children, field } = this.props;
    return (
      <div>
        {children}
        {field && <span>{field.error}</span>}
      </div>
    );
  }
}

@observer
export class MyInput extends Component<{
  type: string;
  field: FieldAccessor<any, any>;
}> {
  render() {
    const { type, field } = this.props;
    return <input type={type} {...field.inputProps} />;
  }
}

type MyFormProps = {};

@observer
export class MyForm extends Component<MyFormProps> {
  formState: typeof form.FormStateType;

  constructor(props: MyFormProps) {
    super(props);
    // we create a form state for this model
    this.formState = form.state(o, {
      save: node => {
        console.log(getSnapshot(node));
        return null;
      }
    });
  }

  handleSave = () => {
    this.formState.save().then(r => {
      console.log("saved success", r);
    });
  };

  pushLs = () => {
    this.formState.node.addLs();
  };

  render() {
    const formState = this.formState;

    const foo = formState.field("foo");
    const a = formState.field("a");
    const b = formState.field("b");
    const l = formState.field("l");
    const lsForm = formState.repeatingForm("ls");
    const derived = formState.field("derived");

    const entries = o.ls.map((ls, index) => {
      // get the sub-form we want
      const l = lsForm.index(index);
      // and get the fields as usual
      const c = l.field("c");
      return (
          <div>
              <InlineError field={c}>
                  <MyInput type="text" field={c} />
              </InlineError>
              <button onClick={ls.remove}>X</button>
          </div>
      );
    });


    return (
      <div>
        <span>Simple text field with validator (set it to "correct")</span>
        <InlineError field={foo}>
          <MyInput type="text" field={foo} />
        </InlineError>
        <span>a input number for derived</span>
        <InlineError field={a}>
          <MyInput type="text" field={a} />
        </InlineError>
        <span>b input number for derived</span>
        <InlineError field={b}>
          <MyInput type="text" field={b} />
        </InlineError>
        <span>c add</span>
        <InlineError field={l}>
          <MyInput type="text" field={l} />
        </InlineError>
        <br />
        <span>c array input strign</span>
        <div>{entries}</div>
        <button onClick={this.pushLs}>AddEntity</button>
        <br />
        <span>derived from a + b with override</span>
        <InlineError field={derived}>
          <MyInput type="text" field={derived} />
        </InlineError>
        <button onClick={this.handleSave}>Save</button>
      </div>
    );
  }
}
