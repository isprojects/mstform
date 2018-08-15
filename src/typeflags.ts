// copied from internals of mst in core/type/type.ts until it's exposed
export enum TypeFlags {
  String = 1 << 0,
  Number = 1 << 1,
  Boolean = 1 << 2,
  Date = 1 << 3,
  Literal = 1 << 4,
  Array = 1 << 5,
  Map = 1 << 6,
  Object = 1 << 7,
  Frozen = 1 << 8,
  Optional = 1 << 9,
  Reference = 1 << 10,
  Identifier = 1 << 11,
  Late = 1 << 12,
  Refinement = 1 << 13,
  Union = 1 << 14,
  Null = 1 << 15,
  Undefined = 1 << 16
}
