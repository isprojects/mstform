import {
  FormDefinition,
  RepeatingFormDefinitionType,
  RepeatingFormGroupDefinitionType,
  SubFormDefinitionType,
  SubFormGroupDefinitionType,
  RawType,
  ValueType
} from "./form";
import { FieldAccessor } from "./field-accessor";
import { RepeatingFormAccessor } from "./repeating-form-accessor";
import { SubFormAccessor } from "./sub-form-accessor";
import { GroupAccessor } from "./group-accessor";

export type FieldAccess<
  D extends FormDefinition<any>,
  K extends keyof D
> = FieldAccessor<RawType<D[K]>, ValueType<D[K]>>;

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

export type GroupAccess<D extends FormDefinition<any>> = GroupAccessor<D>;
