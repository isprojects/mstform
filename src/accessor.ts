import {
  ArrayEntryType,
  FormDefinition,
  RepeatingFormDefinitionType,
  SubFormDefinitionType,
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
  | FormAccessor<any, any, any>
  | FieldAccessor<any, any, any>
  | RepeatingFormAccessor<any, any, any>
  | RepeatingFormIndexedAccessor<any, any, any>
  | SubFormAccessor<any, any, any>;

export type FieldAccess<
  M,
  D extends FormDefinition<M>,
  K extends keyof D
> = FieldAccessor<M, RawType<D[K]>, D[K]>;

export type RepeatingFormAccess<
  M,
  D extends FormDefinition<M>,
  K extends keyof D
> = RepeatingFormAccessor<
  ArrayEntryType<D[K]>,
  RepeatingFormDefinitionType<D[K]>,
  any
>;

export type SubFormAccess<
  M,
  D extends FormDefinition<M>,
  K extends keyof D
> = SubFormAccessor<D[K], SubFormDefinitionType<D[K]>, any>;

export type GroupAccess<M, D extends FormDefinition<M>> = GroupAccessor<M, D>;
