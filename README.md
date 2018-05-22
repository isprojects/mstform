# mstform README

mstform is a form library written for
[mobx-state-tree](https://github.com/mobxjs/mobx-state-tree) and
[React](https://reactjs.org/). It manages form state for you and lets you
define validation rules. It understands about repeating sub-forms as well.

It doesn't put any requirements on what your widgets look like. It works with
any React [controlled components](https://reactjs.org/docs/forms.html) that
define a `value` and a `onChange` prop.

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
  editor tells you if you do something wrong. This works even in
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

But those two desires are in conflict with each other. It's tempting for
instance to start auto-generating forms, but this only works for simple use
cases. This way a form library that automates too much can be in the way when
you want to customize it to fit your application's requirements exactly. On the
other hand if your form library that doesn't do enough means you end up writing
a lot of custom code.

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

I've enabled `ts-check` on top. If you're using vscode you can see
it reflect the correct types -- it knows raw is a string, for instance. This
can help to catch errors.

## RepeatingForm

Often in a form you have a sub-form that repeats itself. The MST type
could look like this:

```javascript
const Animal = types.model("Animal", {
  name: types.string,
  size: types.string
});

const Zoo = types.model("Zoo", {
  animals: types.array(Animal)
});
```

Here we want a form that lets you add and remove animals. We can do it
like this:

```javascript
import { RepeatingForm } from "mstform";

const form = new Form(Zoo, {
  animals: new RepeatingForm({
    name: new Field(converters.string),
    size: new Field(converters.string)
  })
});
```

We can now use it like this in our `render` method:

```javascript
// this represents all the subforms
const animalForms = state.repeatingForm("animals");

const entries = o.animals.map((animal, index) => {
  // get the sub-form we want
  const animalForm = animalForms.index(index);
  // and get the fields as usual
  const name = animalForm.field("name");
  const size = animalForm.field("size");
  return (
    <div>
      <InlineError error={name.error}>
        <input type="text" value={name.raw} onChange={name.handleChange} />
      </InlineError>
      <InlineError error={size.error}>
        <input type="text" value={size.raw} onChange={size.handleChange} />
      </InlineError>
    </div>
  );
});

return <div>{entries}</div>;
```

## Supported converters

Converters specify the raw value and the converted value. Sometimes
these are the same, but often they're now.

### Converters from raw string value

The input raw value that comes is a string for all of these. The converted
value may be a string or some other object:

* `converters.string`: value is a string.

* `converters.number`: value is a number.

* `converters.integer`: value is an integer.

* `converters.decimal(maxDigits, decimalPlaces)`: value is a string that
  contains a decimal number with a maximum `maxDigits` before the period and a
  maximum of `decimalPlaces` after the period.

### Arrays

`converters.stringArray`: raw value is an array of strings. value is
an observable array of strings. Note that this is for using arrays
as a value. When you want the user to be able to add items to the array,
using `RepeatingForm` instead.

### Models

`converters.model(Model)`: does not do any conversion (model instance goes
in, model instance comes out), but allows you to specify that a MST model
comes in as a raw value and is the value. Typescript will be happy.

### Maybe

`converters.maybe(converter)`: This works on converters that convert raw
string values as well as converters that deal with MST nodes.

When you wrap it around any converter that takes a raw string value, the empty
value is accepted and converted into `null`. This allows you to model empty
values.

It can also be wrapped around a `model` converter, in which case it now accepts
empty. This is handy when you have a `types.maybe(types.reference())` in MST.

### Object

`converters.object`: this accept any object as raw value and returns it,
including `null`. Prefer `converters.model` if you can.

## Add Mode

There are two ways to deal with an underlying MST node:

* edit form: edit an existing MST node.

* add form: edit a newly created MST node.

Consider this MST type:

```javascript
const Foo = types.model("Foo", {
  nr: types.number
});
```

It has a required number as content. How do we create an add form for it?

First need to create an instance which uses an arbitrary value for `nr`,
in this case `0`:

```javascript
const node = Foo.create({ nr: 0 });
```

If we create a normal edit form for this node, we see the raw value
`"0"` in the input widget the form. But in an add form we don't actually know
the value yet and we want to display an empty input widget (raw value `""`).
We can accomplish this by setting the form in add mode when we create it:

```javascript
const state = form.state(node, { addMode: true });
```

This way the form is shown correctly, with the empty values. The converter
defines the appropriate empty value for a field.

### Add mode for repeating forms

Each time you add a new repeating sub-form, that sub-form should be in add
mode, even in edit forms. mstform automatically takes care of this if you use
the `.push` and `.insert` methods on the repeating form accessor. Existing
records are shown in edit mode, unless the whole form is in add mode.

## Saving and server errors

When we create the form state, we can pass it some options. One is a function
that actually saves the content in the form:

```javascript
this.state = form.state(o, {
  save: async node => {
    // we call the real save function that actually knows
    // how to save the form. This can come in as a prop, for instance.
    return await onSave(getSnapshot(node));
  }
});
```

Once you've hooked up your own save functionality, you should call
`state.save()` when you do a form submit. This does the following:

* Makes sure the form is completely valid before it's submitted to the server,
  otherwise displays client-side validation errors.

* Uses your `save` function do to the actual saving.

* Processes any additional validation errors returned by the server.

If you don't specify your own `save` you can still call `state.save()`, but
it gives you a warning on the console that no actual saving could take place.
This is handy during development when you haven't wired up your
backend logic yet.

The last point requires elaboration: when you save form content to some backend
it may result in additional validation errors that are generated there.
Sometimes it's easier to detect errors in the backend, and doing server-side
validation is a good idea from a security perspective anyhow. mstform supports
displaying those errors.

The save function either returns `null` if the save succeeded and there are no
server validation issues, or returns a special `errors` structure that matches
the structure of the MST node. So, if you have an MST model like this:

```javascript
const M = types.model("M", {
  name: types.string()
});
```

The error structure needs to be:

```
{
  name: "Could not be matched in the database"
}
```

Every `Field` can have an error entry.

## Controlling validation messages

By default, mstform displays inline validation errors as soon as you
make a mistake. This may not be desirable. You can turn it off by
passing another option:

```javascript
this.state = form.state(o, {
  validation: {
    beforeSave: "no"
  }
});
```

Now inline validation only occurs after you save, not before.

It's also possible to turn off inline validation altogether:

```javascript
this.state = form.state(o, {
  validation: {
    beforeSave: "no",
    afterSave: "no"
  }
});
```

Only validation messages generated during the save process (either client-side
or server side) are displayed now.

## Disabled and hidden fields

mstform has two hooks that let you calculate `hidden` and `disabled`
state based on the field accessor. Here is a small example that makes the
`foo` field disabled. This uses the JSON Path functionality of MSTForm
to determine whether a field is disabled, but any operation can be
implemented here. You could for instance retrieve information about which
fields are disabled dynamically from the backend before you display the form.

```javascript
const state = form.state(o, {
  isDisabled: accessor => accessor.path === "/foo"
});
```

To implement hidden behavior, pass in `isHidden`. You can also
determine whether a repeating form is disabled from add and remove using `isRepeatingFormDisabled`. It's up to you to use this information to
render the add and remove buttons with the disabled status, however.

## Extra validation

Sometimes the information needed to validate the form cannot be known at form
definition time, but only when the form is being rendered. mstform has a hook
that lets you define additional validation behavior on the form level.

```javascript
const state = form.state(o, {
  extraValidation: (accessor, value) => {
    if (accessor.path === "/foo") {
      return value === "Wrong" ? "Wrong!" : false;
    }
  }
});
```

Note that you have to use the second `value` argument to get the value,
as `accessor.value` still has the old value.
