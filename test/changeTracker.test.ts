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

  // the problem is that each process path is currently a separate series of
  // requests. but once requests is processing and held up, we can
  // accumulate requests of different paths
  tracker.change("a");
  tracker.change("a");
  tracker.change("b");
  jest.runAllTimers();

  await tracker.isFinished();

  expect(processed).toEqual(["a", "b"]);
});
