import { configure } from "mobx";
import { castToSnapshot, Instance, types } from "mobx-state-tree";
import { converters, controlled, Form, Field } from "../src";
configure({ enforceActions: "always" });

test("object controlled", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.object, { controlled: controlled.object }),
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.inputProps.value).toEqual("FOO");
  expect(field.inputProps.checked).toBeUndefined();
  field.inputProps.onChange("BAR");
  expect(field.raw).toEqual("BAR");
});

test("modelArray controlled", () => {
  const Bar = types.model("Bar", {
    id: types.identifierNumber,
    name: types.string,
  });

  const BarContainer = types
    .model("BarContainer", {
      entryMap: types.map(Bar),
    })
    .actions((self) => ({
      addValue(value: Instance<typeof Bar>) {
        self.entryMap.put(value);
      },
    }));
  const M = types.model("M", {
    barContainer: BarContainer,
    foo: types.array(types.reference(Bar)),
  });

  const form = new Form(M, {
    foo: new Field(converters.modelReferenceArray(Bar)),
  });

  const container = BarContainer.create({ entryMap: {} });
  const barValue = Bar.create({ id: 1, name: "Lucky" });
  container.addValue(barValue);

  const o = M.create({
    barContainer: castToSnapshot(container),
    foo: [],
  });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.inputProps.value).toEqual([]);
  field.inputProps.onChange([barValue]);
  expect(field.raw).toEqual([
    {
      id: 1,
      name: "Lucky",
    },
  ]);
});

test("value controlled", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.object, { controlled: controlled.value }),
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.inputProps.value).toEqual("FOO");
  expect(field.inputProps.checked).toBeUndefined();
  field.inputProps.onChange({ target: { value: "BAR" } });
  expect(field.raw).toEqual("BAR");
});

test("checked controlled", () => {
  const M = types.model("M", {
    foo: types.boolean,
  });

  const form = new Form(M, {
    foo: new Field(converters.object, { controlled: controlled.checked }),
  });

  const o = M.create({ foo: true });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.inputProps.checked).toEqual(true);
  expect(field.inputProps.value).toBeUndefined();
  field.inputProps.onChange({ target: { checked: false } });
  expect(field.raw).toEqual(false);
});

test("custom controlled", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.object, {
      controlled: (accessor) => {
        return {
          weird: accessor.raw,
          onChange: (raw: any) => accessor.setRaw(raw),
        };
      },
    }),
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.inputProps.weird).toEqual("FOO");
  field.inputProps.onChange("BAR");
  expect(field.raw).toEqual("BAR");
});

test("default value controlled for string converter", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.inputProps.value).toEqual("FOO");
  expect(field.inputProps.checked).toBeUndefined();
  field.inputProps.onChange({ target: { value: "BAR" } });
  expect(field.raw).toEqual("BAR");
});

test("default value controlled for maybe string converter", () => {
  const M = types.model("M", {
    foo: types.maybeNull(types.string),
  });

  const form = new Form(M, {
    foo: new Field(converters.maybeNull(converters.string)),
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.inputProps.value).toEqual("FOO");
  expect(field.inputProps.checked).toBeUndefined();
  field.inputProps.onChange({ target: { value: "BAR" } });
  expect(field.raw).toEqual("BAR");
});

test("default checked controlled for boolean converter", () => {
  const M = types.model("M", {
    foo: types.boolean,
  });

  const form = new Form(M, {
    foo: new Field(converters.boolean),
  });

  const o = M.create({ foo: true });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.inputProps.checked).toEqual(true);
  expect(field.inputProps.value).toBeUndefined();
  field.inputProps.onChange({ target: { checked: false } });
  expect(field.raw).toEqual(false);
});

test("default object controlled", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.object),
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.inputProps.value).toEqual("FOO");
  expect(field.inputProps.checked).toBeUndefined();
  field.inputProps.onChange("BAR");
  expect(field.raw).toEqual("BAR");
});

test("default object controlled for stringArray converter", () => {
  const M = types.model("M", {
    foo: types.array(types.string),
  });

  const form = new Form(M, {
    foo: new Field(converters.stringArray),
  });

  const o = M.create({ foo: [] });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.inputProps.value).toEqual([]);
  field.inputProps.onChange(["a", "b"]);
  expect(field.raw).toEqual(["a", "b"]);
});

test("default object controlled for maybe converter", () => {
  const M = types.model("M", {
    foo: types.maybeNull(types.string),
  });

  const form = new Form(M, {
    foo: new Field(converters.object),
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);
  const field = state.field("foo");

  expect(field.inputProps.value).toEqual("FOO");
  expect(field.inputProps.checked).toBeUndefined();
  field.inputProps.onChange("BAR");
  expect(field.raw).toEqual("BAR");
});

// fromEvent backwards compatibility
test("getRaw fromEvent", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string, {
      fromEvent: true,
    }),
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.inputProps.value).toEqual("FOO");
  field.inputProps.onChange({ target: { value: "BAR" } });
  expect(field.raw).toEqual("BAR");
});

// handleChange backwards compatibility
test("getRaw fromEvent", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string, {
      fromEvent: true,
    }),
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.inputProps.value).toEqual("FOO");
  field.handleChange({ target: { value: "BAR" } });
  expect(field.raw).toEqual("BAR");
});

// getRaw backwards compatibility
test("override getRaw", () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string, {
      getRaw(event) {
        return event.target.weird;
      },
    }),
  });

  const o = M.create({ foo: "FOO" });

  const state = form.state(o);

  const field = state.field("foo");

  expect(field.inputProps.value).toEqual("FOO");
  field.inputProps.onChange({ target: { weird: "BAR" } });
  expect(field.raw).toEqual("BAR");
});
