# 0.15

-   Performance: Refactored the way accessors are handled. Instead of
    recreating them each time you access a field (or sub-object, repeating
    form), they are now persisted. They are created once and then reused. The
    form state (raw values, errors, etc) is now maintained directly on the
    accessors. This should have a positive effect on performance as mobx will
    be able to keep many more computed values.

-   SubForms weren't discovered when validating the whole form. Now
    properly integrate SubForms.

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
