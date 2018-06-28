// @ts-check
import { observer } from "mobx-react";
import { types, getSnapshot } from "mobx-state-tree";
import { Field, Form, converters } from "mstform";
import * as React from "react";
import { Component } from "react";

// we have a MST model with a string field foo
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
    this.state = form.state(o, {
      save: node => {
        console.log(getSnapshot(node));
        return null;
      }
    });
  }

  handleSave = () => {
    this.state.save().then(r => {
      console.log("saved success", r);
    });
  };

  render() {
    // we get the foo field from the form
    const state = this.state;
    const foo = state.field("foo");
    const a = state.field("a");
    const b = state.field("b");
    const derived = state.field("derived");

    return (
      <div>
        <span>Simple text field with validator (set it to "correct")</span>
        <InlineError error={foo.error}>
          <input type="text" {...foo.inputProps} />
        </InlineError>
        <span>a input number for derived</span>
        <InlineError error={a.error}>
          <input type="text" {...a.inputProps} />
        </InlineError>
        <span>b input number for derived</span>
        <InlineError error={b.error}>
          <input type="text" {...b.inputProps} />
        </InlineError>
        <span>derived from a + b with override</span>
        <InlineError error={derived.error}>
          <input type="text" {...derived.inputProps} />
        </InlineError>
        <button onClick={this.handleSave}>Save</button>
      </div>
    );
  }
}
