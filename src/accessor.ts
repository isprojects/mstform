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
import { GroupAccessor } from "./group-accessor";
import { ISubFormAccessor, IRepeatingFormAccessor } from "./interfaces";

export type FieldAccess<
  D extends FormDefinition<any>,
  K extends keyof D
> = FieldAccessor<RawType<D[K]>, ValueType<D[K]>>;

export type RepeatingFormAccess<
  D extends FormDefinition<any>,
  K extends keyof D
> = IRepeatingFormAccessor<
  RepeatingFormDefinitionType<D[K]>,
  RepeatingFormGroupDefinitionType<D[K]>
>;

export type SubFormAccess<
  D extends FormDefinition<any>,
  K extends keyof D
> = ISubFormAccessor<
  SubFormDefinitionType<D[K]>,
  SubFormGroupDefinitionType<D[K]>
>;

export type GroupAccess<D extends FormDefinition<any>> = GroupAccessor<D>;
