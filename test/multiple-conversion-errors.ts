import { configure, autorun } from "mobx";
import {
  getSnapshot,
  types,
  applySnapshot,
  onPatch,
  Instance
} from "mobx-state-tree";
import { Converter, Field, Form, RepeatingForm, converters } from "../src";

// "always" leads to trouble during initialization.
configure({ enforceActions: "observed" });

// test("conversion failure with multiple messages", async () => {
//   const M = types.model("M", {
//     foo: types.string
//   });

//   const form = new Form(M, {
//     foo: new Field(
//       converters.decimal({
//         allowNegative: false,
//         decimalPlaces: 4,
//         maxWholeDigits: 4
//       }),
//       {
//         conversionError: {
//           notANumber: "Not a number",
//           tooManyDecimalPlaces: "Too many decimal places",
//           tooManyWholeDigits: "Too many whole digits",
//           cannotBeNegative: "Cannot be negative"
//         }
//       }
//     )
//   });

//   const o = M.create({ foo: "3.14" });

//   const state = form.state(o, {
//     converterOptions: {
//       decimalSeparator: ",",
//       thousandSeparator: ".",
//       renderThousands: true
//     }
//   });

//   const field = state.field("foo");

//   await field.setRaw("-44");
//   expect(field.error).toEqual("Cannot be negative");

//   await field.setRaw("1.12345");
//   expect(field.error).toEqual("Too many decimal places");

//   await field.setRaw("12345.1");
//   expect(field.error).toEqual("Too many whole digits");

//   await field.setRaw("123ab");
//   expect(field.error).toEqual("Not a number");
// });
