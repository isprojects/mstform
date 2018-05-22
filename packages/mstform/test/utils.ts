import { removePath } from "../src/utils";

test("removePath middle", () => {
  const m = new Map();
  m.set("/a/bar", "X");
  m.set("/a/0/foo", "A");
  m.set("/a/1/foo", "B");
  m.set("/a/2/foo", "C");

  const edited = removePath(m, "/a/1");

  expect(edited).toEqual(
    new Map([["/a/0/foo", "A"], ["/a/1/foo", "C"], ["/a/bar", "X"]])
  );
});

test("removePath start", () => {
  const m = new Map();
  m.set("/a/bar", "X");
  m.set("/a/0/foo", "A");
  m.set("/a/1/foo", "B");
  m.set("/a/2/foo", "C");

  const edited = removePath(m, "/a/0");

  expect(edited).toEqual(
    new Map([["/a/0/foo", "B"], ["/a/1/foo", "C"], ["/a/bar", "X"]])
  );
});

test("removePath end", () => {
  const m = new Map();
  m.set("/a/bar", "X");
  m.set("/a/0/foo", "A");
  m.set("/a/1/foo", "B");
  m.set("/a/2/foo", "C");

  const edited = removePath(m, "/a/2");

  expect(edited).toEqual(
    new Map([["/a/0/foo", "A"], ["/a/1/foo", "B"], ["/a/bar", "X"]])
  );
});

test("removePath unrelated", () => {
  const m = new Map();
  m.set("/foo", "X");
  m.set("/a/0/foo", "A");
  m.set("/a/1/foo", "B");
  m.set("/a/2/foo", "C");

  const edited = removePath(m, "/a/1");

  expect(edited).toEqual(
    new Map([["/a/0/foo", "A"], ["/a/1/foo", "C"], ["/foo", "X"]])
  );
});
