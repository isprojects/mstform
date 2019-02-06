import {
  IMSTArray,
  IAnyModelType,
  ModelInstanceType,
  Instance
} from "mobx-state-tree";
import {
  CONVERSION_ERROR,
  IConverter,
  StateConverterOptionsWithContext
} from "./converter";
import { FormState, FormStateOptions } from "./state";
import { Controlled } from "./controlled";
import { identity, getNodeId } from "./utils";

export type ArrayEntryType<T> = T extends IMSTArray<infer A> ? A : never;

export type RawType<F> = F extends Field<infer R, any> ? R : never;

export type ValueType<F> = F extends Field<any, infer V> ? V : never;

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

export type FormDefinition<M extends IAnyModelType> = InstanceFormDefinition<
  Instance<M>
>;

export type InstanceFormDefinition<
  M extends ModelInstanceType<any, any, any, any>
> = {
  [K in keyof M]?:
    | Field<any, M[K]>
    | RepeatingForm<InstanceFormDefinition<ArrayEntryType<M[K]>>, any>
    | SubForm<FormDefinition<M[K]>, any>
};

export type ValidationResponse = string | null | undefined | false;

export interface Validator<V> {
  (value: V, context?: any): ValidationResponse | Promise<ValidationResponse>;
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

export interface ErrorFunc {
  (context: any): string;
}

export interface FieldOptions<R, V> {
  getRaw?(...args: any[]): R;
  rawValidators?: Validator<R>[];
  validators?: Validator<V>[];
  conversionError?: string | ErrorFunc;
  requiredError?: string | ErrorFunc;
  required?: boolean;
  fromEvent?: boolean;
  derived?: Derived<V>;
  change?: Change<V>;
  controlled?: Controlled;
}

export type GroupDefinition<D extends FormDefinition<any>> = {
  [key: string]: Group<D>;
};

// IDisposer is not (yet) exported by mobx-state-tree so
// define our own
// https://github.com/mobxjs/mobx-state-tree/issues/1169
export type IDisposer = () => void;

const stateDisposers = new Map<number, IDisposer>();

export class Form<
  M extends IAnyModelType,
  D extends FormDefinition<M>,
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
    const nodeId = getNodeId(node);
    // make sure we dispose of any old FormState before we create
    // a new one.
    const oldDisposer = stateDisposers.get(nodeId);
    if (oldDisposer != null) {
      oldDisposer();
    }
    const result = new FormState(this, node, options);
    // dispose of any old FormState for this same node
    stateDisposers.set(nodeId, () => result.dispose());
    return result;
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
  conversionError: string | ErrorFunc;
  requiredError?: string | ErrorFunc;
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
      this.requiredError = undefined;
      this.required = false;
      this.getRaw = identity;
      this.controlled = this.createDefaultControlled();
    } else {
      this.rawValidators = options.rawValidators ? options.rawValidators : [];
      this.validators = options.validators ? options.validators : [];
      this.conversionError = options.conversionError || "Could not convert";
      this.requiredError = options.requiredError || undefined;
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

  getConversionError(context: any): string {
    return errorMessage(this.conversionError, context);
  }

  isRequired(
    raw: R,
    required: boolean,
    options: ProcessOptions | undefined
  ): boolean {
    if (raw !== this.converter.emptyRaw) {
      return false;
    }
    if (!this.converter.neverRequired && this.converter.emptyImpossible) {
      return true;
    }
    const ignoreRequired: boolean =
      options != null ? !!options.ignoreRequired : false;
    if (this.converter.neverRequired || ignoreRequired) {
      return false;
    }
    return required;
  }

  async process(
    raw: R,
    stateConverterOptions: StateConverterOptionsWithContext
  ): Promise<ProcessResponse<V>> {
    for (const validator of this.rawValidators) {
      const validationResponse = await validator(
        raw,
        stateConverterOptions.context
      );
      if (typeof validationResponse === "string" && validationResponse) {
        return new ValidationMessage(validationResponse);
      }
    }
    const result = await this.converter.convert(raw, stateConverterOptions);
    if (result === CONVERSION_ERROR) {
      return new ValidationMessage(
        this.getConversionError(stateConverterOptions.context)
      );
    }
    for (const validator of this.validators) {
      const validationResponse = await validator(
        result.value,
        stateConverterOptions.context
      );
      if (typeof validationResponse === "string" && validationResponse) {
        return new ValidationMessage(validationResponse);
      }
    }
    return new ProcessValue(result.value);
  }

  render(value: V, stateConverterOptions: StateConverterOptionsWithContext): R {
    return this.converter.render(value, stateConverterOptions);
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

export function errorMessage(message: string | ErrorFunc, context: any) {
  if (typeof message === "string") {
    return message;
  }
  return message(context);
}
