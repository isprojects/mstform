# 0.11

- Fix a bug with add mode.

- The onPatch handler can handle all logic safely, so that
  updating arrays directly in the underlying instance also works.

- Implement a new `focus` hook to automatically fire whenever a user focuses on
  a field.

# 0.10.2

- Bugfix. Make raw update work with references.

# 0.10.1

- Bugfix. Safeguard against rendering non-existing fields.

# 0.10

- Update the raw value when you change the underlying object.

# 0.9

- Implement change hooks

# 0.8.1

- Change behavior of derived fields: they are not immediately calculated when
  the form is loaded. Instead they are only calculated when changes are made,
  which is what is intended. This also avoids a warning that we modify data
  during render.

# 0.8.0

- You can set up derived fields. These fields use a value calculated
  by some MST view, except if the user modifies them by hand. If the view
  changes, this value takes precedence again.
