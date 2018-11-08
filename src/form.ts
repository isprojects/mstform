import { IObservableArray } from "mobx";
import {
  IModelType,
  IAnyModelType,
  ModelInstanceTypeProps,
  Instance
} from "mobx-state-tree";
import { CONVERSION_ERROR, IConverter } from "./converter";
import { FormState, FormStateOptions } from "./state";
import { Controlled } from "./controlled";
import { identity } from "./utils";

// XXX copied from MST as it doesn't export it
export type ExtractProps<T extends IAnyModelType> = T extends IModelType<
  infer P,
  any,
  any,
  any
>
  ? P
  : never;

export type ArrayEntryType<T> = T extends IObservableArray<infer A> ? A : never;

export type RawType<F> = F extends Field<infer R, any> ? R : never;

export type RepeatingFormDefinitionType<T> = T extends RepeatingForm<
  infer D,
  any
>
  ? D
  : never;

export type RepeatingFormGroupDefinitionType<T> = T extends RepeatingForm<
  any,
  infer G
>
  ? G
  : never;

export type SubFormDefinitionType<T> = T extends SubForm<infer D, any>
  ? D
  : never;

export type SubFormGroupDefinitionType<T> = T extends SubForm<any, infer G>
  ? G
  : never;

export type FormDefinitionEntry<M, K extends keyof M> =
  | Field<any, M[K]>
  | RepeatingForm<FormDefinition<ArrayEntryType<M[K]>>, GroupDefinition<any>>
  | SubForm<FormDefinition<M[K]>, GroupDefinition<any>>;

export type FormDefinition<M> = { [K in keyof M]?: FormDefinitionEntry<M, K> };

export type FormDefinitionForModel<P extends IAnyModelType> = FormDefinition<
  ModelInstanceTypeProps<ExtractProps<P>>
>;

export type ValidationResponse = string | null | undefined | false;

export interface Validator<V> {
  (value: V): ValidationResponse | Promise<ValidationResponse>;
}

export interface Derived<V> {
  (node: any): V;
}

export interface Change<V> {
  (node: any, value: V): void;
}

export interface RawGetter<R> {
  (...args: any[]): R;
}

export interface FieldOptions<R, V> {
  getRaw?(...args: any[]): R;
  rawValidators?: Validator<R>[];
  validators?: Validator<V>[];
  conversionError?: string;
  requiredError?: string;
  required?: boolean;
  fromEvent?: boolean;
  derived?: Derived<V>;
  change?: Change<V>;
  controlled?: Controlled;
}

export type GroupDefinition<D extends FormDefinition<any>> = {
  [key: string]: Group<D>;
};

export class Form<
  M extends IAnyModelType,
  D extends FormDefinitionForModel<M>,
  G extends GroupDefinition<D>
> {
  constructor(
    public model: M,
    public definition: D,
    public groupDefinition?: G
  ) {}

  get FormStateType(): FormState<M, D, G> {
    throw new Error("For introspection");
  }

  state(node: Instance<M>, options?: FormStateOptions<M>): FormState<M, D, G> {
    return new FormState(this, node, options);
  }
}

export class SubForm<
  D extends FormDefinition<any>,
  G extends GroupDefinition<D>
> {
  constructor(public definition: D, public groupDefinition?: G) {}
}

export class ValidationMessage {
  constructor(public message: string) {}
}

export class ProcessValue<V> {
  constructor(public value: V) {}
}

export type ProcessResponse<V> = ProcessValue<V> | ValidationMessage;

export interface ProcessOptions {
  ignoreRequired?: boolean;
}

export class Field<R, V> {
  rawValidators: Validator<R>[];
  validators: Validator<V>[];
  conversionError: string;
  requiredError: string;
  required: boolean;
  getRaw: RawGetter<R>;
  derivedFunc?: Derived<V>;
  changeFunc?: Change<V>;
  controlled: Controlled;

  constructor(
    public converter: IConverter<R, V>,
    public options?: FieldOptions<R, V>
  ) {
    if (!options) {
      this.rawValidators = [];
      this.validators = [];
      this.conversionError = "Could not convert";
      this.requiredError = "Required";
      this.required = false;
      this.getRaw = identity;
      this.controlled = this.createDefaultControlled();
    } else {
      this.rawValidators = options.rawValidators ? options.rawValidators : [];
      this.validators = options.validators ? options.validators : [];
      this.conversionError = options.conversionError || "Could not convert";
      this.requiredError = options.requiredError || "Required";
      this.required = options.required || false;
      if (options.fromEvent) {
        if (options.getRaw) {
          throw new Error(
            "Cannot have fromEvent and getRaw defined at same time"
          );
        }
        this.getRaw = ev => ev.target.value;
      } else {
        this.getRaw = options.getRaw || identity;
      }
      this.derivedFunc = options.derived;
      this.changeFunc = options.change;
      this.controlled = options.controlled || this.createDefaultControlled();
    }
  }

  createDefaultControlled(): Controlled {
    if (this.getRaw !== identity) {
      return accessor => {
        return {
          value: accessor.raw,
          onChange: (...args: any[]) => accessor.setRaw(this.getRaw(...args))
        };
      };
    }
    return this.converter.defaultControlled;
  }

  get RawType(): R {
    throw new Error("This is a function to enable type introspection");
  }

  get ValueType(): V {
    throw new Error("This is a function to enable type introspection");
  }

  async process(
    raw: R,
    required: boolean,
    options?: ProcessOptions
  ): Promise<ProcessResponse<V>> {
    raw = this.converter.preprocessRaw(raw);
    const ignoreRequired = options != null ? options.ignoreRequired : false;
    if (
      !this.converter.neverRequired &&
      !ignoreRequired &&
      raw === this.converter.emptyRaw &&
      required
    ) {
      return new ValidationMessage(this.requiredError);
    }

    for (const validator of this.rawValidators) {
      const validationResponse = await validator(raw);
      if (typeof validationResponse === "string" && validationResponse) {
        return new ValidationMessage(validationResponse);
      }
    }
    const result = await this.converter.convert(raw);
    if (result === CONVERSION_ERROR) {
      // if we get a conversion error for the empty raw, the field
      // is implied to be required
      if (raw === this.converter.emptyRaw) {
        return new ValidationMessage(this.requiredError);
      }
      return new ValidationMessage(this.conversionError);
    }
    for (const validator of this.validators) {
      const validationResponse = await validator(result.value);
      if (typeof validationResponse === "string" && validationResponse) {
        return new ValidationMessage(validationResponse);
      }
    }
    return new ProcessValue(result.value);
  }

  render(value: V): R {
    return this.converter.render(value);
  }
}

export class RepeatingForm<
  D extends FormDefinition<any>,
  G extends GroupDefinition<D>
> {
  constructor(public definition: D, public groupDefinition?: G) {}
}

export interface GroupOptions<D extends FormDefinition<any>> {
  include?: (keyof D)[];
  exclude?: (keyof D)[];
}

export class Group<D extends FormDefinition<any>> {
  constructor(public options: GroupOptions<D>) {}
}
