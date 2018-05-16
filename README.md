# mstform README

mstform is a form library written for
[mobx-state-tree](https://github.com/mobxjs/mobx-state-tree) and
[React](https://reactjs.org/). It manages form state for you and lets you
define validation rules. It understands about repeating sub-forms as well. It
works with any React [controlled
components](https://reactjs.org/docs/forms.html) that define a `value` and a
`onChange` prop.

## Features

* It knows about raw input (the value you type) and the converted input (the
  value you want). You may type a string but want a number, for instance.
* It manages both raw input as well as the converted values for you.
* Integrates deeply with a mobx-state-tree model. You give it a model
  instance and it renders its contents. When you are ready to submit the
  form, you have a mobx-state-tree model again.
* Provides a range of standard converters so you don't have to write them
  yourself.
* It knows the types of both raw and validated values. If you use vscode your
  editor will tell you if you do something wrong. This will work even in
  plain Javascript if you enable `ts-check`.

## Philosophy

I've been writing form libraries since 1999. Back then forms were rendered and
handled entirely on the server. In 2011, before React, I built my first
client-side form library. I've used quite a few different React-based form
libraries and rolled also quite a bit of form handling code of my own.

I've learned that form libraries are tricky.

Web forms are an integral part of most web applications. This means that you
need a lot of flexibility: you want to be able to mix form content with
non-form content, use whichever React components you like for input (from plain
HTML `<input>` to fancy UI component libraries), and style it the way you want.

Web forms are also everywhere. That's why we'd like to automate as much
as possible and write as little form-specific code as possible.

But those two desires are in conflict with each other. A form library that
automates a lot starts to be in the way when you want to customize it to fit
a UI exactly. On the other hand a form library that doesn't do enough means
you end up writing a lot of custom code.

mstform balances simple usage with flexibility. It doesn't provide any React
widgets, or in fact any React components at all. It doesn't auto-generate forms
either. You write your own React components that render the form, and mstform
automates the management of values and errors. It aims to make the form
code that you do write look as straightforward as possible.

## A Simple Example

```javascript
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

// we expose this field in our form
const form = new Form(M, {
  foo: new Field(converters.string, {
    validators: [value => (value !== "correct" ? "Wrong" : false)],
    fromEvent: true
  })
});

// we create an instance of the model
const o = M.create({ foo: "FOO" });

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
    this.state = form.create(o);
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
```

## What's going on in the example?

A form needs to define fields for entries you want to expose in the form. You
need to provide the first argument, a converter. The converter specifies how to
turn a raw value as input by a user into a value you want to store in our MST
model instance. This can do validation itself -- `converters.number` for
instance makes sure that only numbers are accepted, not other text.

The second argument are options for the field. You can provide additional
validator functions in a list. A validation function should return a string
in case of a validation error, or return `false`, `null` or `undefined`
if there is no error.

`fromEvent` indicates we want to pull the raw value to validate and convert
from the `event` object that's emitted by the `onChange` of the input. This is
the case for basic `<input>` elements. Many higher-level input elements don't
send an event but instead pass the value directly as the first argument to the
`onChange` handler. The default behavior of mstform is to assume this.

We define a special `InlineError` component that can display error text. Your
UI component library have a nicer component that helps to display errors --
antd for instance has `Form.Item`.

We then define `MyForm` to display the form. We create the form state
and store it on `this` in the constructor. Here we get `o` from
the global scope, but typically the object to edit in the form comes in
as a prop, and we can access it here.

Then in `render` we retrieve the field accessor for the `foo` field.
This has everything we need: `error` to show the current error, `raw`
for the raw value, and `handleChange` for an onChange handler.

## RepeatingForm

Often in a form you have a sub-form that repeats itself. The MST type
could look like this:

```javascript
import { types } from "mobx-state-tree";

const Animal = types.model("Animal", {
  name: types.string,
  size: types.string
});

const Zoo = types.model("Zoo", {
  animals: types.array(Animal)
});
```

Instead of `Field` you can use `RepeatingForm` to allow the ed
