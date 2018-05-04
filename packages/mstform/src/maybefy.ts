import { IModelType, IType, types } from "mobx-state-tree";
import { TypeFlags } from "./typeflags";

function maybefyField(type: IType<any, any>): IType<any, any> {
  // string by itself not in a union
  if (type.flags & TypeFlags.String && !(type.flags & TypeFlags.Union)) {
    return type;
  }

  if (type.flags & TypeFlags.Array) {
    return types.array(maybefyField(type.getChildType("dummy")));
  }
  if (type.flags & TypeFlags.Map) {
    return types.map(maybefyField(type.getChildType("dummy")));
  }
  if (type.flags & TypeFlags.Object) {
    return maybefy(type as IModelType<any, any>);
  }
  if (type.flags & TypeFlags.Union) {
    if (type.flags & TypeFlags.Null) {
      // this is already a union with null, so don't have to do anything
      return type;
    } else {
      // this is some other kind of union, so maybefy it
      return types.maybe(type);
    }
  }
  return types.maybe(type);
}

export function maybefy(type: IModelType<any, any>): IModelType<any, any> {
  const definition: any = {};
  Object.keys(type.properties).forEach(key => {
    definition[key] = maybefyField(type.properties[key]);
  });
  return types.model(type.name, definition);
}
