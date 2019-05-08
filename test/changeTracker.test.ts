import { ChangeTracker } from "../src/changeTracker";

jest.useFakeTimers();

function mydebounce(f: any, delay: number) {
  let timeout: any = null;
  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(f, delay);
  };
}

test("simple change tracker", async () => {
  const processed: string[] = [];
  const tracker = new ChangeTracker(
    async (path: string) => {
      return processed.push(path);
    },
    { debounce: mydebounce }
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
    { debounce: mydebounce }
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

function until() {
  let resolveResult: () => void = () => {
    /* nothing */
  };
  const finished = new Promise((resolve, reject) => {
    resolveResult = resolve;
  });
  return { resolve: resolveResult, finished };
}

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
    { debounce: mydebounce }
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

  // we resolve a
  untilA.resolve();

  // we ensure that the process promise only resolves when we want it
  await tracker.isFinished();

  expect(processed).toEqual(["a", "b", "c"]);
});
