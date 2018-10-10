import { resolveMessage } from "../src/messages.ts";

// test("top-level field", async () => {
//   // FieldAccessor "foo"
//   // path: foo
//   const messages = {
//     foo: "Wrong"
//   };
//   expect(resolveMessage(messages, "foo")).toEqual("Wrong");
//   expect(resolveMessage(messages, "bar")).toBeUndefined();
//   expect(resolveMessage(messages, "foo/bar")).toBeUndefined();
//   expect(resolveMessage(messages, "bar/baz")).toBeUndefined();
//   expect(resolveMessage(undefined, "foo")).toBeUndefined();
// });

// FieldAccessor "foo"
// path: foo
const fieldError = {
  foo: "Wrong"
};

// FormState
// path:
const formError = {
  __error__: "Wrong"
};

// RepeatingFormAccessor "foo"
// path: foo
const arrayError = {
  __error__foo: "Wrong"
};

// RepeatingFormIndexed accessor 2 of RepeatingFormAccessor "foo"
// path: foo/1
const repeatingFormError = {
  foo: [
    {},
    {
      __error__: "Wrong"
    }
  ]
};

// FieldAccessor "bar"
// on RepeatingFormIndexed accessor 2 of RepeatingFormAccessor "foo"
// path: foo/1/bar
const repeatingFormFieldError = {
  foo: [
    {},
    {
      bar: "Wrong"
    }
  ]
};

// SubFormAccessor "foo"
// path: foo
const subFormError = {
  foo: {
    __error__: "Wrong"
  }
};

// FieldAccessor "bar" on SubFormAccessor "foo"
// path: foo/bar
const subFormFieldError = {
  foo: {
    bar: "Wrong"
  }
};
