import React from "react";
import { observer, inject } from "mobx-react";
import { FieldAccessor } from "./field-accessor";
import { ReadOnlyPolicy } from "./renderPolicy";

export interface WithFieldProps {
  field?: FieldAccessor<any, any, any>;
}

export interface WithFormItemProps extends WithFieldProps {
  hidden?: boolean;
}

export interface WithInputProps extends WithFieldProps {
  readOnlyPolicy?: ReadOnlyPolicy;
  readOnly?: boolean;
}

export function formItemWrap<P extends object>(
  Component: React.ComponentType<P>
): React.SFC<P & WithFormItemProps> {
  const result = (props: P & WithFormItemProps) => {
    // we have to add in & object here to extract remaining
    const { field, hidden, ...remaining } = props as WithFormItemProps & object;
    const isHidden = hidden || (field != null && field.hidden);
    if (isHidden) {
      return null;
    }
    let newProps: object = remaining;
    if (field != null) {
      newProps = { ...field.validationProps, ...newProps };
    }
    return <Component {...newProps} />;
  };
  (result as any).displayName = getDisplayName(Component);
  return observer(result);
}

function renderRaw(raw: any) {
  if (raw == null) {
    return undefined;
  }
  return raw.toString();
}

export function inputWrap<P extends object>(
  Component: React.ComponentType<P>,
  readOnlyId: string
): React.SFC<P & WithInputProps> {
  const result = (props: P & WithInputProps) => {
    // we have to add in & object here to extract remaining
    const {
      field,
      readOnly,
      readOnlyPolicy,
      ...remaining
    } = props as WithInputProps & object;
    const isReadOnly = readOnly || (field != null && field.readOnly);

    if (isReadOnly) {
      let rendered;
      if (field != null) {
        rendered =
          readOnlyPolicy != null
            ? readOnlyPolicy.render(readOnlyId, field, remaining)
            : renderRaw(field.raw);
      } else {
        // fall back on rendering value
        const value = (props as any).value;
        rendered = renderRaw(value);
      }
      return <span className="mstform-readonly">{rendered}</span>;
    }
    let newProps: object = remaining;
    if (field != null) {
      newProps = { ...field.inputProps, ...newProps };
    }
    return <Component {...newProps} />;
  };
  (result as any).displayName = getDisplayName(Component);
  return inject((allStores: any) => ({
    readOnlyPolicy: allStores.readOnlyPolicy as ReadOnlyPolicy
  }))(observer(result));
}

function getDisplayName(Component: React.ComponentType<any> | string) {
  if (typeof Component === "string") {
    return Component;
  }
  return Component.displayName || Component.name || "Component";
}
