import { FieldAccessor } from "./field-accessor";

export interface ValidationProps {
  (accessor: FieldAccessor<any, any>): object;
}

export let currentValidationProps: ValidationProps = () => {
  return {};
};

export function setupValidationProps(validationProps: ValidationProps) {
  currentValidationProps = validationProps;
}
