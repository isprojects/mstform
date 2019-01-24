import { FieldAccessor } from "./field-accessor";
import { Source } from "./source";
import { DependentQuery } from "./form";

export class References<SQ, DQ> {
  constructor(
    public accessor: FieldAccessor<any, any>,
    public source: Source<SQ & DQ>,
    public dependentQuery: DependentQuery<DQ>,
    public autoLoad: boolean
  ) {}

  async load(searchQuery: SQ): Promise<any[]> {
    const fullQuery: SQ & DQ = {
      ...searchQuery,
      ...this.dependentQuery(this.accessor)
    };
    return this.source.load(fullQuery);
  }

  references(searchQuery: SQ): any[] | undefined {
    const fullQuery: SQ & DQ = {
      ...searchQuery,
      ...this.dependentQuery(this.accessor)
    };
    return this.source.references(fullQuery);
  }
}
