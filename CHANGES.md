# 0.8.1

- Change behavior of derived fields: they are not immediately calculated when
  the form is loaded. Instead they are only calculated when changes are made,
  which is what is intended. This also avoids a warning that we modify data
  during render.

# 0.8.0

- You can set up derived fields. These fields use a value calculated
  by some MST view, except if the user modifies them by hand. If the view
  changes, this value takes precedence again.
