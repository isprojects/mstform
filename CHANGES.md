# 1.4.0

-   Added 'value' to all the accessors. This is the underlying value that the
    accessor is working on (a MST node for `SubForm` and
    `RepeatingFormIndexAccessor` and a MST array in case of
    `RepeatingFormAccessor`). This allows you hooks (such as `isRequired`) that
    takes the value into account.

-   When you have a field that has an possible empty value (i.e. a MST
    `types.string`, or one that uses `types.maybe` or `types.maybeNull`), and
    you require this field (either statically or dynamically), and you then
    make the raw value empty, the underlying value is set to its empty value as
    well, even though you get a `required` error at the same time.

-   You can mark a custom converter `emptyImpossible`, or supply an
    `emptyValue`. This way mstform can deduce whether a field can be emptied at
    all, and what the empty value is.

# 1.3.0

-   Added `requiredError` behavior to the form state. You can now set an error
    message directly on the state. This will be applied to every field, unless
    you specify `requiredError` on a field itself.

# 1.2.1

-   Fixed a bug where `converterOptions` were too aggressive and applied to
    all string converters -- now they apply to just number converter and
    decimal converter.

-   `converter.maybe`/`converter.maybeNull` was not properly calling
    `preprocessRaw` on the underlying converter, which broke the behavior
    of the new `converterOptions` when it was used.

-   There was a release bug: 1.1.0 and 1.2.0 were a single release, not a
    separate one. The changelog has been updated to reflect this, eliminating
    the existence of any 1.1.0.

# 1.2.0

-   Added `converterOptions` to converters. `converterOptions` consists of
    three options: `decimalSeparator` allows you to specify the character used
    to separate the integer part of a number from the fractional part.
    `thousandSeparator` allows you to specify the character used to group the
    thousands together. `renderThousands` determines whether or not the
    thousand separators are rendered.

-   Fixed a bug where a nested RepeatingForm couldn't be removed anymore.

-   Added `context` to accessors. The validator functions get `context` as a
    second argument. Converters get the context too with convert and render.
    This allows you to implement convertors and validation functions with
    application-dependent behavior; for instance depend on an i18n context.

-   Extended behavior of `requiredError` and `conversionError`. You can now
    configure them with a function too. This function receives a context
    argument as well.

# 1.0.1

-   Updated peerDependency for mobx-state-tree as well.

# 1.0.0

-   Upgrade to mobx-state-tree 3. This drops support for mobx-state-tree 2.

-   Similar to MST 3, renamed `converters.maybe` to `converters.maybeNull`.
    This should be combined with `types.maybeNull`. Introduced a new
    `converters.maybe` which can be paired with `types.maybe` and converters to
    `undefined`.

# 0.26.1

-   Now really retain `required` message when doing a save with
    `ignoreRequired` option.

# 0.26.0

-   Streamlined the internal typing. Should not affect (or improve) the typing
    of the various access functions (`.field()`, `.repeatingForm`, etc)

-   Introduced the groups system. This is a reintroduction of the groups
    concept originally added to 0.12 and removed again in 0.15 as it was
    incompatible with a big refactoring.

    You can now pass a second argument to `Form`, `RepeatingForm` and `SubForm`
    with a group definition. You can access these with `.group` accessor
    that exists on form accessors.

-   When doing a `save`, only additional errors are cleared. Other error
    messages are unaffected. These error messages can exist if you pass
    `ignoreRequired` as a save option, and we don't want to clear them.
    Additional (non-field) errors are still cleared.

# 0.25.1

-   `ignoreGetError` wasn't ignoring non-field errors properly. Fixed now.

# 0.25.0

-   You can now pass options into `save()` as an optional argument to ignore
    certain validation behavior. This way you can allow intermediate saves that
    ignore aspects of validation while retaining full validation before the
    "final" save.

-   Introduced the `ignoreRequired` save option which make save ignore the
    `required` setting. Note that this could result in errors if the underlying
    MST object does not allow you to set null; it only makes sense if you use
    `types.maybe()` on it and `converters.maybe()` for the field.

-   Introduced the `ignoreGetError` save option which makes save ignore any
    external errors introduced by the `getError` hook.

# 0.24.1

-   Fix a bug where `converters.maybe(converters.decimal())` wasn't doing the
    right thing. Now the empty decimal will result in the null value.

# 0.24.0

-   Implement a `update` hook on the state options that is called when a field is
    changed and it passes validation.

# 0.23.0

-   Implement a `blur` hook that is called when the blur event fires for a
    field.

-   `warning` wasn't properly exposed to `FormState`.

-   Some refactorings to help code reuse. As a result the accessor sent
    into `getError` and `getWarning` is the generic `FormAccessor` for
    `SubFormAccessor`, `RepeatingFormIndexedAccessor` and `FormState`.

# 0.22.0

-   Implemented a `resolveMessage()` which takes a messages structure and a
    path and resolves the path to a message using certain rules (see docs).
    This can be used in application code to help implement the `getError` and
    `getWarning` hooks.

-   Rewrite of decimal-converter, added `allowNegative` parameter, handle input
    `"."` as erroneous. It now takes a single options argument that allows you
    to configure it.
    Mind: This breaks the previous API of decimal

# 0.21.0

-   Added a warning and error hook to the `Subform`, `RepeatingForm`,
    and `Form` accessors. These hooks are accessible the same way as
    the warning and error hooks of the field accessors.

-   Removed functionality to add errors to `RepeatingForm` directly; instead
    this can be done via the error hook.

# 0.20.0

-   Added a warning hook in the field accessors, allowing you to define
    a warning that can exist next to the errors. The form state now includes
    an "isWarningFree" method to determine if the form state contains any
    warnings.

-   Added an error hook in the field accessors, allowing you to define
    errors that you can set via an external function.

# 0.19.0

-   Extended converter with "preprocessRaw": a hook to do some processing on
    the raw value before further validation and conversion starts. It's used
    to trim string input.

-   string fields now trim their input of spaces before validation and
    conversion starts. These spaces won't end up in the underlying
    value. This way a field that only contains whitespace will be marked
    as required.

# 0.18.0

-   Previously we tried to set a new repeating form in add mode if there
    was a JSON patch from MST that added an item. Unfortunately this triggers
    too often -- with applySnapshot for instance.

    Instead we only set a new entry into add mode when we use the API on the
    repeating form accessor: `push()` and `insert()`. This is only called by
    form code itself so therefore safe to do.

# 0.17.1

-   When a field is `neverRequired` then we want the 'required' propertGroupy
    to be false, no matter what.

# 0.17.0

-   Added a `neverRequired` option to converters. Make it so that the
    `boolean` converter is never required.

# 0.16.1

-   Actual release with what I intended.

# 0.16.0

-   Internal reorganization that allows us to reuse a bit more code.

-   `isRequired` hook to drive required validation dynamically.

-   Remove antd support. We're maintaining this in a separate code base now
    (hopefully soon to be open source).

# 0.15.1

-   `setRaw` was an `async` function and was trying to set values directly
    after an `await`. This doesn't in strict mode. Now use actions to set the
    value.

# 0.15

-   Performance: Refactored the way accessors are handled. Instead of
    recreating them each time you access a field (or sub-object, repeating
    form), they are now persisted. They are created once and then reused. The
    form state (raw values, errors, etc) is now maintained directly on the
    accessors. This should have a positive effect on performance as mobx will
    be able to keep many more computed values.

-   SubForms weren't discovered when validating the whole form. Now
    properly integrate SubForms.

-   Breaking: remove the Group concept for now; it needs to be rethought
    in the light of the performance oriented refactorings.

# 0.14

-   Support for isReadOnly hook and field accessor `readOnly`. This is sent
    along with `inputProps` only if isReadOnly returns `true` for that
    accessor.

# 0.13

-   Update documentation to eliminate references to `this.state`,
    as this can lead to odd bugs.

-   Also export exportables from `state` module, like FormState.

-   SubForm support. You can get fields for a nested object by using `SubForm`,
    analogous to how you can fields for an array using `RepeatingForm`.

-   Accessors previously had a `node` property. I realized I could remove this
    as we always can reconstruct the node from the path where needed
    within the accessors.

# 0.12.1

-   We claimed we exposed `mstform/antd` but didn't. Instead, export
    `antd.validationProps`. You import `antd` from `mstform` directly.

# 0.12

-   Rearrange the package structure and eliminate Lerna in favor of something
    simpler.

-   Use `mobx.comparer` for deep equal comparison instead of fast-deep-equal
    dependency, which is now dropped.

-   Introduce `isValid` method. When you access a form, field or repeating form
    you can call `isValid` on it to determine whether it doesn't have any
    validation errors. Note that this doesn't trigger revalidation of form
    state that was incorrect from the very start -- for this you need to call
    `validate` (and `save` does this for you).

-   Introduce a Group concept. This allows you to Group fields in a larger
    form together, and track whether everything in the group is valid.

-   Make `validationProps` behavior pluggable with `setupValidationProps`. This
    takes a function that given a FieldAccessor should return an object of
    props. There is a `mstform/antd` module that exposes a `validationProps`
    function compatible with antd's `Form.Item`.

# 0.11

-   Fix a bug with add mode.

-   The onPatch handler can handle all logic safely, so that
    updating arrays directly in the underlying instance also works.

-   Implement a new `focus` hook to automatically fire whenever a user focuses on
    a field.

-   Make `inputProps` do the right thing. You can define a `controlled` function
    that takes the accessor and returns the controlled input props. We supply a
    few ourselves too, and make sensible defaults for various converters. This
    makes `fromEvent` and `getRaw` deprecated.

# 0.10.2

-   Bugfix. Make raw update work with references.

# 0.10.1

-   Bugfix. Safeguard against rendering non-existing fields.

# 0.10

-   Update the raw value when you change the underlying object.

# 0.9

-   Implement change hooks

# 0.8.1

-   Change behavior of derived fields: they are not immediately calculated when
    the form is loaded. Instead they are only calculated when changes are made,
    which is what is intended. This also avoids a warning that we modify data
    during render.

# 0.8.0

-   You can set up derived fields. These fields use a value calculated
    by some MST view, except if the user modifies them by hand. If the view
    changes, this value takes precedence again.
