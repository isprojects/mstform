import { reaction } from "mobx";
import { FieldAccessor } from "./field-accessor";
import { Source } from "./source";
import { DependentQuery } from "./form";

export type Query = {};

export class References<SQ extends Query, DQ extends Query> {
  constructor(
    public accessor: FieldAccessor<any, any>,
    public source: Source<SQ & DQ>,
    public dependentQuery: DependentQuery<DQ>,
    public autoLoad: boolean
  ) {
    if (autoLoad) {
      reaction(
        () => {
          return dependentQuery(accessor);
        },
        () => {
          this.load();
        }
      );
    }
  }

  getFullQuery(searchQuery?: SQ): SQ & DQ {
    if (searchQuery == null) {
      searchQuery = {} as SQ;
    }
    // it may be we don't need to do the 'as object' story anymore
    // in TS 3.2
    // https://github.com/Microsoft/TypeScript/wiki/What's-new-in-TypeScript#generic-spread-expressions-in-object-literals
    return {
      ...(searchQuery as object),
      ...(this.dependentQuery(this.accessor) as object)
    } as SQ & DQ;
  }

  async load(searchQuery?: SQ): Promise<any[]> {
    return this.source.load(this.getFullQuery(searchQuery));
  }

  references(searchQuery?: SQ): any[] | undefined {
    return this.source.references(this.getFullQuery(searchQuery));
  }
}
