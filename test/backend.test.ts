import { configure } from "mobx";
import { types, Instance } from "mobx-state-tree";
import { Backend, Form, Field, RepeatingForm, converters } from "../src";
import { debounce, until } from "./utils";

jest.useFakeTimers();

// "always" leads to trouble during initialization.
configure({ enforceActions: "observed" });

test("backend process has error messages", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const o = M.create({ foo: "FOO" });
  const p = new Backend<typeof M>(
    o,
    undefined,
    async (node: Instance<typeof M>, path: string) => {
      return {
        updates: [],
        errorValidations: [
          { id: "alpha", messages: [{ path: "a", message: "error" }] }
        ],
        warningValidations: []
      };
    },
    undefined,
    { debounce }
  );

  await p.run("a");
  jest.runAllTimers();

  await p.isFinished();

  expect(p.getError("a")).toEqual("error");
});

test("backend process wipes out error messages", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const o = M.create({ foo: "FOO" });
  let called = false;

  // the idea is that the form processor only returns errors related
  // to the field that was just touched under an id. if that id is wiped out,
  // those errors are removed. but other error structures (like for 'beta' here)
  // are not affected and remain
  const p = new Backend<typeof M>(
    o,
    undefined,
    async (node: Instance<typeof M>, path: string) => {
      if (!called) {
        called = true;
        return {
          updates: [],
          errorValidations: [
            {
              id: "alpha",
              messages: [{ path: "a", message: "error a" }]
            },
            {
              id: "beta",
              messages: [{ path: "b", message: "error b" }]
            }
          ],
          warningValidations: []
        };
      } else {
        return {
          updates: [],
          errorValidations: [{ id: "alpha", messages: [] }],
          warningValidations: []
        };
      }
    },
    undefined,
    { debounce }
  );

  await p.run("a");
  jest.runAllTimers();

  await p.isFinished();

  expect(p.getError("a")).toEqual("error a");
  expect(p.getError("b")).toEqual("error b");

  await p.run("a");
  jest.runAllTimers();
  await p.isFinished();
  expect(p.getError("a")).toBeUndefined();
  expect(p.getError("b")).toEqual("error b");
});

test("backend process two requests are synced", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const untilA = until();

  const o = M.create({ foo: "FOO" });
  const requests: string[] = [];
  const p = new Backend<typeof M>(
    o,
    undefined,
    async (node: Instance<typeof M>, path: string) => {
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
        errorValidations: [
          { id: "alpha", messages: [{ path: "a", message: `error ${path}` }] }
        ],
        warningValidations: []
      };
    },
    undefined,
    { debounce }
  );

  // we run for 'a', it halts until we call resolveA
  p.run("a");
  // we now run 'b', which should only run once 'a' is resolved
  p.run("b");

  jest.runAllTimers();

  // we resolve 'a'
  untilA.resolve();

  await p.isFinished();
  // these should both be called, in that order
  expect(requests).toEqual(["a", "b"]);
  // and we expect the error message to be set
  expect(p.getError("a")).toEqual("error b");
});

test("backend process three requests are synced", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const untilA = until();
  const untilB = until();

  const o = M.create({ foo: "FOO" });
  const requests: string[] = [];
  const p = new Backend<typeof M>(
    o,
    undefined,
    async (node: Instance<typeof M>, path: string) => {
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
        errorValidations: [
          { id: "alpha", messages: [{ path: "a", message: `error ${path}` }] }
        ],
        warningValidations: []
      };
    },
    undefined,
    { debounce }
  );

  // we run for 'a', it halts until we call resolveA
  p.run("a");
  // we now run 'b', which should only run once 'b' is resolved
  p.run("b");
  // and 'c' which should only run once 'b' is resolved
  p.run("c");
  jest.runAllTimers();
  // we resolve 'b'
  untilB.resolve();
  // we resolve 'a'
  untilA.resolve();

  await p.isFinished();
  // these should all be called, in the right order
  expect(requests).toEqual(["a", "b", "c"]);
  // and we expect the error message to be set
  expect(p.getError("a")).toEqual("error c");
});

test("backend process does update", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const o = M.create({ foo: "FOO" });
  const p = new Backend<typeof M>(
    o,
    undefined,
    async (node: Instance<typeof M>, path: string) => {
      return {
        updates: [{ path: "foo", value: "BAR" }],
        errorValidations: [],
        warningValidations: []
      };
    },
    undefined,
    { debounce }
  );

  await p.run("a");
  jest.runAllTimers();

  await p.isFinished();

  expect(o.foo).toEqual("BAR");
});

test("backend process ignores update if path re-modified during processing", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const o = M.create({ foo: "FOO" });
  let called = false;
  const p = new Backend<typeof M>(
    o,
    undefined,
    async (node: Instance<typeof M>, path: string) => {
      // we ensure that only the first time we call this we
      // try to update foo
      if (!called) {
        called = true;
        return {
          updates: [{ path: "foo", value: "BAR" }],
          errorValidations: [],
          warningValidations: []
        };
      } else {
        return {
          updates: [],
          errorValidations: [],
          warningValidations: []
        };
      }
    },
    undefined,
    { debounce }
  );

  await p.run("a");
  jest.runAllTimers();
  // we change things while we are processing
  // user input should never be overridden by the backend,
  // even if timers haven't yet run
  await p.run("foo");

  await p.isFinished();

  // since only the first change tried to update, and the second change
  // isn't even triggered yet (and doesn't update anyhow), the value should
  // be unchanged
  expect(o.foo).toEqual("FOO");
});

test("backend process stops ignoring update", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const o = M.create({ foo: "FOO" });
  let called = false;
  const p = new Backend<typeof M>(
    o,
    undefined,
    async (node: Instance<typeof M>, path: string) => {
      // we ensure that only the first time we call this we
      // try to update foo
      if (!called) {
        called = true;
        return {
          updates: [{ path: "foo", value: "BAR" }],
          errorValidations: [],
          warningValidations: []
        };
      } else {
        return {
          updates: [{ path: "foo", value: "BAR AGAIN" }],
          errorValidations: [],
          warningValidations: []
        };
      }
    },
    undefined,
    { debounce }
  );

  await p.run("a");
  jest.runAllTimers();
  // we change things while we are processing
  // user input should never be overridden by the backend,
  // even if timers haven't yet run
  await p.run("foo");

  await p.isFinished();

  // since only the first change tried to update, and the second change
  // isn't even triggered yet, the value should
  // be unchanged
  expect(o.foo).toEqual("FOO");

  // process the second change now, see it take effect
  jest.runAllTimers();
  await p.isFinished();
  expect(o.foo).toEqual("BAR AGAIN");
});

test("configuration with state", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string)
  });

  const o = M.create({ foo: "FOO" });

  async function myProcess(node: Instance<typeof M>, path: string) {
    return {
      updates: [],
      errorValidations: [
        { id: "alpha", messages: [{ path: "/foo", message: "error!" }] }
      ],
      warningValidations: []
    };
  }

  const state = form.state(o, {
    backend: {
      process: myProcess,
      debounce: debounce
    }
  });

  const field = state.field("foo");
  field.setRaw("BAR");

  jest.runAllTimers();

  await state.processPromise;

  expect(field.error).toEqual("error!");
});

test("configuration other getError", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string)
  });

  const o = M.create({ foo: "FOO" });

  async function myProcess(node: Instance<typeof M>, path: string) {
    return {
      updates: [],
      errorValidations: [
        { id: "alpha", messages: [{ path: "/foo", message: "error!" }] }
      ],
      warningValidations: []
    };
  }

  const state = form.state(o, {
    backend: {
      process: myProcess,
      debounce: debounce
    },
    getError() {
      return "override";
    }
  });

  const field = state.field("foo");
  field.setRaw("BAR");

  jest.runAllTimers();

  await state.processPromise;

  expect(field.error).toEqual("override");
});

test("update", async () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string)
  });

  const o = M.create({ foo: "FOO", bar: "unchanged" });

  async function myProcess(node: Instance<typeof M>, path: string) {
    return {
      updates: [{ path: "bar", value: "BAR" }],
      errorValidations: [],
      warningValidations: []
    };
  }

  const state = form.state(o, {
    backend: {
      process: myProcess,
      debounce: debounce
    }
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
    foo: types.string
  });

  const fakeError = jest.fn();

  console.error = fakeError;

  const o = M.create({ foo: "FOO" });
  const requests: string[] = [];

  let crashy = true;

  const p = new Backend<typeof M>(
    o,
    undefined,
    async (node: Instance<typeof M>, path: string) => {
      requests.push(path);
      if (crashy) {
        crashy = false; // crash only the first time
        throw new Error("We crash out");
      }

      return {
        updates: [],
        errorValidations: [
          { id: "alpha", messages: [{ path: "a", message: `error ${path}` }] }
        ],
        warningValidations: []
      };
    },
    undefined,
    { debounce }
  );

  // we run for 'a', it crashes
  p.run("a");

  // we now run 'b', should succeed with a message
  p.run("b");

  jest.runAllTimers();

  await p.isFinished();

  expect(crashy).toBeFalsy();
  expect(fakeError.mock.calls.length).toEqual(1);

  // these should both be called, in that order
  expect(requests).toEqual(["a", "b"]);
  // and we expect the error message to be set
  expect(p.getError("a")).toEqual("error b");
});

test("backend process all", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const o = M.create({ foo: "FOO" });
  const p = new Backend<typeof M>(
    o,
    undefined,
    undefined,
    async (node: Instance<typeof M>) => {
      return {
        updates: [],
        errorValidations: [
          { id: "alpha", messages: [{ path: "a", message: "error" }] }
        ],
        warningValidations: []
      };
    },
    { debounce }
  );

  await p.realProcessAll();

  expect(p.getError("a")).toEqual("error");
});

test("process all configuration with state", async () => {
  const M = types.model("M", {
    foo: types.string,
    bar: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string),
    bar: new Field(converters.string)
  });

  const o = M.create({ foo: "FOO", bar: "BAR" });

  let setting = "a";
  async function myProcessAll(node: Instance<typeof M>) {
    if (setting === "a") {
      return {
        updates: [],
        errorValidations: [
          { id: "alpha", messages: [{ path: "/foo", message: "foo error!" }] }
        ],
        warningValidations: []
      };
    } else if (setting === "b") {
      return {
        updates: [],
        errorValidations: [
          { id: "beta", messages: [{ path: "/bar", message: "bar error!" }] }
        ],
        warningValidations: []
      };
    } else {
      return {};
    }
  }

  const state = form.state(o, {
    backend: {
      debounce: debounce,
      processAll: myProcessAll
    }
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
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string)
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
      errorValidations: [],
      warningValidations: []
    };
  }

  async function mySave(node: Instance<typeof M>) {
    return null;
  }

  const state = form.state(o, {
    backend: {
      process: myProcess,
      save: mySave,
      debounce: debounce
    }
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
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string)
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
      errorValidations: [],
      warningValidations: []
    };
  }

  async function mySave(node: Instance<typeof M>) {
    // this counts as an unsuccessful save
    return {
      updates: [],
      errorValidations: [],
      warningValidations: []
    };
  }

  const state = form.state(o, {
    backend: {
      process: myProcess,
      save: mySave,
      debounce: debounce
    }
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
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string)
  });

  const o = M.create({ foo: "FOO" });

  const liveSeen: boolean[] = [];

  async function myProcessAll(node: Instance<typeof M>, liveOnly: boolean) {
    liveSeen.push(liveOnly);
    return {
      updates: [],
      errorValidations: [],
      warningValidations: []
    };
  }

  async function mySave(node: Instance<typeof M>) {
    return null;
  }

  const state = form.state(o, {
    backend: {
      processAll: myProcessAll,
      save: mySave,
      debounce: debounce
    }
  });

  await state.processAll();
  expect(liveSeen).toEqual([true]);

  await state.save();

  await state.processAll();

  expect(liveSeen).toEqual([true, false]);
});

test("reset liveOnly status", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string)
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
      errorValidations: [],
      warningValidations: []
    };
  }

  async function mySave(node: Instance<typeof M>) {
    return null;
  }

  const state = form.state(o, {
    backend: {
      process: myProcess,
      save: mySave,
      debounce: debounce
    }
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
    bar: types.string
  });

  const M = types.model("M", {
    foo: types.array(N)
  });

  const myProcess = async (node: Instance<typeof M>, path: string) => {
    return {
      updates: [],
      errorValidations: [
        { id: "alpha", messages: [{ path: "/foo/0/bar", message: "error" }] }
      ],
      warningValidations: []
    };
  };

  const o = M.create({ foo: [{ bar: "FOO" }] });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.string)
    })
  });

  const state = form.state(o, {
    backend: {
      process: myProcess,
      debounce: debounce
    }
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
