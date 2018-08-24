# mstform README

mstform is a form library written for
[mobx-state-tree](https://github.com/mobxjs/mobx-state-tree) and
[React](https://reactjs.org/). It manages form state for you and lets you
define validation rules. It understands about repeating sub-forms as well.

It doesn't put any requirements on your widgets. It works with any React
[controlled component](https://reactjs.org/docs/forms.html).

## Features

-   It knows about raw input (the value you type) and the converted input (the
    value you want). You may type a string but want a number, for instance.
    mstform converts this automatically.
-   It can drive any React controlled component. It normalizes input components
    so it can generate the right props for it -- whether it be a input type
    string, type checked or a custom component that works in terms of objects -
    mstform has you covered.
-   Integrates deeply with a mobx-state-tree (MST) model. You give it a model
    instance and it renders its contents. When you are ready to submit the form,
    you have a mobx-state-tree model again. You can modify the mobx-state-tree
    instance in code as well and the form is automatically updated.
-   Thanks to MST it's easy to convert form contents to JSON and back again.
-   It knows about types. If you use vscode for instance, your editor tells you
    if you do something wrong. This works even in plain Javascript if you enable
    `ts-check`.

## Philosophy

Form libraries are tricky.

Web forms are an integral part of most web applications. This means that you
need a lot of flexibility: you want to be able to mix form content with
non-form content, use whichever React components you like for input (from plain
HTML `<input>` to fancy UI component libraries), and style it the way you want.

Web forms are also everywhere. That's why we'd like to automate as much as
possible and write as little form-specific code as possible.

But those two desires are in conflict with each other. It's tempting to start
auto-generating forms. It makes writing forms really easy. Unfortunately many
forms need special behavior, and it's difficult to capture this in an
auto-generating form library.

This way a form library that automates too much can be in the way when you want
to customize it to fit your application's requirements exactly. On the other
hand if your form library that doesn't do enough means you end up writing a lot
of custom code.

mstform balances simple usage with flexibility. It doesn't provide any React
widgets, or in fact any React components at all. It doesn't auto-generate forms
either. You write your own React components that render the form, and mstform
automates the management of values and errors. It aims to make the form code
that you do write look as straightforward as possible.

mstform is also built on a very powerful state management library:
mobx-state-tree (MST). Both the library and the application programmer can use
its features to make form construction more easy. As one example, MST makes it
trivial to serialize form contents to JSON and restore it again.

## A Simple Example

```js
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
        validators: [value => (value !== "correct" ? "Wrong" : false)]
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
                <input type="text" {...field.inputProps} />
            </InlineError>
        );
    }
}
```

## What's going on in the example?

First we define a MST model `M`, which defines a string property `foo`. Next we
define a form for that model. We pass the model definition as the first
argument to the `Form` constructor.

A form needs to define fields for entries you want to expose in the form. Each
`Field` needs a converter. The converter specifies how to turn a raw value as
input by a user into a value you want to store in our MST model instance. Here
we use `converters.string`, a simple string, which is also stored as a string.
That's not a very fancy converter. A more complex converter would be
`converters.number`, which converts the input string into a number, and does
some validation to make sure that only numbers can be entered into the form.

The field definition also takes a number of options. The option we specify here
is a validation function. You can provide additional validator functions in a
list. If the validation function returns a string, that is the text of the
validation error and the validation has failed -- the entered value is not
stored in the underlying model instance. If the validation is successful, the
function should return `false`, `null` or `undefined`; not returning any value
is a successful validation.

We define a simple `InlineError` component that can display error text. Your UI
component library probably has a nicer component that helps to display errors
-- Ant Design for instance has `Form.Item`.

We then define a `MyForm` component that actually displays the form. To display
a form we need to initialize its _form state_. We create the form state with
`form.state` and store it on `this` in the constructor.

The form state maintains form-related state, such as errors to display. It also
can take state specific configuration (for instance how to save the form), but
in this case we don't supply any.

The form state needs a MST instance; this is the MST instance that you modify
with the form. When the user changes the form and it passes validation, the MST
instance is directly updated.

Here the MST instance is `o` from the global scope. but typically the object to
edit in the form comes in as a prop, and we can access it here.

Then in `render` we retrieve the field accessor for the `foo` field. This has
everything we need: `error` to show the current error, and `inputProps` for the
input component.

I've enabled `ts-check` on top. If you're using vscode you can see
it reflect the correct types -- it knows raw is a string, for instance. This
can help to catch errors.

## RepeatingForm

Many forms have a sub-form that repeats itself. The MST model
could look like this:

```js
const Animal = types.model("Animal", {
    name: types.string,
    size: types.string
});

const Zoo = types.model("Zoo", {
    animals: types.array(Animal)
});
```

Here we want a form that lets you add and remove animals:

```js
import { RepeatingForm } from "mstform";

const form = new Form(Zoo, {
    animals: new RepeatingForm({
        name: new Field(converters.string),
        size: new Field(converters.string)
    })
});
```

We can now use it in our `render` method:

```js
// this represents all the sub forms
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
                <input type="text" {...name.inputProps} />
            </InlineError>
            <InlineError error={size.error}>
                <input type="text" {...name.inputProps} />
            </InlineError>
        </div>
    );
});

return <div>{entries}</div>;
```

## Supported converters

A converter specifies how to convert a raw value as it is entered in the form
to the converted value as it's stored in the MST instance, and back again. A
converter also specifies the empty form of the raw value (such as an empty
string), which is used by add forms. It also specifies which controlled props
to generate by default for React. Conversion may fail, in which case the
converter generates a validation error.

### Converters from raw string value

The input raw value is a string. The converted value may be a string or some
other object:

-   `converters.string`: value is a string.

-   `converters.number`: value is a number.

-   `converters.integer`: value is an integer.

-   `converters.decimal(maxDigits, decimalPlaces)`: value is a string (not a
    number) that contains a decimal number with a maximum `maxDigits` before the
    period and a maximum of `decimalPlaces` after the period.

### Boolean

`converters.boolean`: raw value is a boolean, value is also a boolean. The
default raw value in add forms is `false`.

### Arrays

`converters.stringArray`: raw value is an array of strings. value is an
observable array of strings. Note that this is for using arrays that are
treated a value -- a list of which checkboxes are selected, for instance. When
you want the user to be able to add items to the array, using `RepeatingForm`
instead.

### Models

`converters.model(Model)`: does not do any conversion (model instance goes in,
model instance comes out), but allows you to specify that a MST model comes in
as a raw value and is the value. Typescript will be happy. This can be used to
support an input component such as a drop-down selection that generate a
reference to an object. This fits MST's `types.reference`.

### Maybe

`converters.maybe(converter)`: This works on converters that convert raw
string values as well as converters that deal with MST nodes.

When you wrap it around any converter that takes a raw string value, the empty
value (such as the empty string) is accepted and converted into `null`. This
allows you to model empty values.

It can also be wrapped around a `model` converter, in which case it now accepts
empty. This is handy when you have a `types.maybe(types.reference())` in MST.

### Object

`converters.object`: this accept any object as raw value and returns it,
including `null`. Prefer `converters.model` if you can. Warning: the default
raw value is `null` and using this with basic data types (string, boolean,
number and such) won't make the type checker happy as they don't accept "null".
Use more specific converters instead.

## Controlled props

A [controlled component](https://reactjs.org/docs/forms.html) is a React
component that displays a value and defines an `onChange` handler that is
called when the value is changed by the user. The component itself does not
manage its value; this is done externally. mstform is a library that helps
you control these components for you.

Controlled components receive subtly different props:

-   `input` type `string` has a `value` prop and an `onChange` with an event. It
    gets the updated value from `event.target.value`.

-   `input` type `checkbox` has a `checked` prop and an `onChange` that receives
    `event.target.checked` with the updated value.

-   There are also higher level widgets where `value` and `onChange` are
    symmetrical. A date picker widget for instance could have a JS `Date` as
    `value` and `onChange` directly returns a new `Date` instance.

mstform offers a `controlled` hook. It takes a function that given the field
accessor returns the right props for control. This can be used to ensure that
`accessor.inputProps` contains the right information for your particular
controlled component.

There are three `controlled` implementations built in:

-   `controlled.value` - `value` and `onChange` processes
    `event.target.value`.

-   `controlled.checked` - `checked` and `onChange` processes
    `event.target.checked`.

-   `controlled.object` - `value` represents some object and `onChange` gets a
    new object as an argument. Symmetrical `value` and `onChange`.

By default the converter determines which is used. If you use the `string`
converter or a derivative, `controlled.value` is used, and if you use the
`boolean` converter by default the `controlled.checked` is used. For
anything else the default is `controlled.object`.

You can always override `controlled` in the field configuration. For
example:

```js
import { observer } from "mobx-react";
import { types } from "mobx-state-tree";
import { Field, Form, FormState, converters, controlled } from "mstform";
import * as React from "react";
import { Component } from "react";

// we have a MST model with a string field foo
const M = types.model("M", {
    foo: types.string
});

// we expose this field in our form
const form = new Form(M, {
    foo: new Field(converters.string, {
        controlled: controlled.string
    })
});
```

For backward compatibility with earlier versions of mstform, mstform also
supports `fromEvent` and `getRaw` in the field options. `fromEvent` is a flag
that indicates we want to pull the raw value to validate and convert from the
`event.target.value`. `getRaw` is a function that given the arguments to
`onChange` turns them into the updated raw value.

## Add Mode

So far we've described how to use mstform with edit forms -- we display what's
in a MST instance and allow the user to edit it. There's another use case where
you want to create a new MST instance however: an add form.

Consider this MST model:

```js
const M = types.model("Foo", {
    nr: types.number
});
```

How do we create an add form for it? The add form needs an MST instance so that
it can store the user-entered values. But this model _requires_ you to create
an instance with a value for `nr`.

Let's do that and use an arbitrary number for `nr`. We could have picked
any number but `0` is probably the most clear, so we use that:

```js
const node = M.create({ nr: 0 });
```

Let's look at the form definition:

```js
const form = new Form(M, {
    nr: new Field(converters.number)
});
```

If we create a normal edit form for this node, we would see the raw value `"0"`
in the input widget the form. That's not what we want to do in an add form; we
want to display an empty input widget (raw value `""`, the empty string). We
can accomplish this by setting the form in add mode when we create it:

```js
const state = form.state(node, { addMode: true });
```

This way the form is shown correctly, with the empty values. How does it know
what empty values to display in an add form? The converter actually specifies
this -- `converters.number` for instance knows that the empty value is the
empty string.

### Add mode for repeating forms

Consider a repeating sub-form. Adding a new entry to a sub-form is much like
having an add form. Each time you add a new entry, the new sub-form should be
in add mode, even in edit forms. mstform automatically takes care of this if
you use the `.push` and `.insert` methods on the repeating form accessor, or if
you manipulate the underlying model directly. Existing records are shown in
edit mode, unless the whole form is in add mode.

## Saving

When we create the form state, we can pass it some options. One is a function
that explains how to save the MST instance, for instance by sending JSON
to a backend:

```js
this.state = form.state(o, {
    save: async node => {
        // we call the real save function that actually knows
        // how to save the form.
        return node.save();
    }
});
```

The save function should return `null` if the save succeeded and there are no
server validation errors. It can also returns a special `errors` object in case
saving failed -- we discuss this in a bit.

Then when you implement a form submit button, you should call `state.save()`:

```js
@observer
export class MyForm extends Component {
    constructor(props) {
        super(props);
        // we create a form state for this model
        this.state = form.state(o, {
            save: async node => {
                return node.save();
            }
        });
    }

    handleSave = async () => {
        const success = await this.state.save();
        if (success) {
            // success
        } else {
            // failure
        }
    };

    render() {
        // we get the foo field from the form
        const field = this.state.field("foo");
        return (
            <div>
                ... render the form itself
                <button onClick={this.handleSave}>Save</button>
            </div>
        );
    }
}
```

`state.save()` does the following:

-   Makes sure the form is completely valid before it's submitted to the server,
    otherwise displays client-side validation errors.

-   Uses your supplied `save` function do to the actual saving.

-   Processes any additional validation errors returned by the server.

-   Returns `true` if saving succeeded, and `false` if not due to validation
    errors.

If you don't specify your own `save` you can still call `state.save()`, but
it gives you a warning on the console that no actual saving could take place.
This is handy during development when you haven't wired up your
backend logic yet.

### Save errors

When you save form content to some backend it may result in additional
validation errors that are generated there. It is easier to detect
some errors on the backend. It's a good idea to do server-side validation
in any case, and it can be useful to reuse those errors in the frontend.

As we said above, if your `save` function doesn't return `null` it should
return a custom object that contains server validation errors.

This can contain a description of the error, for instance:

```js
{
    myError: "We cannot accept this data";
}
```

You can access these errors (so you can render them to the end user):

```js
state.additionalError("myError");
```

Or you can get a list of all of them with `state.additionalErrors()`.

You can also specify errors for particular fields, by naming the error key the
same as the name of the field. So, if you have an MST model like this:

```js
const M = types.model("M", {
    name: types.string()
});
```

And you want to display a specific backend-generated error for `name`, the
error structure returned by `save()` needs to be:

```js
{
    name: "Could not be matched in the database";
}
```

Every `Field` can have an error entry. This also works for repeating forms; if
you have a repeating structure `entries` and there is an error in `name` of the
second entry, the error structure should look like this:

```js
{
    entries: [{}, { name: "We couldn't handle this" }];
}
```

## Controlling validation messages

By default, mstform displays inline validation errors as soon as you
make a mistake. This may not be desirable. You can turn it off by
passing another option:

```js
this.state = form.state(o, {
    validation: {
        beforeSave: "no"
    }
});
```

Now inline validation only occurs after you save the first time, not before.

It's also possible to turn off inline validation altogether:

```js
this.state = form.state(o, {
    validation: {
        beforeSave: "no",
        afterSave: "no"
    }
});
```

In this case the user only sees updated validation errors once they press the
button that triggers `state.save()` and no errors are generated when the user
is filling in the form.

## Groups

If you have a form with a lot of fields in the UI you want to split it up into
multiple tabs or menu entries. Each tab is a coherent set of related fields.
But if the underlying model instance is saved as a whole, you need to be able
to show validation issues in other tabs. You can do this using groups.

You can express such groups using `Group`:

```js
const M = types.model("M", {
    foo: types.number,
    bar: types.number,
    baz: types.number,
    qux: types.number
});

const groupA = new Group(M, ["foo", "bar"]);
const groupB = new Group(M, ["baz", "qux"]);

const o = M.create({ foo: 1, bar: 2, baz: 3, qux: 4 });

const state = form.state(o);

const accessGroupA = groupA.access(state);
const accessGroupB = groupB.access(state);
```

On `accessGroupA` and `accessGroupB` you can now use `.field()`,
`.repeatingForm()`, as usual. You're not allowed to access any fields you
didn't list in the group.

You can request whether a group state is valid using `isValid`:

```js
const tabAValid = groupA.isValid;
const tabBValid = groupB.isValid;
```

## Disabled and hidden fields

mstform has two hooks that let you calculate `hidden` and `disabled`
state based on the field accessor. Here is a small example that makes the
`foo` field disabled. This uses the JSON Path functionality of mstform
to determine whether a field is disabled, but any operation can be
implemented here. You could for instance retrieve information about which
fields are disabled dynamically from the backend before you display the form.

```js
const state = form.state(o, {
    isDisabled: accessor => accessor.path === "/foo"
});
```

To implement hidden behavior, pass in an `isHidden` function. You can also
determine whether a repeating form is disabled from add and remove using
`isRepeatingFormDisabled`. It's up to you to use this information to render the
add and remove buttons with the disabled status, however.

`isDisabled` makes the `disabled` prop `true` in `accessor.inputProps`. There
is no such behavior for `hidden`; use `accessor.hidden` in your form rendering
code to determine whether a field wants to be hidden.

## Extra validation

Sometimes the information needed to validate the form cannot be known in
advance at form definition time. Instead, the form can be displayed multiple
times in the application, each time with different validation requirements.
mstform has a hook that lets you define additional validation behavior on the
form level.

```js
const state = form.state(o, {
    extraValidation: (accessor, value) => {
        if (accessor.path === "/foo") {
            return value === "Wrong" ? "Wrong!" : false;
        }
    }
});
```

Note that you have to use the second `value` argument to get the value to use
to validate, as `accessor.value` still has the old value.

## Derived values

The value of some fields depends on the value of other fields; you can express
this relationship in a MST view. In some forms you want to automatically
calculate such a derived value but still allow the user to override it
explicitly. Then if the input to the calculation changes, the value is updated
again.

You express such derived values with mstform:

```js
const M = types
    .model("M", {
        calculated: types.number,
        a: types.number,
        b: types.number
    })
    .views(self => ({
        sum() {
            return self.a + self.b;
        }
    }));

const form = new Form(M, {
    calculated: new Field(converters.number, {
        derived: node => node.sum()
    }),
    a: new Field(converters.number),
    b: new Field(converters.number)
});
```

`calculated` starts out with the value based on the sum of `a` and `b`. The
user can modify `calculated` directly. When the user modifies `a` or `b`, the
derived value changes again to the result of the `derived` function.

When you access a repeating form, the node passed into the derived function is
the sub-node that the repeating form represents, so the derived value is
determined within that context.

Note that derived calculations occur if you actually access the field
to use it in a form; it doesn't work for fields that are never used.

## Change hook

When you change one field it's sometimes useful to have some side effect, for
instance to change the value of another field. You can do so with the `change`
hook:

```js
const M = types
    .model("M", {
        a: types.number,
        b: types.number
    })
    .actions(self => ({
        setB(value: number) {
            self.b = value;
        }
    }));

const form = new Form(M, {
    a: new Field(converters.number, {
        change: (node, value) => {
            node.setB(value);
        }
    }),
    b: new Field(converters.number)
});
```

We have defined an action that lets us modify `b`, which is represented
by the field `b`. We implement a change hook to call that action whenever
`a` is changed. This only happens if `a` passes validation -- changes
to `a` that result in an error message don't result in an execution
of the `change` hook.

## Focus hook

You may want to react to field focus events. You can do this with a custom
onFocus event handler on the input element, but in some cases you want to react
generically to _all_ focus events in a form. You can pass a special hook
to the form state options for this:

```js
const state = form.state(o, {
    focus: (ev, accessor) => {
        // do something here
    }
});
```

The hook receives the event and the focused field accessor. You can use the
accessor to get the field name (`accessor.name`), value (`accessor.value`),
etc. When you define the hook, `inputProps` on the field accessor contains an
`onFocus` handler, so if you use that with the field it is there automatically.

## validationProps

`FieldAccessor` defines a property `validationProps` that can be used to drive
the UI in a more advanced way than we did above with `InlineError`. Let's look
at the [antd UI component library](https://ant.design/docs/react/introduce) as
an example:

```js
<Form.Item label="My Field" {...myField.validationProps}>
    <Input {...myField.inputProps} />
</Form.Item>
```

Besides `inputProps`, which drives an actual input component, we also use
`validationProps`, which drive the `Form.Item` object. This takes information
such as error status. While `inputProps` is fairly universal across form UI
libraries, `validationProps` is different for each of them.

Out of the box, mstform ships with antd support. This is how you
enable it globally:

```js
import { antd } from "mstform";

setupValidationProps(antd.validationProps);
```

You need to do this once when the application starts.

You can also define a custom validationProps that's suitable for your library.
Here's one for `InlineError` as we defined it above, for instance:

```js
function myValidationProps(accessor) {
    return {
        error: accessor.error
    };
}

setupValidationProps(myValidationProps);
```

Once's that set up you can use `validationProps` with `InlineError`:

```js
<InlineError {...field.validationProps}>
    <input type="text" {...field.inputProps} />
</InlineError>
```

This way if the behavior of InlineError changes to take more props drived from
a field accessor you can easily change the way `validationProps` is generated.
