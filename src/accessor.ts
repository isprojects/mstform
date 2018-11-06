import {
  FormDefinition,
  RepeatingFormDefinitionType,
  RepeatingFormGroupDefinitionType,
  SubFormDefinitionType,
  SubFormGroupDefinitionType,
  RawType
} from "./form";
import { FieldAccessor } from "./field-accessor";
import { FormAccessor } from "./form-accessor";
import { RepeatingFormAccessor } from "./repeating-form-accessor";
import { RepeatingFormIndexedAccessor } from "./repeating-form-indexed-accessor";
import { SubFormAccessor } from "./sub-form-accessor";
import { GroupAccessor } from "./group-accessor";

// group access is deliberately not in Accessor
// as we never need to walk the group accessors to see
// whether a form is valid
export type Accessor =
  | FormAccessor<any, any>
  | FieldAccessor<any, any>
  | RepeatingFormAccessor<any, any>
  | RepeatingFormIndexedAccessor<any, any>
  | SubFormAccessor<any, any>;

export type FieldAccess<
  D extends FormDefinition<any>,
  K extends keyof D
> = FieldAccessor<RawType<D[K]>, D[K]>;

export type RepeatingFormAccess<
  D extends FormDefinition<any>,
  K extends keyof D
> = RepeatingFormAccessor<
  RepeatingFormDefinitionType<D[K]>,
  RepeatingFormGroupDefinitionType<D[K]>
>;

export type SubFormAccess<
  D extends FormDefinition<any>,
  K extends keyof D
> = SubFormAccessor<
  SubFormDefinitionType<D[K]>,
  SubFormGroupDefinitionType<D[K]>
>;

export type GroupAccess<M, D extends FormDefinition<M>> = GroupAccessor<M, D>;
