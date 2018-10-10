import { resolveMessage, Messages } from "../src/messages";

test("top-level field", () => {
  // FieldAccessor "foo"
  // path: foo
  const messages = {
    foo: "Wrong"
  };
  expect(resolveMessage(messages, "foo")).toEqual("Wrong");
  expect(resolveMessage(messages, "bar")).toBeUndefined();
  expect(resolveMessage(messages, "foo/bar")).toBeUndefined();
  expect(resolveMessage(messages, "bar/baz")).toBeUndefined();
  expect(resolveMessage(undefined, "foo")).toBeUndefined();
});

test("FieldAccessor bar on SubFormAccessor foo", () => {
  // FieldAccessor "bar" on SubFormAccessor "foo"
  // path: foo/bar
  const messages = {
    foo: {
      bar: "Wrong"
    }
  };
  expect(resolveMessage(messages, "foo/bar")).toEqual("Wrong");
  expect(resolveMessage(messages, "foo")).toBeUndefined();
  expect(resolveMessage(messages, "foo/bar/baz")).toBeUndefined();
});

test("FieldAccessor bar on repeating form", () => {
  // FieldAccessor "bar"
  // on RepeatingFormIndexed accessor 2 of RepeatingFormAccessor "foo"
  // path: foo/1/bar
  const messages: Messages = {
    foo: [
      {},
      {
        bar: "Wrong"
      }
    ]
  };
  expect(resolveMessage(messages, "foo/1/bar")).toEqual("Wrong");
  expect(resolveMessage(messages, "foo/1")).toBeUndefined();
  expect(resolveMessage(messages, "foo")).toBeUndefined();
  expect(resolveMessage(messages, "foo/0/bar")).toBeUndefined();
  expect(resolveMessage(messages, "foo/3/bar")).toBeUndefined();
});

test("FormState error", () => {
  // FormState
  // path:
  const messages = {
    __error__: "Wrong"
  };

  expect(resolveMessage(messages, "")).toEqual("Wrong");
});

test("SubForm error", () => {
  // SubFormAccessor "foo"
  // path: foo
  const messages = {
    foo: {
      __error__: "Wrong"
    }
  };

  expect(resolveMessage(messages, "foo")).toEqual("Wrong");
});

test("RepeatingFormAccessor error", () => {
  // RepeatingFormAccessor "foo"
  // path: foo
  const messages = {
    __error__foo: "Wrong"
  };

  expect(resolveMessage(messages, "foo")).toEqual("Wrong");
});

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
