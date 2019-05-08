import { configure } from "mobx";
import { types } from "mobx-state-tree";
import { FormProcessor } from "../src";
import { debounce } from "./utils";

jest.useFakeTimers();

// "always" leads to trouble during initialization.
configure({ enforceActions: "observed" });

test("form processor has error messages", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  const o = M.create({ foo: "FOO" });
  const p = new FormProcessor(
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

test("form processor two requests are synced", async () => {
  const M = types.model("M", {
    foo: types.string
  });

  // set up a resolve function to resolve
  // use a dummy resolve function to please ts
  let resolveA: () => void = () => {
    /* nothing */
  };

  // keep a reference to the real resolve function
  const finishA = new Promise((resolve, reject) => {
    resolveA = resolve;
  });

  const o = M.create({ foo: "FOO" });
  const requests: string[] = [];
  const p = new FormProcessor(
    o,
    async (json: any, path: string) => {
      // if the 'a' path is passed, we await a promise
      // This way we can test a long-duration promise and that
      // the code ensures the next call to run is only executed after the
      // first is resolved.
      if (path === "a") {
        await finishA;
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
  resolveA();

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

  // set up a resolve function to resolve
  // use a dummy resolve function to please ts
  let resolveA: () => void = () => {
    /* nothing */
  };
  let resolveB: () => void = () => {
    /* nothing */
  };

  // keep a reference to the real resolve function
  const finishA = new Promise((resolve, reject) => {
    resolveA = resolve;
  });
  const finishB = new Promise((resolve, reject) => {
    resolveB = resolve;
  });

  const o = M.create({ foo: "FOO" });
  const requests: string[] = [];
  const p = new FormProcessor(
    o,
    async (json: any, path: string) => {
      // if the 'a' path is passed, we await a promise
      // This way we can test a long-duration promise and that
      // the code ensures the next call to run is only executed after the
      // first is resolved.
      if (path === "a") {
        await finishA;
      }
      if (path === "b") {
        await finishB;
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
  resolveB();
  // we resolve 'a'
  resolveA();

  await p.isFinished();
  // these should both be called, in that order
  expect(requests).toEqual(["a", "b", "c"]);
  // and we expect the error message to be set
  expect(p.getError("a")).toEqual("error c");
});
