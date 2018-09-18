import { ReactNode } from "react";
import { FieldAccessor } from "./accessor";

export interface RenderFunc {
  (accessor: FieldAccessor<any, any, any>, props: object): ReactNode;
}

export class ReadOnlyPolicy {
  policies: Map<string, RenderFunc> = new Map();

  constructor() {
    // register a default policy that at least makes something we can see
    this.register("", accessor => accessor.raw.toString());
  }

  register(policyId: string, render: RenderFunc) {
    this.policies.set(policyId, render);
  }

  render(
    policyId: string,
    accessor: FieldAccessor<any, any, any>,
    props: object
  ) {
    let render = this.policies.get(policyId);
    if (render === undefined) {
      // we know there's always a default policy
      render = this.policies.get("") as RenderFunc;
    }
    return render(accessor, props);
  }

  clone(): ReadOnlyPolicy {
    const result = new ReadOnlyPolicy();
    this.policies.forEach((value, key) => {
      result.register(key, value);
    });
    return result;
  }
}
