import { IObservableArray } from "mobx";
import { IModelType } from "mobx-state-tree";
import { CONVERSION_ERROR, IConverter } from "./converter";
import { FormState, FormStateOptions } from "./state";
import { FieldOptions, RawGetter, Validator, Derived } from "./types";
import { identity } from "./utils";

export type ArrayEntryType<T> = T extends IObservableArray<infer A> ? A : never;

export type RawType<F> = F extends Field<infer R, any> ? R : never;

export type FormDefinitionType<T> = T extends RepeatingForm<any, infer D>
  ? D
  : never;

export type FormDefinition<M> = {
  [K in keyof M]?: Field<any, M[K]> | RepeatingForm<ArrayEntryType<M[K]>, any>
};

export class Form<M, D extends FormDefinition<M>> {
  constructor(public model: IModelType<any, M>, public definition: D) {}

  get FormStateType(): FormState<M, D> {
    throw new Error("For introspection");
  }

  state(node: M, options?: FormStateOptions<M>): FormState<M, D> {
    return new FormState(this, node, options);
  }
}

export class ValidationMessage {
  constructor(public message: string) {}
}

export class ProcessValue<V> {
  constructor(public value: V) {}
}

export type ProcessResponse<V> = ProcessValue<V> | ValidationMessage;

export class Field<R, V> {
  rawValidators: Validator<R>[];
  validators: Validator<V>[];
  conversionError: string;
  requiredError: string;
  required: boolean;
  getRaw: RawGetter<R>;
  derivedFunc?: Derived<V>;

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
    }
  }

  get RawType(): R {
    throw new Error("This is a function to enable type introspection");
  }

  get ValueType(): V {
    throw new Error("This is a function to enable type introspection");
  }

  async process(raw: R): Promise<ProcessResponse<V>> {
    if (raw === this.converter.emptyRaw && this.required) {
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

export class RepeatingForm<M, D extends FormDefinition<M>> {
  constructor(public definition: D) {}
}
