// @ts-check
import { observer } from "mobx-react";
import { types } from "mobx-state-tree";
import { Field, Form, FormState, converters } from "mstform";
import * as React from "react";
import { Component } from "react";

// we have a MST model with a string field foo
const M = types.model("M", {
  foo: types.string
});

// we create an instance of the model
const o = M.create({ foo: "FOO" });

// we expose this field in our form
const form = new Form(M, {
  foo: new Field(converters.string, {
    validators: [value => (value !== "correct" ? "Wrong" : false)],
    fromEvent: true
  })
});

@observer
class InlineError extends Component {
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

@observer
export class MyForm extends Component {
  constructor(props) {
    super(props);
    // we create a form state for this model
    this.state = form.state(o);
  }

  render() {
    // we get the foo field from the form
    const field = this.state.field("foo");
    return (
      <InlineError error={field.error}>
        <input type="text" value={field.raw} onChange={field.handleChange} />
      </InlineError>
    );
  }
}
