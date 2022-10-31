import React, { Component, ReactNode } from "react";
import { observer } from "mobx-react";
import { Instance, types, getSnapshot } from "mobx-state-tree";
import {
  Field,
  Form,
  converters,
  FieldAccessor,
  RepeatingForm,
} from "../src/index";

// we have a MST model with a string field foo,
// and a few number fields
const N = types
  .model("N", {
    foo: types.string,
    a: types.number,
    b: types.number,
    derived: types.number,
    textarea: types.array(types.string),
  })
  .views((self) => ({
    get calculated() {
      return self.a + self.b;
    },
  }));

const newN = (count: number) => {
  return N.create({
    foo: `Some string ${count}`,
    a: 1,
    b: 2,
    derived: 3,
    textarea: ["value"],
  });
};

const M = types
  .model("M", {
    foo: types.string,
    a: types.number,
    b: types.number,
    derived: types.number,
    textarea: types.array(types.string),
    repeated: types.array(N),
  })
  .views((self) => ({
    get calculated() {
      return self.a + self.b;
    },
  }));

// we create an instance of the model
const o = M.create({
  foo: "FOO",
  a: 1,
  b: 3,
  derived: 4,
  textarea: [],
  repeated: [newN(1), newN(2), newN(3)],
});

// we expose this field in our form
const form = new Form(M, {
  foo: new Field(converters.string, {
    validators: [(value) => (value !== "correct" ? "Wrong" : false)],
  }),
  a: new Field(converters.number),
  b: new Field(converters.number),
  derived: new Field(converters.number, {
    derived: (node) => node.calculated,
  }),
  textarea: new Field(converters.textStringArray),
  repeated: new RepeatingForm({
    foo: new Field(converters.string, {
      validators: [(value) => (value !== "correct" ? "Wrong" : false)],
    }),
    a: new Field(converters.number),
    b: new Field(converters.number),
    derived: new Field(converters.number, {
      derived: (node) => node.calculated,
    }),
    textarea: new Field(converters.textStringArray),
  }),
});

const InlineError: React.FunctionComponent<{
  field?: FieldAccessor<any, any>;
  children: ReactNode;
}> = observer((props) => {
  const { field, children } = props;
  return (
    <div>
      {children}
      {field && <span>{field.error}</span>}
    </div>
  );
});

const MyInput: React.FunctionComponent<{
  type: string;
  field: FieldAccessor<any, any>;
}> = observer((props) => {
  const { type, field } = props;
  return <input type={type} {...field.inputProps} />;
});

const MyTextArea: React.FunctionComponent<{
  field: FieldAccessor<any, any>;
}> = observer((props) => <textarea {...props.field.inputProps} />);

type MyFormProps = Record<string, unknown>;

@observer
export class MyForm extends Component<MyFormProps> {
  formState: typeof form.FormStateType;

  constructor(props: MyFormProps) {
    super(props);
    // we create a form state for this model
    this.formState = form.state(o, {
      backend: {
        save: async (node) => {
          console.log(getSnapshot(node));
          return null;
        },
      },
    });
  }

  handleSave = () => {
    this.formState.save().then((r) => {
      console.log("saved success", r);
    });
  };

  handleRestore = () => {
    this.formState.restore();
  };

  handleAddRow = () => {
    const formState = this.formState;
    const repeated = formState.repeatingForm("repeated");
    repeated.push(newN(o.repeated.length));
  };

  handleDeleteRow = (instance: Instance<typeof N>) => {
    const formState = this.formState;
    const repeated = formState.repeatingForm("repeated");
    repeated.remove(instance);
  };

  renderRepeating() {
    const formState = this.formState;
    const repeated = formState.repeatingForm("repeated");
    const result: React.ReactElement[] = [];
    repeated.accessors.forEach((accessor, index) => {
      const state = repeated.index(index);
      const foo = state.field("foo");
      const a = state.field("a");
      const b = state.field("b");
      const derived = state.field("derived");
      const textarea = state.field("textarea");

      result.push(
        <span key={`repeating-${index}`} style={{ display: "flex" }}>
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
          <span>textarea field with list of strings</span>
          <InlineError field={textarea}>
            <MyTextArea field={textarea} />
          </InlineError>
          <button onClick={() => this.handleDeleteRow(state.value)}>
            Delete
          </button>
        </span>
      );
    });
    return result;
  }

  render() {
    const formState = this.formState;
    const foo = formState.field("foo");
    const a = formState.field("a");
    const b = formState.field("b");
    const derived = formState.field("derived");
    const textarea = formState.field("textarea");

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
        <span>textarea field with list of strings</span>
        <InlineError field={textarea}>
          <MyTextArea field={textarea} />
        </InlineError>
        <br />
        <br />
        <br />
        <span>Repeated</span>
        {this.renderRepeating()}
        <br />
        <button onClick={this.handleAddRow}>Add row</button>
        <br />
        <button onClick={this.handleSave}>Save</button>
        <button onClick={this.handleRestore}>Reset</button>
        <span>Dirty state: {formState.isDirty ? "dirty" : "clean"}</span>
      </div>
    );
  }
}
