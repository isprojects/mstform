import React, { Component } from "react";
import { observer } from "mobx-react";
import { types } from "mobx-state-tree";
import { Field, Form, converters } from "../src/index";

// we have a MST model with a string field foo
const M = types.model("M", {
  foo: types.string
});

// we expose this field in our form
const form = new Form(M, {
  foo: new Field(converters.string, {
    validators: [value => (value !== "correct" ? "Wrong" : false)]
  })
});

// we create an instance of the model
const o = M.create({ foo: "FOO" });

type InlineErrorProps = {
  error?: string;
};

@observer
class InlineError extends Component<InlineErrorProps> {
  render() {
    const { children, error } = this.props;
    return (
      <div>
        {children}
        <span>{error}</span>
      </div>
    );
  }
}

type MyFormProps = {};

@observer
export class MyForm extends Component<MyFormProps> {
  state: typeof form.FormStateType;

  constructor(props: MyFormProps) {
    super(props);
    // we create a form state for this model
    this.state = form.state(o);
  }

  render() {
    // we get the foo field from the form
    const field = this.state.field("foo");
    return (
      <InlineError error={field.error}>
        <input type="text" {...field.inputProps} />
      </InlineError>
    );
  }
}
