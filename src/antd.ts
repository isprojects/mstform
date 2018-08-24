import { FieldAccessor } from "./accessor";

export function validationProps(
  accessor: FieldAccessor<any, any, any>
): object {
  const error = accessor.error;
  const isValidating = accessor.isValidating;
  if (!error) {
    return { validateStatus: isValidating ? "validating" : "" };
  }
  return {
    validateStatus: isValidating ? "validating" : "error",
    help: error
  };
}
