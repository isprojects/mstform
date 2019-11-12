import { reaction, IReactionDisposer } from "mobx";
import { Instance, IAnyModelType } from "mobx-state-tree";
import { FieldAccessor } from "./field-accessor";
import { Source } from "./source";

export type Query = {};

export interface IReferences<SQ extends Query, DQ extends Query> {
  autoLoadReaction(): IReactionDisposer;
  load(searchQuery?: SQ): Promise<Instance<IAnyModelType>[]>;
  loadWithTimestamp(
    timestamp: number,
    searchQuery?: SQ
  ): Promise<Instance<IAnyModelType>[]>;
  values(searchQuery?: SQ): Instance<IAnyModelType>[] | undefined;
  getById(id: any): Instance<IAnyModelType>;
  isEnabled(): boolean;
}

export interface DependentQuery<DQ> {
  (): DQ;
}

export class References<SQ extends Query, DQ extends Query>
  implements IReferences<SQ, DQ> {
  constructor(
    public source: Source<SQ & DQ>,
    public dependentQuery: DependentQuery<DQ> = () => ({} as DQ)
  ) {}

  autoLoadReaction(): IReactionDisposer {
    return reaction(
      () => {
        return this.dependentQuery();
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
      ...this.dependentQuery()
    };
  }

  async loadWithTimestamp(
    timestamp: number,
    searchQuery?: SQ
  ): Promise<Instance<IAnyModelType>[]> {
    return this.source.load(timestamp, this.getFullQuery(searchQuery));
  }

  async load(searchQuery?: SQ): Promise<Instance<IAnyModelType>[]> {
    return this.loadWithTimestamp(new Date().getTime(), searchQuery);
  }

  values(searchQuery?: SQ): Instance<IAnyModelType>[] | undefined {
    return this.source.values(this.getFullQuery(searchQuery));
  }

  getById(id: any): Instance<IAnyModelType> {
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

  async loadWithTimestamp(
    timestamp: number,
    searchQuery?: SQ
  ): Promise<Instance<IAnyModelType>[]> {
    throw new Error(`No references defined for field: ${this.accessor.path}`);
  }

  async load(searchQuery?: SQ): Promise<Instance<IAnyModelType>[]> {
    throw new Error(`No references defined for field: ${this.accessor.path}`);
  }

  values(searchQuery?: SQ): Instance<IAnyModelType>[] | undefined {
    throw new Error(`No references defined for field: ${this.accessor.path}`);
  }

  getById(id: any): Instance<IAnyModelType> {
    throw new Error(`No references defined for field: ${this.accessor.path}`);
  }

  isEnabled(): boolean {
    return false;
  }
}
