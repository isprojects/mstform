import {
  action,
  observable,
  computed,
  isObservable,
  toJS,
  reaction,
  comparer,
  IReactionDisposer
} from "mobx";
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

export type Accessor =
  | FormAccessor<any, any>
  | FieldAccessor<any, any, any>
  | RepeatingFormAccessor<any, any>
  | RepeatingFormIndexedAccessor<any, any>
  | SubFormAccessor<any, any>;

export type FieldAccess<
  M,
  D extends FormDefinition<M>,
  K extends keyof M
> = FieldAccessor<M, RawType<D[K]>, M[K]>;

export type RepeatingFormAccess<
  M,
  D extends FormDefinition<M>,
  K extends keyof M
> = RepeatingFormAccessor<
  ArrayEntryType<M[K]>,
  RepeatingFormDefinitionType<D[K]>
>;

export type SubFormAccess<
  M,
  D extends FormDefinition<M>,
  K extends keyof M
> = SubFormAccessor<M[K], SubFormDefinitionType<D[K]>>;
