import { configure } from "mobx";
import { types, Instance } from "mobx-state-tree";
import { SubForm, Form, Field, RepeatingForm, converters } from "../src";
import { debounce, until } from "./utils";

jest.useFakeTimers();

configure({ enforceActions: "always" });

test("backend process sets error messages", async () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const o = M.create({ foo: "FOO" });

  const form = new Form(M, { foo: new Field(converters.string) });

  const myProcess = async (node: Instance<typeof M>, path: string) => {
    return {
      updates: [],
      accessUpdates: [],
      errorValidations: [
        { id: "alpha", messages: [{ path: "/foo", message: "error" }] },
      ],
      warningValidations: [],
    };
  };

  const state = form.state(o, {
    backend: {
      process: myProcess,
      debounce,
    },
  });

  const field = state.field("foo");

  field.setRaw("FOO!");
  jest.runAllTimers();

  await state.processPromise;

  expect(field.error).toEqual("error");
});

test("backend process wipes out error messages", async () => {
  const M = types.model("M", {
    a: types.string,
    b: types.string,
  });

  const o = M.create({ a: "A", b: "B" });

  const form = new Form(M, {
    a: new Field(converters.string),
    b: new Field(converters.string),
  });

  let called = false;

  // the idea is that the form processor only returns errors related
  // to the field that was just touched under an id. if that id is wiped out,
  // those errors are removed. but other error structures (like for 'beta' here)
  // are not affected and remain
  const myProcess = async (node: Instance<typeof M>, path: string) => {
    if (!called) {
      called = true;
      return {
        updates: [],
        accessUpdates: [],
        errorValidations: [
          {
            id: "alpha",
            messages: [{ path: "/a", message: "error a" }],
          },
          {
            id: "beta",
            messages: [{ path: "/b", message: "error b" }],
          },
        ],
        warningValidations: [],
      };
    } else {
      return {
        updates: [],
        accessUpdates: [],
        errorValidations: [{ id: "alpha", messages: [] }],
        warningValidations: [],
      };
    }
  };

  const state = form.state(o, {
    backend: {
      process: myProcess,
      debounce,
    },
  });

  const a = state.field("a");
  const b = state.field("b");

  a.setRaw("a!");
  jest.runAllTimers();
  await state.processPromise;

  expect(a.error).toEqual("error a");
  expect(b.error).toEqual("error b");

  a.setRaw("a!!");
  jest.runAllTimers();
  await state.processPromise;

  expect(a.error).toBeUndefined();
  expect(b.error).toEqual("error b");
});

test("backend process two requests are synced", async () => {
  const M = types.model("M", {
    a: types.string,
    b: types.string,
  });

  const o = M.create({ a: "A", b: "B" });

  const form = new Form(M, {
    a: new Field(converters.string),
    b: new Field(converters.string),
  });

  const untilA = until();

  const requests: string[] = [];
  const myProcess = async (node: Instance<typeof M>, path: string) => {
    // if the 'a' path is passed, we await a promise
    // This way we can test a long-duration promise and that
    // the code ensures the next call to run is only executed after the
    // first is resolved.
    if (path === "a") {
      await untilA.finished;
    }
    requests.push(path);
    return {
      updates: [],
      accessUpdates: [],
      errorValidations: [
        { id: "alpha", messages: [{ path: "/a", message: `error ${path}` }] },
      ],
      warningValidations: [],
    };
  };

  const state = form.state(o, {
    backend: {
      process: myProcess,
      debounce,
    },
  });

  const a = state.field("a");
  const b = state.field("b");

  // we run for 'a', it halts until we call resolveA
  a.setRaw("a!");
  // we now run 'b', which should only run once 'a' is resolved
  b.setRaw("b!");

  jest.runAllTimers();

  // we resolve 'a'
  untilA.resolve();

  await state.processPromise;

  // these should both be called, in that order
  expect(requests).toEqual(["/a", "/b"]);
  // and we expect the error message to be set
  expect(a.error).toEqual("error /b");
});

test("backend process three requests are synced", async () => {
  const M = types.model("M", {
    a: types.string,
    b: types.string,
    c: types.string,
  });

  const o = M.create({ a: "A", b: "B", c: "C" });

  const form = new Form(M, {
    a: new Field(converters.string),
    b: new Field(converters.string),
    c: new Field(converters.string),
  });

  const untilA = until();
  const untilB = until();

  const requests: string[] = [];

  const myProcess = async (node: Instance<typeof M>, path: string) => {
    // if the 'a' path is passed, we await a promise
    // This way we can test a long-duration promise and that
    // the code ensures the next call to run is only executed after the
    // first is resolved.
    if (path === "a") {
      await untilA.finished;
    }
    if (path === "b") {
      await untilB.finished;
    }
    requests.push(path);
    return {
      updates: [],
      accessUpdates: [],
      errorValidations: [
        { id: "alpha", messages: [{ path: "/a", message: `error ${path}` }] },
      ],
      warningValidations: [],
    };
  };

  const state = form.state(o, {
    backend: {
      process: myProcess,
      debounce,
    },
  });

  const a = state.field("a");
  const b = state.field("b");
  const c = state.field("c");

  // we run for 'a', it halts until we call resolveA
  a.setRaw("a!");
  // we now run 'b', which should only run once 'b' is resolved
  b.setRaw("b!");
  // and 'c' which should only run once 'b' is resolved
  c.setRaw("c!");

  jest.runAllTimers();
  // we resolve 'b'
  untilB.resolve();
  // we resolve 'a'
  untilA.resolve();

  await state.processPromise;
  // these should all be called, in the right order
  expect(requests).toEqual(["/a", "/b", "/c"]);
  // and we expect the error message to be set
  expect(a.error).toEqual("error /c");
});

test("backend process does update", async () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string,
  });

  const o = M.create({ foo: "FOO", bar: "BAR" });

  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string),
  });

  const myProcess = async (node: Instance<typeof M>, path: string) => {
    return {
      updates: [{ path: "/foo", value: "BAR" }],
      accessUpdates: [],
      errorValidations: [],
      warningValidations: [],
    };
  };

  const state = form.state(o, {
    backend: {
      process: myProcess,
      debounce,
    },
  });

  const foo = state.field("foo");
  const bar = state.field("bar");

  bar.setRaw("BAR!");
  jest.runAllTimers();

  await state.processPromise;

  expect(o.foo).toEqual("BAR");
  expect(foo.raw).toEqual("BAR");
});

test("backend process ignores update if path re-modified during processing", async () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string,
  });

  const o = M.create({ foo: "FOO", bar: "BAR" });

  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string),
  });

  let called = false;

  const myProcess = async (node: Instance<typeof M>, path: string) => {
    // we ensure that only the first time we call this we
    // try to update foo
    if (!called) {
      called = true;
      return {
        updates: [{ path: "/foo", value: "BAR" }],
        accessUpdates: [],
        errorValidations: [],
        warningValidations: [],
      };
    } else {
      return {
        updates: [],
        accessUpdates: [],
        errorValidations: [],
        warningValidations: [],
      };
    }
  };

  const state = form.state(o, {
    backend: {
      process: myProcess,
      debounce,
    },
  });

  const foo = state.field("foo");
  const bar = state.field("bar");

  // trigger the update of foo
  bar.setRaw("BAR!");

  jest.runAllTimers();
  // we change things while we are processing
  // user input should never be overridden by the backend,
  // even if timers haven't yet run
  foo.setRaw("CHANGED!");

  await state.processPromise;

  // since only the first change tried to update, and the second change
  // isn't even triggered yet (and doesn't update anyhow), the value should
  // be unchanged
  expect(o.foo).toEqual("CHANGED!");
  expect(foo.raw).toEqual("CHANGED!");
});

test("backend process stops ignoring update", async () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string,
  });

  const o = M.create({ foo: "FOO", bar: "BAR" });

  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string),
  });

  let called = false;
  const myProcess = async (node: Instance<typeof M>, path: string) => {
    // we ensure that only the first time we call this we
    // try to update foo
    if (!called) {
      called = true;
      return {
        updates: [{ path: "/foo", value: "IGNORED" }],
        accessUpdates: [],
        errorValidations: [],
        warningValidations: [],
      };
    } else {
      return {
        updates: [{ path: "/foo", value: "NOW REALLY" }],
        accessUpdates: [],
        errorValidations: [],
        warningValidations: [],
      };
    }
  };

  const state = form.state(o, {
    backend: {
      process: myProcess,
      debounce,
    },
  });

  const foo = state.field("foo");
  const bar = state.field("bar");

  bar.setRaw("BAR!");
  jest.runAllTimers();
  // we change things while we are processing
  // user input should never be overridden by the backend,
  // even if timers haven't yet run
  foo.setRaw("CHANGED!");

  await state.processPromise;

  // since only the first change tried to update, and the second change
  // isn't even triggered yet, the value should
  // be unchanged
  expect(o.foo).toEqual("CHANGED!");
  expect(foo.raw).toEqual("CHANGED!");

  // process the second change now, see it take effect
  jest.runAllTimers();
  await state.processPromise;

  expect(o.foo).toEqual("NOW REALLY");
});

test("configuration with state", async () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
  });

  const o = M.create({ foo: "FOO" });

  async function myProcess(node: Instance<typeof M>, path: string) {
    return {
      updates: [],
      accessUpdates: [],
      errorValidations: [
        { id: "alpha", messages: [{ path: "/foo", message: "error!" }] },
      ],
      warningValidations: [],
    };
  }

  const state = form.state(o, {
    backend: {
      process: myProcess,
      debounce: debounce,
    },
  });

  const field = state.field("foo");
  field.setRaw("BAR");

  jest.runAllTimers();

  await state.processPromise;

  expect(field.error).toEqual("error!");
});

test("configuration other getError", async () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
  });

  const o = M.create({ foo: "FOO" });

  async function myProcess(node: Instance<typeof M>, path: string) {
    return {
      updates: [],
      accessUpdates: [],
      errorValidations: [
        {
          id: "alpha",
          messages: [{ path: "/foo", message: "external error" }],
        },
      ],
      warningValidations: [],
    };
  }

  const state = form.state(o, {
    backend: {
      process: myProcess,
      debounce: debounce,
    },
    getError() {
      return "getError";
    },
  });

  const field = state.field("foo");

  expect(field.error).toEqual("getError");

  field.setRaw("BAR");

  jest.runAllTimers();

  await state.processPromise;

  expect(field.error).toEqual("external error");
});

test("update", async () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string),
  });

  const o = M.create({ foo: "FOO", bar: "unchanged" });

  async function myProcess(node: Instance<typeof M>, path: string) {
    return {
      updates: [{ path: "/bar", value: "BAR" }],
      accessUpdates: [],
      errorValidations: [],
      warningValidations: [],
    };
  }

  const state = form.state(o, {
    backend: {
      process: myProcess,
      debounce: debounce,
    },
  });

  const fooField = state.field("foo");
  const barField = state.field("bar");
  fooField.setRaw("FOO!");

  jest.runAllTimers();

  await state.processPromise;

  expect(barField.value).toEqual("BAR");
});

test("backend process is rejected, recovery", async () => {
  const M = types.model("M", {
    a: types.string,
    b: types.string,
  });

  const o = M.create({ a: "A", b: "B" });

  const form = new Form(M, {
    a: new Field(converters.string),
    b: new Field(converters.string),
  });

  const fakeError = jest.fn();

  console.error = fakeError;

  const requests: string[] = [];

  let crashy = true;

  const myProcess = async (node: Instance<typeof M>, path: string) => {
    requests.push(path);
    if (crashy) {
      crashy = false; // crash only the first time
      throw new Error("We crash out");
    }

    return {
      updates: [],
      accessUpdates: [],
      errorValidations: [
        { id: "alpha", messages: [{ path: "/a", message: `error ${path}` }] },
      ],
      warningValidations: [],
    };
  };

  const state = form.state(o, {
    backend: {
      process: myProcess,
      debounce,
    },
  });

  const a = state.field("a");
  const b = state.field("b");

  // we run for 'a', it crashes
  a.setRaw("A!");
  // we now run 'b', should succeed with a message
  b.setRaw("B!");

  jest.runAllTimers();

  await state.processPromise;

  expect(crashy).toBeFalsy();
  expect(fakeError.mock.calls.length).toEqual(1);

  // these should both be called, in that order
  expect(requests).toEqual(["/a", "/b"]);
  // and we expect the error message to be set
  expect(a.error).toEqual("error /b");
});

test("backend process all", async () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const o = M.create({ foo: "FOO" });

  const myProcessAll = async (node: Instance<typeof M>) => {
    return {
      updates: [],
      errorValidations: [
        { id: "alpha", messages: [{ path: "/foo", message: "error" }] },
      ],
      warningValidations: [],
    };
  };

  const form = new Form(M, {
    foo: new Field(converters.string),
  });

  const state = form.state(o, {
    backend: {
      processAll: myProcessAll,
      debounce,
    },
  });

  await state.processAll();

  expect(state.field("foo").error).toEqual("error");
});

test("process all configuration with state", async () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string),
  });

  const o = M.create({ foo: "FOO", bar: "BAR" });

  let setting = "a";
  async function myProcessAll(node: Instance<typeof M>) {
    if (setting === "a") {
      return {
        updates: [],
        errorValidations: [
          { id: "alpha", messages: [{ path: "/foo", message: "foo error!" }] },
        ],
        warningValidations: [],
      };
    } else if (setting === "b") {
      return {
        updates: [],
        errorValidations: [
          { id: "beta", messages: [{ path: "/bar", message: "bar error!" }] },
        ],
        warningValidations: [],
      };
    } else {
      return {};
    }
  }

  const state = form.state(o, {
    backend: {
      debounce: debounce,
      processAll: myProcessAll,
    },
  });

  const fooField = state.field("foo");
  const barField = state.field("bar");

  await state.processAll();

  expect(fooField.error).toEqual("foo error!");
  expect(barField.error).toBeUndefined();

  // now modify settings so we get different results
  // it should have wiped out all errors
  setting = "b";
  await state.processAll();

  expect(fooField.error).toBeUndefined();
  expect(barField.error).toEqual("bar error!");
});

test("process & live", async () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
  });

  const o = M.create({ foo: "FOO" });

  const liveSeen: boolean[] = [];

  async function myProcess(
    node: Instance<typeof M>,
    path: string,
    liveOnly: boolean
  ) {
    liveSeen.push(liveOnly);
    return {
      updates: [],
      accessUpdates: [],
      errorValidations: [],
      warningValidations: [],
    };
  }

  async function mySave(node: Instance<typeof M>) {
    return null;
  }

  const state = form.state(o, {
    backend: {
      process: myProcess,
      save: mySave,
      debounce: debounce,
    },
  });

  const fooField = state.field("foo");

  // before a save, we only want the live fields
  fooField.setRaw("FOO!");

  jest.runAllTimers();
  await state.processPromise;

  expect(liveSeen).toEqual([true]);

  // a successful save
  const success = await state.save();
  expect(success).toBeTruthy();

  fooField.setRaw("FOO!!!");

  jest.runAllTimers();
  await state.processPromise;

  // now we've seen validation that includes non-live validations
  expect(liveSeen).toEqual([true, false]);
});

test("process & live save error", async () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
  });

  const o = M.create({ foo: "FOO" });

  const liveSeen: boolean[] = [];

  async function myProcess(
    node: Instance<typeof M>,
    path: string,
    liveOnly: boolean
  ) {
    liveSeen.push(liveOnly);
    return {
      updates: [],
      accessUpdates: [],
      errorValidations: [],
      warningValidations: [],
    };
  }

  async function mySave(node: Instance<typeof M>) {
    // this counts as an unsuccessful save
    return {
      updates: [],
      accessUpdates: [],
      errorValidations: [],
      warningValidations: [],
    };
  }

  const state = form.state(o, {
    backend: {
      process: myProcess,
      save: mySave,
      debounce: debounce,
    },
  });

  const fooField = state.field("foo");

  // before a save, we only want the live fields
  fooField.setRaw("FOO!");

  jest.runAllTimers();
  await state.processPromise;

  expect(liveSeen).toEqual([true]);

  // an unsuccessful save
  const success = await state.save();
  expect(success).toBeFalsy();

  fooField.setRaw("FOO!!!");

  jest.runAllTimers();
  await state.processPromise;

  // now we've seen validation that includes non-live validations
  expect(liveSeen).toEqual([true, false]);
});

test("processAll and liveOnly", async () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
  });

  const o = M.create({ foo: "FOO" });

  const liveSeen: boolean[] = [];

  async function myProcessAll(node: Instance<typeof M>, liveOnly: boolean) {
    liveSeen.push(liveOnly);
    return {
      updates: [],
      errorValidations: [],
      warningValidations: [],
    };
  }

  async function mySave(node: Instance<typeof M>) {
    return null;
  }

  const state = form.state(o, {
    backend: {
      processAll: myProcessAll,
      save: mySave,
      debounce: debounce,
    },
  });

  await state.processAll();
  expect(liveSeen).toEqual([true]);

  await state.save();

  await state.processAll();
  expect(liveSeen).toEqual([true, false]);
});

test("processAll and liveOnly overrule", async () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
  });

  const o = M.create({ foo: "FOO" });

  const liveSeen: boolean[] = [];

  async function myProcessAll(node: Instance<typeof M>, liveOnly: boolean) {
    liveSeen.push(liveOnly);
    return {
      updates: [],
      errorValidations: [],
      warningValidations: [],
    };
  }

  async function mySave(node: Instance<typeof M>) {
    return null;
  }

  const state = form.state(o, {
    backend: {
      processAll: myProcessAll,
      save: mySave,
      debounce: debounce,
    },
  });

  await state.processAll(false);
  expect(liveSeen).toEqual([false]);

  await state.save();

  await state.processAll(true);
  expect(liveSeen).toEqual([false, true]);
});

test("reset liveOnly status", async () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
  });

  const o = M.create({ foo: "FOO" });

  const liveSeen: boolean[] = [];

  async function myProcess(
    node: Instance<typeof M>,
    path: string,
    liveOnly: boolean
  ) {
    liveSeen.push(liveOnly);
    return {
      updates: [],
      accessUpdates: [],
      errorValidations: [],
      warningValidations: [],
    };
  }

  async function mySave(node: Instance<typeof M>) {
    return null;
  }

  const state = form.state(o, {
    backend: {
      process: myProcess,
      save: mySave,
      debounce: debounce,
    },
  });

  const fooField = state.field("foo");

  // before a save, we only want the live fields
  fooField.setRaw("FOO!");

  jest.runAllTimers();
  await state.processPromise;

  expect(liveSeen).toEqual([true]);

  // a successful save
  const success = await state.save();
  expect(success).toBeTruthy();

  fooField.setRaw("FOO!!!");

  jest.runAllTimers();
  await state.processPromise;

  // now we've seen validation that includes non-live validations
  expect(liveSeen).toEqual([true, false]);

  // now we reset again to the before save status
  state.resetSaveStatus();

  fooField.setRaw("FOO???");

  jest.runAllTimers();
  await state.processPromise;
  expect(liveSeen).toEqual([true, false, true]);
});

test("error messages and repeating form", async () => {
  const N = types.model("N", {
    bar: types.string,
  });

  const M = types.model("M", {
    foo: types.array(N),
  });

  const myProcess = async (node: Instance<typeof M>, path: string) => {
    return {
      updates: [],
      accessUpdates: [],
      errorValidations: [
        { id: "alpha", messages: [{ path: "/foo/0/bar", message: "error" }] },
      ],
      warningValidations: [],
    };
  };

  const o = M.create({ foo: [{ bar: "FOO" }] });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.string),
    }),
  });

  const state = form.state(o, {
    backend: {
      process: myProcess,
      debounce: debounce,
    },
  });

  const foo = state.repeatingForm("foo");
  const bar0 = foo.index(0).field("bar");

  bar0.setRaw("CHANGED!");

  jest.runAllTimers();

  await state.processPromise;

  expect(bar0.error).toEqual("error");

  // now insert a new entry above the current one
  foo.insert(0, { bar: "BEFORE" }, ["bar"]);

  const barBefore = foo.index(0).field("bar");
  expect(barBefore.raw).toEqual("BEFORE");
  expect(bar0.raw).toEqual("CHANGED!");

  // the error should still be associated with bar0
  expect(bar0.error).toEqual("error");
  // and the new entry shouldn't have one
  expect(barBefore.error).toBeUndefined();
});

test("error messages and sub form", async () => {
  const N = types.model("N", {
    bar: types.string,
  });

  const M = types.model("M", {
    foo: N,
  });

  const myProcess = async (node: Instance<typeof M>, path: string) => {
    return {
      updates: [],
      accessUpdates: [],
      errorValidations: [
        { id: "alpha", messages: [{ path: "/foo/bar", message: "error" }] },
      ],
      warningValidations: [],
    };
  };

  const o = M.create({ foo: { bar: "FOO" } });

  const form = new Form(M, {
    foo: new SubForm({
      bar: new Field(converters.string),
    }),
  });

  const state = form.state(o, {
    backend: {
      process: myProcess,
      debounce: debounce,
    },
  });

  const foo = state.subForm("foo");
  const bar = foo.field("bar");

  bar.setRaw("CHANGED!");

  jest.runAllTimers();

  await state.processPromise;

  expect(bar.error).toEqual("error");
});

test("backend process controls field access", async () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string,
  });

  const o = M.create({ foo: "FOO", bar: "BAR" });

  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string),
  });

  const myProcess = async (node: Instance<typeof M>, path: string) => {
    return {
      updates: [],
      accessUpdates: [
        {
          path: "/foo",
          readOnly: true,
          disabled: false,
          required: false,
          hidden: false,
        },
      ],
      errorValidations: [],
      warningValidations: [],
    };
  };

  const state = form.state(o, {
    backend: {
      process: myProcess,
      debounce,
    },
  });

  const foo = state.field("foo");
  const bar = state.field("bar");

  expect(foo.readOnly).toBeFalsy();

  bar.setRaw("BAR!");
  jest.runAllTimers();

  await state.processPromise;

  expect(foo.readOnly).toBeTruthy();
  expect(bar.readOnly).toBeFalsy();
});

test("backend process controls field access, omission", async () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string,
  });

  const o = M.create({ foo: "FOO", bar: "BAR" });

  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string),
  });

  let counter = 0;
  const accessUpdates = [
    {
      path: "/foo",
      readOnly: true,
      disabled: false,
      required: false,
      hidden: false,
    },
    {
      path: "/foo",
      disabled: true,
    },
  ];

  const myProcess = async (node: Instance<typeof M>, path: string) => {
    const result = {
      updates: [],
      accessUpdates: [accessUpdates[counter]],
      errorValidations: [],
      warningValidations: [],
    };
    counter++;
    return result;
  };

  const state = form.state(o, {
    backend: {
      process: myProcess,
      debounce,
    },
  });

  const foo = state.field("foo");
  const bar = state.field("bar");

  expect(foo.readOnly).toBeFalsy();

  bar.setRaw("BAR!");
  jest.runAllTimers();

  await state.processPromise;

  expect(foo.readOnly).toBeTruthy();
  expect(foo.disabled).toBeFalsy();

  bar.setRaw("BAR!!");
  jest.runAllTimers();

  await state.processPromise;
  expect(foo.readOnly).toBeTruthy();
  expect(foo.disabled).toBeTruthy();
});

test("backend process controls field access for repeating form", async () => {
  const N = types.model("N", {
    bar: types.string,
  });

  const M = types.model("M", {
    foo: types.array(N),
  });

  const myProcess = async (node: Instance<typeof M>, path: string) => {
    return {
      updates: [],
      accessUpdates: [
        {
          path: "/foo/0",
          readOnly: false,
          disabled: true,
          required: false,
          hidden: false,
        },
      ],
      errorValidations: [],
      warningValidations: [],
    };
  };

  const o = M.create({ foo: [{ bar: "FOO" }] });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.string),
    }),
  });

  const state = form.state(o, {
    backend: {
      process: myProcess,
      debounce: debounce,
    },
  });

  const foo = state.repeatingForm("foo");
  const bar0 = foo.index(0).field("bar");

  expect(bar0.disabled).toBeFalsy();

  bar0.setRaw("CHANGED!");
  jest.runAllTimers();
  await state.processPromise;

  expect(bar0.disabled).toBeTruthy();

  // now insert a new entry above the current one
  foo.insert(0, { bar: "BEFORE" }, ["bar"]);

  const barBefore = foo.index(0).field("bar");
  expect(barBefore.disabled).toBeFalsy();
  expect(bar0.disabled).toBeTruthy();
});

test("backend process controls field access for sub form", async () => {
  const N = types.model("N", {
    bar: types.string,
  });

  const M = types.model("M", {
    foo: N,
  });

  const myProcess = async (node: Instance<typeof M>, path: string) => {
    return {
      updates: [],
      accessUpdates: [
        {
          path: "foo/bar",
          hidden: true,
        },
      ],
      errorValidations: [],
      warningValidations: [],
    };
  };

  const o = M.create({ foo: { bar: "FOO" } });

  const form = new Form(M, {
    foo: new SubForm({
      bar: new Field(converters.string),
    }),
  });

  const state = form.state(o, {
    backend: {
      process: myProcess,
      debounce: debounce,
    },
  });

  const foo = state.subForm("foo");
  const bar = foo.field("bar");

  bar.setRaw("CHANGED!");

  jest.runAllTimers();

  await state.processPromise;

  expect(bar.hidden).toBeTruthy();
});

test("backend process required", async () => {
  const N = types.model("N", {
    bar: types.string,
  });

  const M = types.model("M", {
    foo: N,
  });

  const myProcess = async (node: Instance<typeof M>, path: string) => {
    return {
      updates: [],
      accessUpdates: [
        {
          path: "foo",
          required: true,
        },
      ],
      errorValidations: [],
      warningValidations: [],
    };
  };

  const o = M.create({ foo: { bar: "FOO" } });

  const form = new Form(M, {
    foo: new SubForm({
      bar: new Field(converters.string),
    }),
  });

  const state = form.state(o, {
    backend: {
      process: myProcess,
      debounce: debounce,
    },
  });

  const foo = state.subForm("foo");
  const bar = foo.field("bar");

  bar.setRaw("CHANGED!");

  jest.runAllTimers();

  await state.processPromise;

  expect(bar.required).toBeFalsy();
});

test("backend clearAllValidations", async () => {
  const M = types.model("M", {
    foo: types.string,
  });

  const o = M.create({ foo: "FOO" });

  const form = new Form(M, { foo: new Field(converters.string) });

  const myProcess = async (node: Instance<typeof M>, path: string) => {
    return {
      updates: [],
      accessUpdates: [],
      errorValidations: [
        { id: "alpha", messages: [{ path: "/foo", message: "error" }] },
      ],
      warningValidations: [],
    };
  };

  const state = form.state(o, {
    backend: {
      process: myProcess,
      debounce,
    },
  });

  const field = state.field("foo");

  field.setRaw("FOO!");
  jest.runAllTimers();

  await state.processPromise;

  expect(field.error).toEqual("error");
  state.clearAllValidations();
  expect(field.error).toBeUndefined();
});

test("backend process all global error", async () => {
  const M = types.model("M", {
    foo: types.string,
  });
  const o = M.create({ foo: "FOO" });
  const myProcessAll = async (node: Instance<typeof M>) => {
    return {
      updates: [],
      errorValidations: [
        { id: "alpha", messages: [{ path: "", message: "error" }] },
      ],
      warningValidations: [],
    };
  };
  const form = new Form(M, {
    foo: new Field(converters.string),
  });
  const state = form.state(o, {
    backend: {
      processAll: myProcessAll,
      debounce,
    },
  });
  await state.processAll();
  expect(state.error).toEqual("error");
  state.clearAllValidations();
  expect(state.error).toBeUndefined();
});

test("backend process all global warning", async () => {
  const M = types.model("M", {
    foo: types.string,
  });
  const o = M.create({ foo: "FOO" });
  const myProcessAll = async (node: Instance<typeof M>) => {
    return {
      updates: [],
      errorValidations: [],
      warningValidations: [
        { id: "alpha", messages: [{ path: "", message: "warning" }] },
      ],
    };
  };
  const form = new Form(M, {
    foo: new Field(converters.string),
  });
  const state = form.state(o, {
    backend: {
      processAll: myProcessAll,
      debounce,
    },
  });
  await state.processAll();
  expect(state.warning).toEqual("warning");
  state.clearAllValidations();
  expect(state.warning).toBeUndefined();
});

test("backend bulk process", async () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string,
    baz: types.string,
  });
  const o = M.create({ foo: "FOO", bar: "BAR", baz: "BAZ" });
  const myProcess = async (
    node: Instance<typeof M>,
    path: string,
    liveOnly: boolean,
    paths?: string[]
  ) => {
    if (paths == null || paths.length === 0) {
      return {
        updates: [],
        errorValidations: [
          { id: "alpha", messages: [{ path, message: "error" }] },
        ],
        warningValidations: [],
      };
    }
    const messages = paths?.map((path) => {
      return { path, message: "error" };
    });
    return {
      updates: [],
      errorValidations: [{ id: "beta", messages }],
      warningValidations: [],
    };
  };
  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string),
    baz: new Field(converters.string),
  });
  const state = form.state(o, {
    backend: {
      process: myProcess,
      debounce,
      bulkProcess: true,
    },
  });

  const fooField = state.field("foo");
  const barField = state.field("bar");
  const bazField = state.field("baz");
  fooField.setRaw("FOO!");
  barField.setRaw("BAR!");
  bazField.setRaw("BAZ!");

  jest.runAllTimers();

  await state.processPromise;
  expect(fooField.error).toEqual("error");
  expect(barField.error).toEqual("error");
  expect(bazField.error).toEqual("error");
});
