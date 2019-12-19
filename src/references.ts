import { reaction, IReactionDisposer } from "mobx";
import { Instance, IAnyModelType } from "mobx-state-tree";
import { ISource, Query } from "./source";

export interface IReferences<
  T extends IAnyModelType,
  SQ extends Query,
  DQ extends Query
> {
  autoLoadReaction(): IReactionDisposer;
  load(searchQuery?: SQ): Promise<Instance<T>[]>;
  loadWithTimestamp(
    timestamp: number,
    searchQuery?: SQ
  ): Promise<Instance<T>[]>;
  values(searchQuery?: SQ): Instance<T>[] | undefined;
  getById(id: any): Instance<T> | undefined;
  isEnabled(): boolean;
}

export interface DependentQuery<DQ> {
  (): DQ;
}

export class References<
  T extends IAnyModelType,
  SQ extends Query,
  DQ extends Query
> implements IReferences<T, SQ, DQ> {
  constructor(
    public source: ISource<T, SQ & DQ>,
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
  ): Promise<Instance<T>[]> {
    return this.source.load(this.getFullQuery(searchQuery), timestamp);
  }

  async load(searchQuery?: SQ): Promise<Instance<T>[]> {
    return this.loadWithTimestamp(new Date().getTime(), searchQuery);
  }

  values(searchQuery?: SQ): Instance<T>[] | undefined {
    return this.source.values(this.getFullQuery(searchQuery));
  }

  getById(id: any): Instance<T> | undefined {
    return this.source.getById(id);
  }

  isEnabled(): boolean {
    return true;
  }
}

export class NoReferences<SQ extends Query, DQ extends Query>
  implements IReferences<any, SQ, DQ> {
  autoLoadReaction(): IReactionDisposer {
    throw new Error(`No references defined`);
  }

  async loadWithTimestamp(
    timestamp: number,
    searchQuery?: SQ
  ): Promise<Instance<IAnyModelType>[]> {
    throw new Error(`No references defined`);
  }

  async load(searchQuery?: SQ): Promise<Instance<IAnyModelType>[]> {
    throw new Error(`No references defined`);
  }

  values(searchQuery?: SQ): Instance<IAnyModelType>[] | undefined {
    throw new Error(`No references defined`);
  }

  getById(id: any): Instance<IAnyModelType> {
    throw new Error(`No references defined`);
  }

  isEnabled(): boolean {
    return false;
  }
}
