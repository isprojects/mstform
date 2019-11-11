import { reaction, IReactionDisposer } from "mobx";
import { Instance, IAnyComplexType } from "mobx-state-tree";
import { FieldAccessor } from "./field-accessor";
import { Source } from "./source";
import { DependentQuery } from "./form";

export type Query = {};

export interface IReferences<SQ extends Query, DQ extends Query> {
  autoLoadReaction(): IReactionDisposer;
  load(searchQuery?: SQ): Promise<Instance<any>[]>;
  values(searchQuery?: SQ): Instance<any>[] | undefined;
  getById(id: any): Instance<any>;
  isEnabled(): boolean;
}

export class References<SQ extends Query, DQ extends Query>
  implements IReferences<SQ, DQ> {
  constructor(
    public accessor: FieldAccessor<any, any>,
    public source: Source<SQ & DQ>,
    public dependentQuery: DependentQuery<DQ>
  ) {}

  autoLoadReaction(): IReactionDisposer {
    return reaction(
      () => {
        return this.dependentQuery(this.accessor);
      },
      () => {
        this.load();
      }
    );
  }

  getFullQuery(searchQuery?: SQ): SQ & DQ {
    if (searchQuery == null) {
      searchQuery = {} as SQ;
    }
    return {
      ...searchQuery,
      ...this.dependentQuery(this.accessor)
    };
  }

  async load(searchQuery?: SQ): Promise<Instance<any>[]> {
    return this.source.load(this.getFullQuery(searchQuery));
  }

  values(searchQuery?: SQ): Instance<any>[] | undefined {
    return this.source.references(this.getFullQuery(searchQuery));
  }

  getById(id: any): Instance<any> {
    return this.source.getById(id);
  }

  isEnabled(): boolean {
    return true;
  }
}

export class NoReferences<SQ extends Query, DQ extends Query>
  implements IReferences<SQ, DQ> {
  constructor(public accessor: FieldAccessor<any, any>) {}

  autoLoadReaction(): IReactionDisposer {
    throw new Error(`No references defined for field: ${this.accessor.path}`);
  }

  async load(searchQuery?: SQ): Promise<Instance<any>[]> {
    throw new Error(`No references defined for field: ${this.accessor.path}`);
  }

  values(searchQuery?: SQ): Instance<any>[] | undefined {
    throw new Error(`No references defined for field: ${this.accessor.path}`);
  }

  getById(id: any): Instance<any> {
    throw new Error(`No references defined for field: ${this.accessor.path}`);
  }

  isEnabled(): boolean {
    return false;
  }
}
