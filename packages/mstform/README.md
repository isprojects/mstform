# mstform README

mstform is a form library written for
[mobx-state-tree](https://github.com/mobxjs/mobx-state-tree) and
[React](https://reactjs.org/). It manages form state for you and lets you
define validation rules. It understands about repeating sub-forms as well. It
works with any React [controlled
components](https://reactjs.org/docs/forms.html) that define a `value` and a
`onChange` prop.

## Features

*   It knows about raw input (the value you type) and the converted input (the
    value you want). You may type a string but want a number, for instance.
*   It manages both raw input as well as the converted values for you.
*   Integrates deeply with a mobx-state-tree model. You give it a model
    instance and it renders its contents. When you are ready to submit the
    form, you have a mobx-state-tree model again.
*   Provides a range of standard converters so you don't have to write them
    yourself.
*   It knows the types of both raw and validated values. If you use vscode your
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
import {React, Component} from "react";
import { types } from "mobx-state-tree";
import {Form, Field, converters} from "mstform;

// we have a MST model with a string field foo
const M = types.model("M", {
    foo: types.string
});

// we create an instance of the model
const o = M.create({ foo: "FOO" });

// we expose this field in our form
const form = new Form(M, {
    foo: new Field(converters.string)
});

class InlineError extends Component {
    render() {
        const {children, error} = this.props;
        return <div>{children}{error}</div>
    }
}

class MyForm extends Component {
    constructor(props) {
        super(props);
        // we create a form state for this model
        this.state = form.create(o);
    }

    render() {
        // we get the foo field from the form
        const field = state.field("foo");
        return (
            <InlineError {...field.validationProps}>
                <input type="text" {...field.inputProps}></input>
            </InlineError>
        );
    }
}
```
