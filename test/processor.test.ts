import { configure } from "mobx";
import { types } from "mobx-state-tree";
import { Processor, Form, Field, converters } from "../src";
import { debounce, until } from "./utils";

jest.useFakeTimers();

// "always" leads to trouble during initialization.
configure({ enforceActions: "observed" });

test("form processor has error messages", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const o = M.create({ foo: "FOO" });
  const p = new Processor(
    o,
    async (json: any, path: string) => {
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

  await p.run("a");
  jest.runAllTimers();

  await p.isFinished();

  expect(p.getError("a")).toEqual("error");
});

test("form processor wipes out error messages", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const o = M.create({ foo: "FOO" });
  let called = false;

  // the idea is that the form processor only returns errors related
  // to the field that was just touched under an id. if that id is wiped out,
  // those errors are removed. but other error structures (like for 'beta' here)
  // are not affected and remain
  const p = new Processor(
    o,
    async (json: any, path: string) => {
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

test("form processor two requests are synced", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const untilA = until();

  const o = M.create({ foo: "FOO" });
  const requests: string[] = [];
  const p = new Processor(
    o,
    async (json: any, path: string) => {
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

test("form processor three requests are synced", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const untilA = until();
  const untilB = until();

  const o = M.create({ foo: "FOO" });
  const requests: string[] = [];
  const p = new Processor(
    o,
    async (json: any, path: string) => {
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

test("form processor does update", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const o = M.create({ foo: "FOO" });
  const p = new Processor(
    o,
    async (json: any, path: string) => {
      return {
        updates: [{ path: "foo", value: "BAR" }],
        errorValidations: [],
        warningValidations: []
      };
    },
    { debounce }
  );

  await p.run("a");
  jest.runAllTimers();

  await p.isFinished();

  expect(o.foo).toEqual("BAR");
});

test("form processor ignores update if path re-modified during processing", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const o = M.create({ foo: "FOO" });
  let called = false;
  const p = new Processor(
    o,
    async (json: any, path: string) => {
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

// write a test where I verify that I accept backend changes to a field
// again once ..when?

test("configuration with state", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const form = new Form(M, {
    foo: new Field(converters.string)
  });

  const o = M.create({ foo: "FOO" });

  async function myProcess(json: any, path: string) {
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

  async function myProcess(json: any, path: string) {
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

  async function myProcess(json: any, path: string) {
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
