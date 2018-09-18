import React, { Component } from "react";
import { observer } from "mobx-react";
import { types, getSnapshot } from "mobx-state-tree";
import makeInspectable from "mobx-devtools-mst";
import {
  Field,
  Form,
  converters,
  FieldAccessor,
  inputWrap
} from "../src/index";

// we have a MST model with a string field foo,
// and a few number fields
const M = types
  .model("M", {
    foo: types.string,
    a: types.number,
    b: types.number,
    derived: types.number
  })
  .views(self => ({
    get calculated() {
      return self.a + self.b;
    }
  }));

// we create an instance of the model
const o = M.create({ foo: "FOO", a: 1, b: 3, derived: 4 });

makeInspectable(o);

// we expose this field in our form
const form = new Form(M, {
  foo: new Field(converters.string, {
    validators: [value => (value !== "correct" ? "Wrong" : false)]
  }),
  a: new Field(converters.number),
  b: new Field(converters.number),
  derived: new Field(converters.number, {
    derived: node => node.calculated
  })
});

type InlineErrorProps = {
  field?: FieldAccessor<any, any, any>;
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

const MyInput = inputWrap(React.createFactory("input"), "MyInput");

// @observer
// export class MyInput extends Component<{
//   type: string;
//   field: FieldAccessor<any, any, any>;
// }> {
//   render() {
//     const { type, field } = this.props;
//     return <input type={type} {...field.inputProps} />;
//   }
// }

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

  render() {
    const formState = this.formState;

    const foo = formState.field("foo");
    const a = formState.field("a");
    const b = formState.field("b");
    const derived = formState.field("derived");
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
        <span>derived from a + b with override</span>
        <InlineError field={derived}>
          <MyInput type="text" field={derived} />
        </InlineError>
        <button onClick={this.handleSave}>Save</button>
      </div>
    );
  }
}
