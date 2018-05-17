import { IModelType, IType, types } from "mobx-state-tree";
import { TypeFlags } from "./typeflags";

function maybefyField(type: IType<any, any>): IType<any, any> {
  // plain null we are done with immediately.
  if (!(type.flags & TypeFlags.Union) && type.flags & TypeFlags.Null) {
    return type;
  }
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

// function maybefyUnion(type: IType<any, any>): IType<any, any> {
//   const maybefiedTypes = type.types.map(partType => maybefyField(partType));
//   if (type.dispatcher == null) {
//     return types.union(...maybefiedTypes);
//   }
//   const wrappedDispatcher = s => {
//     const t = type.dispatcher(s);
//     const i = type.types.indexOf(t);
//     return maybefiedTypes[i];
//   };
//   return types.union(wrappedDispatcher, ...maybefiedTypes);
// }

export function maybefy(type: IModelType<any, any>): IModelType<any, any> {
  // if (type.flags & TypeFlags.Union) {
  //   return maybefyUnion(type);
  // }
  const definition: any = {};
  Object.keys(type.properties).forEach(key => {
    definition[key] = maybefyField(type.properties[key]);
  });
  return types.model(type.name, definition);
}
