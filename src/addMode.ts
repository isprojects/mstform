import { FormAccessor } from "./form-accessor";
import { FieldAccessor } from "./field-accessor";

export function setAddModeDefaults(
  baseAccessor: FormAccessor<any, any>,
  addModeDefaults: string[]
) {
  const fieldrefSet = new Set<string>();
  const fieldrefPrefix =
    baseAccessor.fieldref !== "" ? baseAccessor.fieldref + "." : "";

  addModeDefaults.forEach(fieldref => {
    fieldrefSet.add(fieldrefPrefix + fieldref);
  });
  baseAccessor.accessors.forEach(accessor => {
    if (accessor instanceof FieldAccessor) {
      if (fieldrefSet.has(accessor.fieldref)) {
        if (accessor.field.derivedFunc == null) {
          accessor.setRawFromValue();
        } else {
          accessor.setValueAndRawWithoutChangeEvent(
            accessor.field.derivedFunc(accessor.node)
          );
        }
      }
    }
  });
}
