import { FieldAccessor } from "./field-accessor";

export interface ValidationProps {
  (accessor: FieldAccessor<any, any>): Record<string, unknown>;
}

export let currentValidationProps: ValidationProps = () => {
  return {};
};

export function setupValidationProps(validationProps: ValidationProps) {
  currentValidationProps = validationProps;
}
