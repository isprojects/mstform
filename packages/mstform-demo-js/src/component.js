// @ts-check
import { observer } from "mobx-react";
import { types, resolvePath } from "mobx-state-tree";
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
const o = M.create({ foo: "FOO", a: 1, b: 2, derived: 4 });

// we expose this field in our form
const form = new Form(M, {
  foo: new Field(converters.string, {
    validators: [value => (value !== "correct" ? "Wrong" : false)],
    fromEvent: true
  }),
  a: new Field(converters.number, {
    fromEvent: true
  }),
  b: new Field(converters.number, {
    fromEvent: true
  }),
  derived: new Field(converters.number, {
    fromEvent: true,
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
    this.state = form.state(o);
  }

  render() {
    // we get the foo field from the form
    const state = this.state;
    const foo = state.field("foo");
    const a = state.field("a");
    const b = state.field("b");
    const derived = state.field("derived");

    return (
      <div>
        <span>Simple text field with validator</span>
        <InlineError error={foo.error}>
          <input type="text" value={foo.raw} onChange={foo.handleChange} />
        </InlineError>
        <span>a input number for derived</span>
        <InlineError error={a.error}>
          <input type="text" value={a.raw} onChange={a.handleChange} />
        </InlineError>
        <span>b input number for derived</span>
        <InlineError error={b.error}>
          <input type="text" value={b.raw} onChange={b.handleChange} />
        </InlineError>
        <span>derived from a + b with override</span>
        <InlineError error={derived.error}>
          <input
            type="text"
            value={derived.raw}
            onChange={derived.handleChange}
          />
        </InlineError>
      </div>
    );
  }
}
