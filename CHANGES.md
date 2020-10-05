# 1.27.0

-   Add a `maxZeroesPadding` option to the `decimal` renderer.
    `maxZeroesPadding` can be set to limit the number of trailing zeros. This to
    display a flexible minimum amount of decimals. Show more if we have more.

# 1.26.0

-   Upgraded Typescript to version `4.0.3` and upgrade various testing
    dependencies as well.

-   Reworked types so that individual accessors are now aware of the type of
    the `value` prop.

-   The typing changes requires various interfaces such as
    `IRepeatingFormAccessor` to take a third generic type, the model type.

-   The typing changes also requires you to actually `.create()` model instances
    you pass to methods on repeating form accessor like `push`, instead of
    pushing in the JSON directly, otherwise you get a type error about missing
    views and such.

-   Export a few convenience types: `IAnySubFormAccessor`,
    `IAnyRepeatingFormAccessor`, `IAnyRepeatingFormIndexedAccessor`.

# 1.25.0

-   You can pass the optional parameter `liveOnly` to the `processAll` function
    to manually trigger all validations, or just the live ones.

-   Upgraded typescript to version `3.9.5`.

-   When calling load on the same `source` at the same time with the same
    parameters we now reuse the same promise to prevent duplicate requests.

# 1.24.3

-   We now also render subforms, repeatingforms, and indexed repeatingforms
    as invalid if the accessor itself has feedback.

# 1.24.2

-   We now also take the `formAccessor` into account when clearing
    errors and warnings instead of only the `flatAccessors`.

# 1.24.1

-   We now dispose the `autoLoadReaction` for references when a node is
    removed. This is needed to prevent the `autoLoadReaction` from being
    triggered while the node is no longer present.

# 1.24.0

-   We now have a peer dependency on `decimal.js-light` which defines a `Decimal`
    object. We support this with a MST type and a converter (read on).

-   We introduced a new `decimal` mobx-state-tree type you can import and use
    within a MST model:

    ```js
    const M = types.model({
        d: decimal
    });
    ```

    Its JSON representation is a string, but the property will be a `Decimal`
    instance.

*   BREAKING CHANGE: the `converters.decimal` converter used to have a string
    as both its value and its raw. It's been changed to have the `Decimal`
    object as a value and can thus be used with the `decimal` type. To get the
    old behavior you need to use `converters.stringDecimal`, so you can convert
    your decimal converters to this to keep your code working until you change
    it to use the new `decimal` mobx-state-tree type we introduce.

# 1.23.0

-   BREAKING CHANGE: Change the way sources work: `load` now takes the query as
    the first argument, and the timestamp as the second argument. If you leave
    out the timestamp, it generates the current timestamp. If you leave out the
    query it falls back on an empty `{}`.

    For `values` you can also leave out the first argument.

    This makes the behavior of source more consistent with that of references.

-   BREAKING CHANGE: instead of passing `container` to the source (which then
    should have an `entryMap` property), you pass through `types.map` property
    directly. `entryMapName` is not needed anymore so has been removed. Sources
    now know about their types better -- unfortunately `references` on field
    accessor still lose this information but this may be a future improvement.

# 1.22.0

-   The string converter can now take the option `maxLength`, which validates
    your string on if it contains too many characters.

-   All converters can now be called as either an instance with options as
    arguments, or as a factory.

# 1.21.0

-   Update a few dependencies.

# 1.20.0

-   Expose a `clear` method on a source. This can be used to clear it,
    including the MST container it points to and all references. This should
    only be used if all references to items in its container are MST
    `safeReference`.

# 1.19.0

-   Specifying a `container` argument for a `Source` can also be a function.
    This is convenient to avoid import-time side-effects, which sometimes can
    result in difficult import initialization issues.

-   Define an ISource interface so that it's possible to define custom
    source implementations that work with the reference system.

# 1.18.0

-   Compatibility with the latest version of mobx-state-tree and mobx.

# 1.17.0

-   Add a source and reference system to mstform. This allows you to build
    widgets that use this information in order to populate a select box or make
    autocomplete work. References can also be dependent on the state of other
    fields in the form.

# 1.16.0

-   BREAKING CHANGE: Required errors now disappear after saving with
    `ignoreRequired` turned on.

-   Bugfix: The form accessor was missing from the flat accessors that track
    the error and warning messages. This is now fixed

# 1.15.2

-   Backend process would crash if it had a missing `accessUpdates`. Now it
    should not do so anymore.

# 1.15.1

-   Expose `state` on `IAccessor`.

# 1.15.0

-   The way external `process`, `processAll` and `save` errors generated by a
    backend are stored has changed. Previously this reused the `getError` hook,
    but this leads to problems if paths change, which can happen if a repeating
    form item is inserted or deleted. Instead now we store this information as
    soon as it comes in directly on the accessor.

-   Repeating forms never worked quite well for access
    (readOnly/disabled/hidden/required) as the system relied on paths. By
    passing this information in backend processing, we can start to track this
    in the accessors themselves, which is more resilient. It also allows the
    backend to control which fields are accessible in response to changes in
    the form. You can control access by passing `accessUpdates` with the
    backend `process`.

-   Major internal refactoring making the accessors more consistent and reuse
    more code.

-   BREAKING CHANGE: if you define an error with `getError` and an external
    error is also set, that external error now takes precedence.

-   Introduce a new explicit `IAccessor` interface that is shared by all
    accessors. Also introduce `IFormAccessor`, which is shared by FormState,
    RepeatingFormIndexedAccessor, and SubFormAccessor.

-   BREAKING CHANGE: Drop the old Accessor union type in favor of `IAccessor`.

-   Add an `isWarningFree` value to GroupAccessors.

-   Add a `clearAllValidation` method to formState. We can use it to manually clear
    all internal and external error and warning messages.

# 1.14.0

-   The `process` and `processAll` functions for the backend now receive a third
    parameter, `liveOnly`. `liveOnly` is `true` before you save for the first
    time, and after that it's `false`. This allows you to create backend
    validation code that only runs after the first save.

-   New method `resetSaveStatus` which resets the save status to `before`.

-   There is a new validation option `ignoreSaveStatus` which you can pass to
    the `save` method of the form state. This allows a save without updating the
    save status (leaving it on `before`).

-   Fix development setup so we don't use `fstream` anymore - this was only
    used by development dependencies (`semantic-release`), not directly in
    mstform, so we do not believe mstform is affected by the fstream
    vulnerability. Removed `semantic-release` as we weren't using it anyway.

# 1.13.0

-   When you `push` or `insert` a new repeating form item you can now pass a
    third argument which is a list of fieldrefs. Each fieldref indicates a field
    where you want this field to start outside of add-mode; that field has its
    raw reflecting that of the value, unlike other fields in add-mode.

    You can give a `addModeDefaults` option when you call `state()`, which can be
    used to exclude certain items from add-mode in the entire form.

    If you use `addModeDefaults` with a field that is derived, the derived
    value is calculated right away.

-   Fix: too many accessors were initialized. This was generally not a problem
    except that if you derived a field from another it would be called
    excessively often.

-   Add a `normalizedDecimalPlaces` option to the `decimal` converter. This
    ensures that the converted decimal has a fixed number of decimal places.
    This is useful if your backend delivers a fixed amount of decimal places
    and you want to display less of them (with `decimalPlaces`) than you store.

# 1.12.1

-   `processAll` did not clear errors and warnings when we ran it, leaving old
    errors in place. Now it does clear things.

# 1.12.0

-   Support for a 'processAll' backend function to support explicitly
    triggering a reprocess of everything on the backend.

# 1.11.1

-   Fix: it was possible for the change hook to be triggered for a field even
    if the field actually did not change, at least if that field was required
    and empty.

# 1.11.0

-   There is a new `backend` configuration option where you can configure
    interaction with a backend, including dynamic backend-driven validation
    during editing (the `process` option). See the documentation for more.

-   BREAKING CHANGE: the 'save' hook has changed. Previously you could register
    a `save` function directly as a state option. Now you need to pass it into
    `backend`. Previously we had an ill-defined protocol for handling
    backend-generated errors. This has been completely replaced by the new
    protocol also used for dynamic backend processing while you edit.

    So:

    ```js
    async function save(json) {
        /* do stuff to save */
        return null;
    }

    form.state({
        save
    });
    ```

    Should now become:

    ```js
    async function save(json) {
        /* do stuff to save */
        return null;
    }

    form.state({
        backend: { save }
    });
    ```

    Before you could return a structure of error messages from `save` if
    the save failed. This is now replaced by a process result structure, where
    error messages are indicated by paths. See the documentation for more
    information.

    Previously errors returned from `save` were removed automatically as soon
    as you start typing. Now they are retained until you press `save` again.
    Alternatively you can specify a backend `process` function so they can be
    updated dynamically.

-   BREAKING CHANGE: the `additionalError` and `additionalErrors` methods on
    state have been removed. Associate additional errors to particular
    accessors using their path.

-   BREAKING CHANGE: we had a undocumented feature where you could declare
    asynchronous `validators` and `rawValidators` for a field. This was little
    used and complicated the code quite a bit. Now these functions have to be
    simple synchronous functions.

-   BREAKING CHANGE: since we don't actually asynchronously validate anymore,
    the `isValidating` API on `FieldAccessor` as well as `FormState` now has
    been removed.

-   BREAKING CHANGE: converters have changed.

    If you had a converter that threw `ConvertError`, you now need to throw
    `ConversionError`, which takes a single argument, the conversion error
    type, or if omitted, the conversion error type is 'default'.

    If you had a converter that used `rawValidate` or `validate` - these are
    now not in use anymore, because we found they aren't that useful. You can
    rewrite your converters to throw `ConversionError` instead.

    This makes converters entirely synchronous, which should make them faster
    and easier to test.

-   It's possible to set `conversionError` on a `Field` as an object with as
    keys the conversion error type (defined by the converter) and as values
    either a message or a function that returns the message given the context.
    A key `default` must always exist. So like this:

    ```js
          conversionError: {
            default: "Not a number",
            tooManyDecimalPlaces: "Too many decimal places",
            tooManyWholeDigits: "Too many whole digits",
            cannotBeNegative: "Cannot be negative"
          }
    ```

    or like this:

    ```js
          conversionError: {
            default: context => "Not a number",
            tooManyDecimalPlaces: context => "Too many decimal places",
            tooManyWholeDigits: context => "Too many whole digits",
            cannotBeNegative: context => "Cannot be negative"
          }
    ```

# 1.10.0

-   BREAKING CHANGE: the decimal converter accepts options, like this:

    `converters.decimal({allowNegative: false})`

    Previously it was also possible to pass a function into the `decimal`
    converter which would return options, like this:

    `converters.decimal(getOptions)`.

    This was a way to make options dynamic and depend on context. You can't do
    this anymore, but instead this system has been generalized with
    `converters.dynamic`.

    `converters.decimal(getOptions)` becomes
    `converters.dynamic(converters.decimal, getOptions)`

    A `converters.maybe(converters.decimal(getOptions))` becomes
    `converters.maybe(converters.dynamic(converters.decimal, getOptions))`, and
    the same for `maybeNull`.

    `getOptions` gets two parameters: `context` (as passed to `state()`) and a
    new second parameter, `accessor`, the field accessor for which this
    converter is working.

    While `converters.dynamic` currently only works for decimal, it will work
    for new converters to be introduced as well that take parameters.

-   Some internal reworking to prepare for versions of the existing converters
    that take parameters.

-   Added `isEmpty` and `isEmptyAndRequired` to field accessor. This checks
    whether the `raw` value equals the `emptyRaw` value on the converter, if so
    it is considered empty. `isEmptyAndRequired` makes use of `isEmpty` and in
    addition checks whether the field is marked `required`.

# 1.9.0

-   BREAKING: Removed `isRepeatingFormDisabled`. Use the generic `isDisabled`
    version instead.

-   BREAKING: `isDisabled`, `isHidden` and `isReadOnly` now take any accessor,
    rather than just a field accessor.

-   Forms, repeatingForms and subForms can now all be disabled, read-only and
    hidden. They pass these properties to all their children.

-   Form and field accessors now have an `inputAllowed` property, which returns
    true when an accessor is not disabled, hidden or read-only.

# 1.8.0

-   Fieldref support. All accessors expose a 'fieldref' property. This is a
    general form of the path which can be used to more easily match fields, for
    instance when implemented 'isRequired' and other hooks.

# 1.7.0

-   Rewrite the way decimal numbers (and floating point) are parsed and
    rendered. We now a have a parser-driven approach.

    The rendering code for decimals now has a new option "addZeroes", which
    will add trailing zeroes if enabled.

-   Added the `setValueAndUpdateRaw` method on accessors. This function
    subsequently calls `accessor.setValue` and `accessor.setRawFromValue`,
    allowing us to update the raw whilst setting the value.

-   Added a `postprocess` option on fields. If enabled, when you blur out of the
    field this rerenders the information.

# 1.6.5

-   Fix a bug where `setRawFromValue` was not marked with `@action`.

# 1.6.4

-   Fix a bug where you could get strange behavior if you attach a form state to
    the same MST node multiple times. mstform wasn't properly disposing of its
    `onPatch` handler and its reactions in use for derived fields. Now mstform
    automatically cleans up the event handlers of the old form state when you
    attach a new state to an object with `form.state()`.

    mstform now also exposes a `dispose()` method to `FormState` so you can do
    this manually.

# 1.6.3

-   Removed decimal trimming when rendering decimals due to buggy behavior.

# 1.6.2

-   Fixed a bug where render functions were passed a context argument instead of
    an options argument, with a context inside.

# 1.6.1

-   Set defaultControlled for `textStringArray` converter to `controlled.value`.

# 1.6.0

-   Added the `textStringArray` converter. A converter that takes a string with
    newlines and converts it to an array of strings split by newline.

# 1.5.0

-   Made the decimal converter dynamic. A decimal converter can now take either
    a set of decimal options or a function that sets decimal options based on
    context. This allows for dynamically changing options.

-   When rendering decimal numbers in forms, decimals are now trimmed to the
    number of decimal places specified in decimal options with the
    `DecimalPlaces` option.

# 1.4.2

-   Fixed wrongful rendering of thousand separators after decimal separators.

# 1.4.1

-   `value` on `FieldAccessor` was in obscure circumstances (that did of course
    happen in practice) inappropriately cached, which created bugs. Changed
    `FieldAccessor` so that value can be properly cached.

-   The `change` and `update` hooks weren't called properly when you set a raw
    value to empty, and now they are.

# 1.4.0

-   Added 'value' to all the accessors. This is the underlying value that the
    accessor is working on (a MST node for `SubForm` and
    `RepeatingFormIndexAccessor` and a MST array in case of
    `RepeatingFormAccessor`). This allows you hooks (such as `isRequired`) that
    takes the value into account.

-   When you have a field that has a possible empty value (i.e. a MST
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
