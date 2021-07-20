import { ChangeTracker } from "../src/changeTracker";
import { debounce, until } from "./utils";

jest.useFakeTimers();

test("simple change tracker", async () => {
  const processed: string[] = [];
  const tracker = new ChangeTracker(
    async (path: string) => {
      return processed.push(path);
    },
    { debounce }
  );

  tracker.change("a");
  tracker.change("a");

  jest.runAllTimers();

  await tracker.isFinished();

  expect(processed).toEqual(["a"]);
});

test("multiple paths", async () => {
  const processed: string[] = [];
  const tracker = new ChangeTracker(
    async (path: string) => {
      return processed.push(path);
    },
    { debounce }
  );

  // here we just generate a bunch of change events, but these aren't
  // handled by a single list of requests as nothing is held up
  tracker.change("a");
  tracker.change("a");
  tracker.change("b");
  jest.runAllTimers();

  await tracker.isFinished();

  expect(processed).toEqual(["a", "b"]);
});

test("multiple paths with delay", async () => {
  const processed: string[] = [];

  const untilA = until();

  const tracker = new ChangeTracker(
    async (path: string) => {
      if (path === "a") {
        await untilA.finished;
      }
      return processed.push(path);
    },
    { debounce }
  );

  // here we generate an a event
  tracker.change("a");
  jest.runAllTimers();

  // now we generate more events, meanwhile waiting for a to resolve
  tracker.change("b");
  tracker.change("c");
  jest.runAllTimers();
  // these are saved in the requests
  expect(tracker.requests).toEqual(["b", "c"]);

  // we finally resolve processing a
  // this sould result in b and c being processed afterwards
  untilA.resolve();

  await tracker.isFinished();

  expect(processed).toEqual(["a", "b", "c"]);
});

test("same path with delay", async () => {
  const processed: string[] = [];
  const untilA = until();

  const tracker = new ChangeTracker(
    async (path: string) => {
      if (path === "a") {
        await untilA.finished;
      }
      return processed.push(path);
    },
    { debounce }
  );

  tracker.change("a");
  jest.runAllTimers();

  tracker.change("a");
  jest.runAllTimers();
  expect(tracker.requests).toEqual(["a"]);

  // now resolve things
  untilA.resolve();

  // now we wait until everything is resolved
  await tracker.isFinished();

  expect(processed).toEqual(["a", "a"]);
});

test("hasChanged", async () => {
  const processed: string[] = [];
  const tracker = new ChangeTracker(
    async (path: string) => {
      return processed.push(path);
    },
    { debounce }
  );

  tracker.change("a");
  expect(tracker.hasChanged("a")).toBeTruthy();

  jest.runAllTimers();
  expect(tracker.hasChanged("a")).toBeFalsy();

  await tracker.isFinished();
  expect(tracker.hasChanged("a")).toBeFalsy();

  expect(processed).toEqual(["a"]);
});

test("hasChanged with delay in processing", async () => {
  const processed: string[] = [];
  const untilA = until();

  const tracker = new ChangeTracker(
    async (path: string) => {
      if (path === "a") {
        await untilA.finished;
      }
      return processed.push(path);
    },
    { debounce }
  );

  tracker.change("a");
  // we immediately track the item as modified
  expect(tracker.hasChanged("a")).toBeTruthy();
  jest.runAllTimers();
  // it's already sent to process
  expect(tracker.hasChanged("a")).toBeFalsy();

  tracker.change("a");
  // we track the item as modified again
  expect(tracker.hasChanged("a")).toBeTruthy();
  jest.runAllTimers();
  // even after the timers have run, this item hasn't been
  // processed yet
  expect(tracker.requests).toEqual(["a"]);
  expect(tracker.hasChanged("a")).toBeTruthy();

  // now resolve things
  untilA.resolve();
  // but a is still changed, as not yet handled itself
  // the second time
  expect(tracker.hasChanged("a")).toBeTruthy();

  // now we wait until everything is resolved
  await tracker.isFinished();

  // a isn't changed anymore
  expect(tracker.hasChanged("a")).toBeFalsy();

  expect(processed).toEqual(["a", "a"]);
});
