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
    if you do something wrong. This works even in plain JavaScript if you enable
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
class Input extends Component {
    render() {
        const { type, field } = this.props;
        return <input type={type} {...field.inputProps} />;
    }
}

@observer
class InlineError extends Component {
    render() {
        const { children, field } = this.props;
        return (
            <div>
                {children}
                <span>{field.error}</span>
            </div>
        );
    }
}

@observer
export class MyForm extends Component {
    constructor(props) {
        super(props);
        // we create a form state for this model
        this.formState = form.state(o);
    }

    render() {
        // we get the foo field from the form
        const field = this.formState.field("foo");
        return (
            <InlineError field={field}>
                <Input type="text" field={field} />
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

We define a simple `InlineError` component that can display error text. It
takes a `field` and displays its error (which may be empty). Your UI component
library probably has a nicer component that helps to display errors -- Ant
Design for instance has `Form.Item`.

We also define a simple `Input` component that is our input; it takes a `field`
prop too and uses this to set the required input props (`value` and
`onChange`).

We then define a `MyForm` component that actually displays the form. To display
a form we need to initialize its _form state_. We create the form state with
`form.state` and store it on `this` in the constructor.

The form state maintains form-related state, such as errors to display. It also
can take state specific configuration (for instance how to save the form to a
backend), but in this case we don't supply any.

The form state needs a MST instance; this is the MST instance that you modify
with the form. When the user changes the form and it passes validation, the MST
instance is directly updated.

Here the MST instance is `o` from the global scope. but typically the object to
edit in the form comes in as a prop, and we can access it here.

Then in `render` we retrieve the field accessor for the `foo` field. This has
everything we need: `error` to show the current error, and `inputProps` for the
input component, so we pass the field to `InlineError` and `Input`.

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
            <InlineError field={name}>
                <Input type="text" field={name} />
            </InlineError>
            <InlineError field={size}>
                <Input type="text" field={size} />
            </InlineError>
        </div>
    );
});

return <div>{entries}</div>;
```

## SubForm

Some MST models have a sub-object. When you render the form for such a model,
you want to be able to include fields for this sub-object. The MST model could
look like this:

```js
const Animal = types.model("Animal", {
    name: types.string,
    size: types.string
});

const House = types.model("House", {
    description: types.string,
    pet: Animal
});
```

We want a form that includes information about the pet:

```js
import { SubForm } from "mstform";

const form = new Form(Zoo, {
    description: new Field(converters.string),
    pet: new SubForm({
        name: new Field(converters.string),
        size: new Field(converters.string)
    })
});
```

We can now mix fields from the main form with those from the
sub-form in our `render` method:

```js
const description = state.field("description");
const name = state.subForm("pet").field("name");
```

## Accessors

mstform defines a bunch of accessors:

-   `FieldAccessor`, which you define with `Field` and get with `field()`. This
    represents a field in the form that you can actually fill in and interact
    with.

-   `SubFormAccessor` which you define with `SubForm` and get with `subForm()`.
    This represents a sub-object in the underlying model instance.

-   `RepeatingFormAccessor` which you define with `RepeatingForm` and get with
    `repeatingForm()`. This represents an array of objects in the underlying
    model instance.

-   `RepeatingFormIndexedAccessor` which you define along with
    `RepeatingFormAccessor` using `RepeatingForm`. You access it via the
    `index()` method on a `RepeatingFormAccessor`. This represents a sub-object
    in the underlying array instance.

-   `GroupAccessor`. You define this in a second argument on forms. You can
    access it via the `group()` method on any form accessor. This is a special
    kind of accessor that only implements the `isValid` and `isWarningFree` methods.
    It's a way to aggregate validation results from other accessors.

-   Finally there is the `FormState` itself, which is the accessor at the root of
    all things. You get it with `form.state()`.

Accessors can contain other accessors. In particular, `FormState`,
`SubFormAccessor` and `RepeatingFormIndexedAccessor` allow you to access all
varieties of sub-accessor on it (except for `FormState` itself).
`RepeatingFormAccessor` allows only a single kind of sub-accessor, namely
`RepeatingFormIndexedAccessor`, which you access via `index()`. You cannot
access any sub-accessors on `FieldAccessor`. `GroupAccessor` doesn't allow
you access sub-accessors either.

All these accessors, except for `GroupAccessor` which is truly the odd one out,
have some properties in common:

-   `value`: the underlying MST value that this accessor represents.

-   `path`: The JSON path to the underlying MST value (see mobx-state-tree).

-   `fieldref`: a generalization of the path to a pattern. `foo/3/bar` becomes
    `foo[].bar`.

-   `context`: The context object such as passed into `form.state()`.

-   `isValid`: Is true if the accessor (and all its sub-accessors) is valid.

-   `error`: An error message (or `undefined`). Note that errors on non-field
    accessors can only be set by external means such as with the `getError`
    hook.

-   `warning`: A warning message (or `undefined`). Warning messages can only
    be set using the `getWarning` hook.

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

-   `converters.decimal({maxWholeDigits:x, decimalPlaces:y, allowNegative:z})`.
    You use this with the `decimal` mobx-state-tree type that is also exported
    by this library, like in this model:

    ```js
    const M = types.model({
        d: decimal
    });
    ```

    So the value that the converter delivers is a `Decimal` instance (from
    `decimal.js-light`). It contains a decimal number with a maximum
    `maxWholeDigits` (default 10) before the period and a maximum of
    `decimalPlaces` (default 2) after the period. `decimalPlaces` also controls
    the number of decimals that is initially rendered when opening the form.
    With `allowNegative` (boolean, default true) you can specify if negative
    values are allowed. With `normalizedDecimalPlaces` you can set the amount
    of decimal places the converted number has. It should not be lower than
    `decimalPlaces`, but can be higher. If it is, the given number is
    automatically padded with additional decimal places set to 0.

    Conversion error types are:

    -   `default`: Cannot be parsed, not a decimal number

    -   `tooManyDecimalPlaces`: we entered too many digits after the decimal
        separator.

    -   `tooManyWholeDigits`: we entered too many digits before the decimal
        separator.

    -   `cannotBeNegative`: you entered a negative number where this wasn't
        allowed.

-   `converters.decimalString(maxWholeDigits: x, decimalPlaces: y,
    allowNegative: z})`: like `converters.decimal` but has a `string` as its
    value with a normalized representation of the decimal.

Number and decimal converters also respond to a handful of options through the
use of `converterOptions`. `decimalSeparator` specifies the character used to
separate the integral and fractional part of a number or decimal.
`thousandSeparator` specifies the character used to group thousands together.
`renderThousands` determines whether or not the thousand separators should be
rendered.
`maxZeroesPadding` can be set to limit the number of trailing zeros. This to
display a flexible minimum amount of decimals. Show more if we have more. Added
this new property for a customer that is wishing to display prices in at least 2
and at most 10 decimals. But, if, for instance, a price does not have more than
3 decimals, we do not want to show all trailing zeros

### Boolean

`converters.boolean`: raw value is a boolean, value is also a boolean. The
default raw value in add forms is `false`.

### Arrays

`converters.stringArray`: raw value is an array of strings. value is an
observable array of strings. Note that this is for using arrays that are
treated a value -- a list of which checkboxes are selected, for instance. When
you want the user to be able to add items to the array, using `RepeatingForm`
instead.

### Text Arrays

`converters.textStringArray`: raw value is a string with newlines. Value is an
array of strings split by newline. You can use this with a textarea to edit an
array of strings by newline.

### Models

`converters.model(Model)`: does not do any conversion (model instance goes in,
model instance comes out), but allows you to specify that a MST model comes in
as a raw value and is the value. Typescript will be happy. This can be used to
support an input component such as a drop-down selection that generate a
reference to an object. This fits MST's `types.reference`.

### Maybe and MaybeNull

`converters.maybe(converter)`: This works on string converters as well as model
converters.

When you wrap it around any converter that takes a raw string value, the empty
value (such as the empty string) is accepted and converted into `undefined`.
This allows you to model empty values.

It can also be wrapped around a `model` converter, in which case it now accepts
empty. This is handy when you have a `types.maybe(types.reference())` in MST.

`converters.maybeNull(converter)` is like `converters.maybe` but is designed to
work with `types.maybeNull`, so the empty value is `null`.

### Dynamic

`converters.dynamic(converter, getOptions)`. This works on any converter that
expects a parameter object for its configuration. Currently this is only
`converters.decimal`.

This is a way to make the parameters for a converter dynamic and get
decided at run-time, based on the `context` you pass into `state()`
as well as the field accessor -- these get passed into the `getOptions`
function as arguments. So:

```js
const form = new Form(Foo, {
    value: new Field(
        converters.dynamic(converters.decimal, (context, accessor) => {
            return { allowNegative: context.weWantNegatives };
        })
    )
});
```

allows negative values for this decimal dynamically if
`context.weWantNegatives` is set to `true`.

`converters.maybe` and `converters.maybeNull` wrap around `converters.dynamic`,
so it's `converters.maybe(converters.dynamic(converters.decimal, getOptions))`.

### Object

`converters.object`: this accept any object as raw value and returns it,
including `null`. Prefer `converters.model` if you can. Warning: the default
raw value is `null` and using this with basic data types (string, boolean,
number and such) won't make the type checker happy as they don't accept "null".
Use more specific converters instead.

### Converter options

Converters can be passed various options. Number and decimal converters respond
to `decimalSeparator`, `thousandSeparator` and `renderThousands`. These can be
set in a `converterOptions` argument on the state:

```js
const formState = form.state(o, {
    converterOptions: {
        decimalSeparator: ".",
        thousandSeparator: ",",
        renderThousands: false
    }
});
```

### Controlling the conversion error message

A converter may fail to convert a raw value. In this case, the UI displays a
conversion error. You can control this conversion error with the
`conversionError` property for a field.

```js
const form = new Form(M, {
    nr: new Field(converters.number, {
        conversionError: "This conversion failed"
    })
});
```

You can also make `conversionError` a function. It takes a `context`
as its first argument. Context is an arbitrary object you can pass into the `state` method from your application:

```js
const form = new Form(M, {
    nr: new Field(converters.number, {
        conversionError: context =>
            context.language === "en"
                ? "This conversion failed"
                : "De conversie faalde"
    })
});
```

Some converters can return multiple types of conversion error. If
you care about showing these differences in the UI, you can set up
an object for `conversionError`:

```js
conversionError: {
    default: "Not a number",
    tooManyDecimalPlaces: "Too many decimal places",
    tooManyWholeDigits: "Too many whole digits",
    cannotBeNegative: "Cannot be negative"
}
```

This object must always contain a `default` key, which contains the fallback
conversion error if no error type matched.

It's also possible to use a function to dynamically generate the messages,
like this:

```js
conversionError: {
    default: context => "Not a number",
    tooManyDecimalPlaces: context => "Too many decimal places",
    tooManyWholeDigits: context => "Too many whole digits",
    cannotBeNegative: context => "Cannot be negative"
}
```

### Defining a new converter

You can define a new converter. For instance this is a converter which
takes a text in the UI and considers `"t"` as `true` and the rest as
`false`:

```ts
const boolean = new Converter<string, boolean>({
    emptyRaw: "f",
    emptyImpossible: true,
    convert(raw) {
        return raw === "t";
    },
    render(value) {
        return value ? "t" : "f";
    }
});
```

Converter is a generic type, with `<R, V>`. `R` is the type of the raw value
(as you have to render in a React component), and `V` is the type of the
converted value (as you have in the MST model).

A converter needs to define a `convert` and a `render` method. `convert` takes
a raw value and converts it to the MST value. `render` takes the MST value and
converts it to the raw value. You can trigger a conversion error by throwing
`ConversionError` inside `convert`; it takes the conversion error type as its
first argument.

`emptyRaw` is the raw value that should be shown if the field is empty in the
UI. We also set `emptyImpossible` -- it's impossible for the result of this
conversion to be empty (it's either `true` or `false`). In other cases,
an empty value can exist: for instance a converter to a string could produce
the empty string, or a maybe converter can produce `undefined`. In this
case you need to set the `emptyValue` property to what the value is when
it's not filled in. It's not allowed to set `emptyValue` when you
also define `emptyImpossible` to be `true`.

You can optionally set `defaultControlled`, the controlled props to be used by
default for this converter. You can also optionally set `neverRequired`; this
is handy for fields where the `required` status makes no sense -- a checkbox is
an example.

`convert` and `render` take an optional second argument, `options`. With
`options`, you can pass `converterOptions` and a `context`. `context` is an
arbitrary value you can pass in as a `form.state()` option from your
application:

```js
const formState = form.state(o, { context: { something: "FOO" } });
```

This is useful when you want to make a converter that depends on
an application-specific context.

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

In case you already have a default value for a field and you do not want it to
be in add-mode, you can exclude them by including its fieldref in the
`addModeDefaults` option:

```js
const state = form.state(node, { addMode: true, addModeDefaults: ["nr"] });
```

Now the `nr` field is shown with the value `0` in it immediately.

If the field you reference from `addModeDefaults` is configured to be derived,
this is used to calculate the derived value automatically.

### Add mode for repeating forms

Consider a repeating sub-form. Adding a new entry to a sub-form is much like
having an add form. Each time you add a new entry, the new sub-form should be
in add mode, even in edit forms. mstform automatically takes care of this if
you use the `.push` and `.insert` methods on the repeating form accessor, or if
you manipulate the underlying model directly. Existing records are shown in
edit mode, unless the whole form is in add mode.

If you use `.push` and `.insert` on the repeating form accessor, you can pass
in an additional argument with the `addModeDefaults` array. Here is an example:

```js
repeating.push({ a: 3, b: 5 }, ["b"]);
```

Here `a` is not mentioned and is considered to be in add-mode; instead of its
value, the empty raw is shown instead. But `b` is referenced and therefore `5`
is visible immediately in the form.

## Backend interaction (save and processing)

When we create the form state, we can pass it options on how to interact with
the backend. There are two features:

-   You can save the form by specifying a save function. This save function can
    return error messages in case the backend could not save successfully.

-   You can configure the form to be validated and updated dynamically by the
    backend using a `process` function. This can show messages and update the
    form while the user is typing, under the control of a backend. This is
    useful because validation needs to be defined on the backend anyway in
    order to prevent any incorrect data to be submitted. This way you can
    integrate this same validation code with the frontend. You can also supply
    a `processAll` function which runs all validations supported by the
    backend.

### Save

You can write a function that defines how to save the underlying MST instance
(node), for instance by sending JSON to a backend:

```js
async function save(node) {
    // we have defined a real 'save' function on the model that knows how
    // to save the form to the backend. Should return a ProcessResult if
    // there is a problem, or null or undefined if there is no problem.
    return node.save();
}
```

Here is how we configure it:

```js
this.formState = form.state(o, {
    backend: { save }
});
```

The save function should return `undefined` or `null` if the save succeeded and
there are no server validation errors. It can also return a special process
result - we discuss this below.

When you implement a form submit button, you should call `state.save()`:

```js
@observer
export class MyForm extends Component {
    constructor(props) {
        super(props);
        // we create a form state for this model
        this.formState = form.state(o, {
            backend: { save }
        });
    }

    handleSave = async () => {
        const success = await this.formState.save();
        if (success) {
            // success
        } else {
            // failure
        }
    };

    render() {
        // we get the foo field from the form
        const field = this.formState.field("foo");
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

-   Makes sure the form is completely valid before it's submitted to the
    server. If not, the save is canceled and validation errors are displayed.

-   Uses your supplied `save` function do to the actual saving.

-   Processes the process result returned by the server.

-   Returns `true` if saving succeeded, and `false` if not due to validation
    errors or server processing problems.

If you don't specify your own `save` you get an exception when you call
`state.save()`.

### Backend form processing during user interaction

Sometimes the backend knows more than the frontend, and you want to implement
some form behavior on the backend. Besides the low-level hooks (such as
`getError`) where you can integrate external behavior by hand, you can also
configure this behavior at a higher level.

If you implement the form processing protocol on your backend, your backend can
control validation messages (error and warning) messages, as well as control
default values for fields and clear them if they become invalid.

Here is how we configure it (in addition to `save`):

```js
async function process(node, path, liveOnly) {
    // we have defined a real 'process' function on the model that knows how
    // to invoke process on the backend. returns ProcessResult
    return node.process();
}

this.formState = form.state(o, {
    backend: { save, process }
});
```

The `node` argument is the underlying node that the form represents. `path` is
a JSON pointer (aka MST node path) to the field that was just changed by the
user modifying the form. `liveOnly` is a boolean value and is set to `true`
before you `invoked` save. This can be used to distinguish between "live
validations" (which always run) from those that only start running after you
attempt a save for the first time. The function should return a `ProcessResult`
structure.

The system keeps track of which field paths have been changed by the user. It
also makes sure that user input is debounced, so that a change in the form only
gets sent to the backend after the user stops changing the field for a field,
or when a set time has passed.

Once a field path has been changed, the node is sent to an asynchronous
"process" function, along with the field path that changed. You should
implement this function to define backend processing. It should send back a
structure with error messages, warning messages, and field updates.

The backend processing system ensures that the process function only runs one
at the time, and in sequence (in the order in which they were triggered). This
way, the consistency of updates is ensured.

The system also keeps track of fields that have changed but have not
yet been processed by the backend. In this case any updates from the backends
are ignored - new user input takes precedence.

### processAll

The `process` function takes the path of the field that has been changed.
`save` supports reprocessing of the whole form on the backend during saving. It
can in some circumstances be useful to explicitly trigger such a reprocess by
itself: run the backend process for the entire form at once. For this we have
`processAll`.

Here is how we configure it (in addition to `save` and `process`):

```js
async function processAll(node, liveOnly) {
    // we have defined a real 'processAll' function on the model that knows how
    // to invoke processAll on the backend. returns ProcessResult
    return node.processAll();
}

this.formState = form.state(o, {
    backend: { save, process, processAll }
});
```

You can invoke `processAll` on the form state to trigger it:

```js
formState.processAll();
```

### ProcessResult protocol

`process`, `processAll` and `saveAll` all return a ProcessResult.

Here is an example `ProcessResult`:

```js
const result = {
    updates: [{ path: "/a", value: "Alpha" }],
    accessUpdates: [{path: '/c', disabled: true }]
    errorValidations: [
        { id: "one", messages: [{ path: "/b", message: "This is wrong" }] }
    ],
    warningValidations: []
};
```

`updates` is a list of fields to update. Each field is indicated by `path`. The
rest of the structure is up to the developer and defines the update
information. By default, you need to supply a `value` with the new value to put
in the form there, but you can implement by your custom update procedure based
on other information if you pass an `applyUpdate` function (to be described
later).

`accessUpdates` is a list of fields to update as well. Each field is indicated
by `path`. The rest of the structure updates whether a field is `disabled`,
`readOnly`, `hidden` and `required`. Not passing a particular boolean results in
no change for that field. You can also use paths for accessors that aren't
fields, such as a repeating form, in which case for `disabled`, `readOnly` and
`hidden` the information is inherited by all fields in it. Setting `required`
only has meaning on the field accessor itself and is not inherited.

Both `errorValidations` and `warningValidations` are lists of validation
structures. These validation structures each have an `id` -- if a new
validation structure comes in, the previous validation structure with that id
(if it exists) is removed. A validation structure contains a list of validation
messages, each have a `path`. The `path` may be a path to a non-field such as a
sub-form, or repeating form as well, in case the validation error applies to
this.

The idea is that the backend associates validation functions with one or more
patterns of field paths (such as using the fieldref mechanism). Each validation
function has a unique id and can generate messages for arbitrary field paths in
the form. When a process request comes in, the backend only has to re-run
validation functions that match the path that just changed. Other fields that
are not affected do not have their messages affected - the frontend holds on to
these validation messages.

Warnings are like errors, but appear on field accessors with the `warning`
property. They do not make the form invalid - saving is still possible.

### Configuring backend processing

Here is how we hook our `process` function into the backend.

```js
const M = types.model("M", {
    foo: types.string
});

const o = M.create({ foo: "FOO" });

async function myProcess(node, path) {
    // call the backend, turn into ProcessResult and return it
}

form.state(o, { backend: { process: myProcess } });
```

This causes `myProcess` to be called whenever a field changes in the form
(debounced). You can control the debounce delay by passing `delay` (default
`500`):

```js
form.state(o, { backend: { process: myProcess, delay: 300 } });
```

As mentioned before you can also configure the `applyUpdate` function with
a custom one:

```js
import { applyPatch } from "mobx-state-tree";

function myApplyUpdate(node, update) {
    // same behavior as the default
    applyPatch(node, [
        { op: "replace", path: update.path, value: update.value }
    ]);
}

form.state(o, { backend: { process: myProcess, applyUpdate: myApplyUpdate } });
```

### Save errors

Before we described how to dynamically update validation information during
user interaction. We can also send back validation information when the user
saves the form. If the save failed to pass backend validation, we can also also
send back a `ProcessResult` instead of `undefined` or `null` (which both mean
success). This `ProcessResult` may be partial - if you don't include a
property, it is assumed to be the empty list.

### Low level getError hook

If you retrieve your errors in another way than using the process function, you
can use the `getError` hook:

```js
this.formState = form.state(o, {
    getError: accessor => (accessor.path === "/name" ? "Is wrong" : undefined)
});
```

The `error` property of the field will contain the "Is wrong" error message if
the field does not return `undefined` with the `getError` function. If a field
contains both an internally generated error message and one that is generated
via `getError`, the internally generated message trumps the one returned by the
`getError` hook.

Other accessors in mstform - `SubForm`, `RepeatingForm` and `Form` - also use
this error hook, allowing you to set errors on the complete form - or any
accessor within it. Indexed entries within repeating forms can also be set with
an error. If, for example, we want to raise an error when a `RepeatingForm` is
empty, we can raise an error on the repeating form accessor like this

```js
this.formState = form.state(o, {
    getError: accessor =>
        accessor instanceof RepeatingFormAccessor && accessor.length === 0
            ? "The repeating form must contain at least one form"
            : undefined
});
```

### Low level getWarning hook

mstform has a hook which allows you to include `warning` messages in its
accessors. Warnings are similar to errors, but don't make the form invalid. The
idea is that you can show warnings for certain fields in your form as a
notification to the user.

```js
const state = form.state(o, {
    getWarning: accessor =>
        accessor.raw < 0 ? "This value is negative" : undefined
});
```

To implement warnings, pass a `getWarning` function. It is up to you to decide
how and when you wish to show these warnings in the UI. To check if the form
contains any warnings, you can use

```js
state.isWarningFree; // true or false
```

### Ignoring the required validation

You can pass an option into `save()` to ignore the required validation. This
can be useful if you have fields which are required in the form yet want allow
intermediate saves where this required setting is ignored.

Here's how to ignore the `required` validation:

```js
this.formState.save({ ignoreRequired: true });
```

This lets `save` proceed even if fields marked as required are not filled
in. It's up to you to construct the underlying MST model to allow empty values
(typically with `types.maybe()`) and to let the form accept them too (typically
with `converters.maybe()`).

### Ignoring the `getError` hook

You can also ignore the `getError` validation during save:

```js
this.formState.save({ ignoreGetError: true });
```

This lets `save` proceed even though there are still external validation
errors. `save` still is blocked when you have an internal validation error -- a
raw value that cannot be successfully converted.

If you only define a `save` function for your backend and no `process` function
`ignoreGetError` is enabled automatically. This is to allow you to still save
forms even though they have externally defined errors.

### Ignoring the `saveStatus`.

You can cause `save` to not affect the save status when you save::

```js
this.formState.save({ ignoreSaveStatus: true });
```

This causes the save status to remain `before`. Normally the save status is
updated to `after` when you save, which can affect the display of validation
messages and the state of the `liveOnly` flag that is passed to backend
`process` and `processAll`.

### Controlling validation messages

By default, mstform displays inline validation errors as soon as you
make a mistake. This may not be desirable. You can turn it off by
passing another option:

```js
this.formState = form.state(o, {
    validation: {
        beforeSave: "no"
    }
});
```

Now inline validation only occurs after you save the first time, not before.

It's also possible to turn off inline validation altogether:

```js
this.formState = form.state(o, {
    validation: {
        beforeSave: "no",
        afterSave: "no"
    }
});
```

In this case the user only sees updated validation errors once they press the
button that triggers `state.save()` and no errors are generated when the user
is filling in the form.

If you use `ignoreSaveStatus` the save status is not affect and remains
`before`.

You can reset the save status back to `before` with `state.resetSaveStatus()`.

You can remove all internal and external errors and warnings by calling
`state.clearAllValidations()`.

## required fields

You can control which fields are required by setting the `required` flag in the
field definition:

```js
const form = new Form(M, {
    name: new Field(converters.string, { required: true })
});
```

This causes `required` property of the field accessor to be `true`, which you
can use during form rendering. It also causes it to be a validation error if
the field isn't filled in.

When the user enters an empty value (for instance the empty string), mstform
empties the underlying value if possible, changing the underlying object. This
is possible for the form defined above, as it uses a string converter (which can
be empty). A number converter cannot be empty however:

```js
const form = new Form(M, {
    nr: new Field(converters.number)
});
```

In this case, the user _has_ to fill in a raw value that can be converted to a
number, otherwise the user gets the required error message and the underlying
value is not updated. Note that the `required` configuration in this case is
optional as it's implied by `converters.number`.

You can control the required error message by setting `requiredError`:

```js
const form = new Form(M, {
    name: new Field(converters.string, {
        required: true,
        requiredError: "This is required!"
    })
});
```

You can also set `requiredError` to a function, in which cases it receives a
`context` argument (which you can pass in as an option to `state()`).

```js
const form = new Form(M, {
    name: new Field(converters.string, {
        required: true,
        requiredError: context =>
            context.language === "en"
                ? "This is required!"
                : "Dit is verplicht!"
    })
});
```

`requiredError` (as a message or a function) can also be set on the state,
where it will be applied to every field on the form unless you override the
required error message on the field:

```js
this.formState = form.state(o, {
    requiredError: "This is required!"
});
```

## Empty and required fields

All fields have the `isEmpty` and `isEmptyAndRequired` properties.
`isEmpty` checks whether the `raw` value of the field equals the `emptyRaw`
value of the converter and if so it is considered empty. If the converter option
`emptyImpossible` is true `isEmpty` will always return `false`.

`isEmptyAndRequired` additionally checks whether the `required` property is true
for this field.

## Dynamic disabled, hidden, required and readOnly fields

mstform has hooks that let you calculate `hidden`, `disabled`, `required` and
`readOnly` state based on the accessor. Here is a small example that
makes the `foo` form or field disabled. This uses the JSON Path functionality of
mstform to determine whether a field is disabled, but any operation can be
implemented here. You could for instance retrieve information about which
fields are disabled dynamically from the backend before you display the form.
The `fieldref` functionality described below is very useful for this.

```js
const state = form.state(o, {
    isDisabled: accessor => accessor.path === "/foo"
});
```

To implement hidden behavior, pass in an `isHidden` function.

To implement readOnly behavior, pass in an `isReadOnly` function.

To implement required behavior, pass in an `isRequired` function. This does not
only affect the `required` property on the accessor, but also makes the field
require the form or field just as if you used the `required` flag in the field
definition. The `required` flag in the definition always makes something
required, no matter what `isRequired` says.

`isDisabled` returning `true` makes the `disabled` prop `true` in
`accessor.inputProps`. If `isReadOnly` is true, the `readOnly` flag is added to
`accessor.inputProps`; otherwise it's absent, but it's up to you to ensure your
React input widgets support a `readOnly` prop (HTML input does). There is no
such behavior for `hidden` or `required`; use `accessor.hidden` and
`accessor.required` in your rendering code to determine whether a form or field
wants to be hidden, or a field wants to be required. There is also an
`inputAllowed` flag on accessors, which checks if a form or field isn't disabled,
hidden or read-only.

When these properties are set on forms, they will automatically be passed down
to the children of said form. This works for regular forms, repeating forms and
subforms, and every kind of property except required.

## Fieldref

Accessors that have a `path` property also define a `fieldref` property. The
fieldref is a generalized form of the path that is convenient for matching.

The path `/foo` results in the fieldref `foo`. The path `/foo/bar` results in
the fieldref `foo.bar`. The path `/foo/1/bar` results in the fieldref
`foo[].bar`, and so does `/foo/2/bar` or any other index. The path `/foo/1` by
itself (for `.repeating.index()`) results in the fieldref `foo[]`.

To create an `isDisabled` hook that makes the `bar` field disabled
in a repeating form, you can write:

```js
const state = form.state(o, {
    isDisabled: accessor => accessor.fieldref === "foo[].bar"
});
```

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

## Validation groups

It can be useful to consider the validation status of a whole set of related
fields, without considering the validation status of the whole form. In a UI
you can then indicate that part of the form is invalid, which is especially
useful if the form is not visible in its entirety, for instance if is spread
out across tabs or a menu.

You can define validation groups with a second parameter you pass into `Form`,
`SubForm` or `RepeatingForm`:

```js
const M = types.model("M", {
    a: types.string,
    b: types.string,
    c: types.string
});

const form = new Form(
    M,
    {
        a: new Field(converters.string),
        b: new Field(converters.string),
        c: new Field(converters.string)
    },
    {
        one: new Group({ include: ["a", "b"] }),
        two: new Group({ include: ["c"] })
    }
);
```

Here we define two groups, `one` and `two`. Group `one` is valid only if `a`
and `b` are valid. Group `two` is valid only if `c` is valid.

You can access a group on the state or form accessor and check its `isValid`
or `isWarningFree` property:

```js
const first = state.group("first");
if (first.isValid) {
    // only executed if a and b are valid
}
if (first.isWarningFree) {
    // only executed if none of the group members have warnings
}
```

When you define a group you can pass `exclude` instead of `include`:

```js
const form = new Form(
    M,
    {
        a: new Field(converters.string),
        b: new Field(converters.string),
        c: new Field(converters.string)
    },
    {
        one: new Group({ exclude: ["c"] })
    }
);
```

Group `one` now includes all accessors except `c`, and therefore `a` and `b` as
well.

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

## Focus and blur hooks

You may want to react to field focus or blur events. You can do this with a
custom onFocus or onBlur event handler on the input element, but in some cases
you want to react generically to _all_ focus/blur events in a form. You can
pass a special hooks to the form state options for this:

```js
const state = form.state(o, {
    focus: (ev, accessor) => {},
    blur: (ev, accessor) => {}
});
```

The hook receives the event and the focused field accessor. You can use the
accessor to get the field name (`accessor.name`), value (`accessor.value`),
etc. When you define the hook, `inputProps` on the field accessor contains an
`onFocus`/`onBlur` handler, so if you use that with the field it is there
automatically.

In addition, you can set a field to re-render itself when you blur out of it,
using the `postprocess` option on fields. An example use case is rendering
extra zeroes in decimal fields, like so:

```js
const form = new Form(M, {
    foo: new Field(converters.decimal({ decimalPlaces: 2, addZeroes: true }), {
        postprocess: true
    })
});
```

## Update hook

When you want to react to changes to any field value in the form, you can
implement the update hook. This hook is triggered only when a change happens to
the _value_, not when the _raw_ is updated, so only when the underlying
instance that the form represents is updated. This means that if there are any
client-side validation messages, the update hook isn't yet triggered.

```js
const state = form.state(o, {
    update: accessor => {}
});
```

## Sources for references

When you use a reference field in a form (using the `object` or `model`
converter), you often display it with either a drop-down box or an autocomplete
widget. mstform offers support for populating these widgets, keeping track of
values that have appeared before and caching results.

In order to have a source your application needs to define what MST model
populates these sources and a container for them. Let's imagine we want to
allow the user to select a user object.

```js
const User = types.model("User", {
    id: types.identifier,
    username: types.string
});

const UserContainer = types.model("UserContainer", {
    entryMap: types.map(User)
});
```

We use `types.map` so we can keep track of `User` by their identifier so we can
quickly retrieve them again. You need to attach the `UserContainer` somewhere
to your state tree so that you can make references to users from other parts in
your state tree. Let's assume here it's in `root.userContainer`.

We have some way to load an array of users from the backend:

```js
async function loadUsers(q) {
   const response = await window.fetch(...);
   return response.json();
}
```

This queries the server based on some source-specific search parameters `q`
and returns an array of serialized `User` items, so:

```js
[
    {
        id: "a",
        username: "Alpha"
    },
    {
        id: "b",
        username: "Beta"
    }
];
```

It's up to the implementer to wrap `loadUsers` into a debounce facility so
that not every `loadUsers` call results in a server hit.

We can now define a source for users using a `UserContainer` instance and a
way to load users::

```js
import { Source } from "mstform";

const userSource = new Source({
    entryMap: root.userContainer.entryMap,
    load: loadUsers
});
```

Note that you can also make `entryMap` a function that returns the
`entryMap`:

```js
import { Source } from "mstform";

const userSource = new Source({
    entryMap: () => root.userContainer.entryMap,
    load: loadUsers
});
```

We define a model which contains a reference to a user:

```js
const M = types.model("M", {
    user: types.maybe(types.reference(User))
});
```

And a form for it:

```js
const form = new Form(M, {
    user: new Field(converters.maybe(converters.model(User)), {
        references: {
            source: userSource
        }
    })
});
```

Let's now look at the `user` accessor. When the React component is mounted in
case of a select box, or in an event handler when we change the content of
autocomplete, we must load the references:

```js
const state = this.formState;
const user = state.field("user");

await user.references.load({{}});
```

`references.load()` contains an query argument -- these are additional
search parameters to pass through `loadUser`, such as what the user typed in
an autocomplete field.

Once references are loaded, we can access them in the UI (inside a React
`render` method):

```js
const state = this.formState;
const user = state.field("user");

const values = user.references.values({});
// display values somewhere
```

The source caches search requests, so that any future `references.load()` with
the same query resolve immediately without even hitting the backend. For this
reason, the search query accepted by `load` must be either JSON serializable or
alternatively you can provide a `keyForQuery` function to `Source` which turns
the search parameters into a unique cache key.

You can also make a field depend on another. Let's imagine that we have
a way to look for users that are friends of a user:

```js
async function loadFriends({user}) {
   const response = await window.fetch(...);
   return response.json();
}
```

Now we have a form with a user and a friend:

```js
const M = types.model("M", {
    user: types.maybe(types.reference(User)),
    friend: types.maybe(types.reference(User))
});

const friendSource = new Source({
    container: root.userContainer,
    load: loadFriends
});

const form = new Form(M, {
    user: new Field(converters.maybe(converters.model(User)), {
        references: {
            source: userSource
        }
    }),
    friend: new Field(converters.maybe(converters.model(User)), {
        references: {
            source: friendSource,
            dependentQuery: accessor => {
                return { user: accessor.node.user };
            }
        }
    })
});
```

The `dependentQuery` bit here makes sure that when you load references for
`friend` the `user` is included automatically in this case the `user`
field.

Select widgets may need to refresh their list of options based on the values in
other fields. If you want to enable this you can call `autoLoadReaction()` on
`references`. If you don't call it (the default) then you are responsible for
this yourself. This is useful for autocomplete widgets which only reload when
the user interacts with them.

You can configure sources to use a defaultQuery if invoked without
arguments.

You can call `load` and `values` on sources directly too. If you don't
pass the query argument, it defaults to `{}` like for references.

You can call `clear()` on the source to remove _everything_ in it -- you should
only do this if you have nothing pointing to entries in its underlying
`entryMap`, or if all references are mobx-state-tree `safeReference`.

Note: mstform does not yet not implement any cache eviction facilities, either
from the container or from the search results.

## Tips

-   Don't name your form state `this.state` on a React component as this has a
    special meaning to React and can lead to odd bugs.
