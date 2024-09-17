import { configure } from "mobx";
import { Instance, types } from "mobx-state-tree";
import {
  Field,
  Form,
  RepeatingForm,
  RepeatingFormAccessor,
  RepeatingFormIndexedAccessor,
  converters,
  FieldAccessor,
  Group,
  IAccessor,
} from "../src";

configure({ enforceActions: "always" });

test("accessByPath simple field", () => {
  const M = types.model("M", {
    foo: types.number,
  });
  const form = new Form(M, {
    foo: new Field(converters.number),
  });

  const o = M.create({ foo: 3 });

  const state = form.state(o);
  const accessor = state.accessByPath("/foo");
  expect(accessor).toBeInstanceOf(FieldAccessor);
  if (!(accessor instanceof FieldAccessor)) {
    throw new Error("For the typechecker");
  }
  expect(accessor.value).toEqual(3);
});

test("accessByPath repeating form", () => {
  const N = types.model("N", {
    foo: types.number,
    bar: types.number, // no field
  });
  const M = types.model("M", {
    entries: types.array(N),
  });

  const form = new Form(M, {
    entries: new RepeatingForm({
      foo: new Field(converters.number),
    }),
  });

  const o = M.create({ entries: [{ foo: 3, bar: 4 }] });

  const state = form.state(o);
  const accessor = state.accessByPath("/entries/0/foo");
  expect(accessor).toBeInstanceOf(FieldAccessor);
  if (!(accessor instanceof FieldAccessor)) {
    throw new Error("For the typechecker");
  }
  expect(accessor.value).toEqual(3);

  expect(state.accessByPath("/entries/0/bar")).toBeUndefined();
});

test("acccessByPath which has no field", () => {
  const M = types.model("M", {
    foo: types.number,
    bar: types.number,
  });
  // bar is not specified as a field
  const form = new Form(M, {
    foo: new Field(converters.number),
  });

  const o = M.create({ foo: 3, bar: 4 });

  const state = form.state(o);
  const accessor = state.accessByPath("/bar");
  expect(accessor).toBeUndefined();
});

test("groups with repeatingform error on top-level", async () => {
  const N = types.model("N", {
    bar: types.string,
  });
  const M = types.model("M", {
    foo: types.array(N),
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.string),
    }),
  });

  const o = M.create({ foo: [] });

  const state = form.state(o, {
    getError: (accessor: any) =>
      accessor instanceof RepeatingFormAccessor && accessor.length === 0
        ? "Cannot be empty"
        : undefined,
    getWarning: (accessor: any) =>
      accessor instanceof RepeatingFormAccessor
        ? "Some some reason this is insufficient"
        : undefined,
  });

  const repeatingForm = state.repeatingForm("foo");

  expect(repeatingForm.isValid).toBeFalsy();
  expect(repeatingForm.isWarningFree).toBeFalsy();
});

test("groups with indexed repeatingform error on top-level", async () => {
  const N = types.model("N", {
    bar: types.string,
  });
  const M = types.model("M", {
    foo: types.array(N),
  });

  const form = new Form(M, {
    foo: new RepeatingForm({
      bar: new Field(converters.string),
    }),
  });

  const o = M.create({ foo: [{ bar: "BAR" }] });

  const state = form.state(o, {
    getError: (accessor: any) =>
      accessor instanceof RepeatingFormIndexedAccessor
        ? "For some reason this is wrong"
        : undefined,
    getWarning: (accessor: any) =>
      accessor instanceof RepeatingFormIndexedAccessor
        ? "Some some reason this is insufficient"
        : undefined,
  });

  const repeatingForm = state.repeatingForm("foo");
  const indexedRepeatingForm = repeatingForm.index(0);

  expect(indexedRepeatingForm.isValid).toBeFalsy();
  expect(indexedRepeatingForm.isWarningFree).toBeFalsy();
});

test("flatAccessors should return correct accessors", () => {
  // Define Line3 model (deepest level)
  const Line3 = types.model("Line3", {
    value: types.string, // Line3 value
  });
  // Define Line2 model (middle level, contains Line3)
  const Line2 = types
    .model("Line2", {
      value: types.string, // Line2 value
      lines: types.array(Line3), // Each Line2 contains an array of Line3
    })
    .actions((self) => ({
      addLine(line: Instance<typeof Line3>) {
        self.lines.push(line);
      },
    }));

  // Define Line1 model (top level of lines, contains Line2)
  const Line1 = types
    .model("Line1", {
      value: types.string, // Line1 value
      lines: types.array(Line2), // Each Line1 contains an array of Line2
    })
    .actions((self) => ({
      addLine(line: Instance<typeof Line2>) {
        self.lines.push(line);
      },
    }));

  // Define the Bar model (contains Line1)
  const Bar = types
    .model("Bar", {
      lines: types.array(Line1), // Each Bar contains an array of Line1
    })
    .actions((self) => ({
      addLines() {
        // Adding 100 Line1 elements, each containing 100 Line2 elements, each containing 10 Line3 elements
        for (let i = 0; i < 100; i++) {
          const line1 = Line1.create({
            value: `Line1 #${i}`,
            lines: [],
          });

          for (let j = 0; j < 10; j++) {
            const line2 = Line2.create({
              value: `Line2 #${j}`,
              lines: [],
            });

            for (let k = 0; k < 1; k++) {
              const line3 = Line3.create({
                value: `Line3 #${k}`,
              });
              line2.addLine(line3); // Add 1 Line3 instances to Line2
            }

            line1.addLine(line2); // Add 10 Line2 instances to Line1
          }

          self.lines.push(line1); // Add 100 Line1 instances to Bar
        }
      },
    }));

  const barForm = new Form(Bar, {
    lines: new RepeatingForm({
      value: new Field(converters.string),
      lines: new RepeatingForm({
        value: new Field(converters.string),
        lines: new RepeatingForm({
          value: new Field(converters.string),
        }),
      }),
    }),
  });
  const barObj = Bar.create();
  const state = barForm.state(barObj);
  // we add lines 100 x 10 x 1
  barObj.addLines();

  // this was how the old flatAccessor method worked
  const flatAccessorOldFunc = () => {
    const result: IAccessor[] = [];
    state.accessors.forEach((accessor) => {
      result.push(...accessor.flatAccessors);
      result.push(accessor);
    });
    return result;
  };

  const accessorsOld = flatAccessorOldFunc();
  const accessorsNew = state.flatAccessors;

  // now we make sure that the length is the same and it contains the same values
  expect(accessorsOld.length === accessorsNew.length).toBeTruthy();
  for (const accessorOld of accessorsOld) {
    expect(accessorsNew.includes(accessorOld)).toBeTruthy();
  }
});
