import {
  IConverter,
  StateConverterOptionsWithContext,
  PartialConverterFactory,
} from "./converter";
import { FieldAccessor } from "./field-accessor";

export interface DynamicOptions<O> {
  (context: any, accessor: FieldAccessor<any, any>): Partial<O>;
}

export interface GetContextConverter<R, V> {
  (context: any, accessor: FieldAccessor<any, any>): IConverter<R, V>;
}

function delegatingConverter<R, V>(
  defaultConverter: IConverter<R, V>,
  getContextConverter: GetContextConverter<R, V>
): IConverter<R, V> {
  return {
    emptyRaw: defaultConverter.emptyRaw,
    emptyValue: defaultConverter.emptyValue,
    emptyImpossible: defaultConverter.emptyImpossible,
    defaultControlled: defaultConverter.defaultControlled,
    neverRequired: defaultConverter.neverRequired,
    convert(raw: R, options: StateConverterOptionsWithContext) {
      return getContextConverter(options.context, options.accessor).convert(
        raw,
        options
      );
    },
    render(value: V, options: StateConverterOptionsWithContext) {
      return getContextConverter(options.context, options.accessor).render(
        value,
        options
      );
    },
    preprocessRaw(raw: R, options: StateConverterOptionsWithContext) {
      return getContextConverter(
        options.context,
        options.accessor
      ).preprocessRaw(raw, options);
    },
    isEmpty(raw: R) {
      return defaultConverter.isEmpty(raw);
    },
  };
}

export function dynamic<O, R, V>(
  converterFactory: PartialConverterFactory<O, R, V>,
  getOptions: DynamicOptions<O>
): IConverter<R, V> {
  // the default converter is good enough for anything that
  // isn't influenced by parameters anyway
  const defaultConverter = converterFactory();
  return delegatingConverter(
    defaultConverter,
    (context: any, accessor: FieldAccessor<any, any>) =>
      converterFactory(getOptions(context, accessor))
  );
}
