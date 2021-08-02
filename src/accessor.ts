import { IAnyModelType, Instance } from "mobx-state-tree";

import {
  FormDefinition,
  RepeatingFormDefinitionType,
  RepeatingFormGroupDefinitionType,
  SubFormDefinitionType,
  SubFormGroupDefinitionType,
  RawType,
  ValueType,
  ArrayEntryType,
} from "./form";
import { FieldAccessor } from "./field-accessor";
import { GroupAccessor } from "./group-accessor";
import { ISubFormAccessor, IRepeatingFormAccessor } from "./interfaces";

export type FieldAccess<
  D extends FormDefinition<any>,
  K extends keyof D
> = FieldAccessor<RawType<D[K]>, ValueType<D[K]>>;

export type RepeatingFormAccess<
  D extends FormDefinition<M>,
  K extends keyof D,
  M extends IAnyModelType
> = IRepeatingFormAccessor<
  RepeatingFormDefinitionType<D[K]>,
  RepeatingFormGroupDefinitionType<D[K]>,
  ArrayEntryType<Instance<M>[K]>
>;

export type SubFormAccess<
  D extends FormDefinition<M>,
  K extends keyof D,
  M extends IAnyModelType
> = ISubFormAccessor<
  SubFormDefinitionType<D[K]>,
  SubFormGroupDefinitionType<D[K]>,
  Instance<M>[K]
>;

export type GroupAccess<D extends FormDefinition<any>> = GroupAccessor<D>;
