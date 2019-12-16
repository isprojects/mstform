import { observable, computed, action, ObservableMap } from "mobx";
import {
  applySnapshot,
  applyPatch,
  Instance,
  IAnyModelType
} from "mobx-state-tree";

export interface ISource<T extends IAnyModelType> {
  load(
    query?: { [key: string]: any },
    timestamp?: number
  ): Promise<Instance<T>[]>;
  values(query?: { [key: string]: any }): Instance<T>[] | undefined;
  getById(id: any): Instance<T>;
}

interface GetId {
  (o: object): string;
}

interface Load<Q> {
  (q: Q): Promise<any[]>;
}

interface KeyForQuery<Q> {
  (q: Q): string;
}

interface CacheEntry {
  timestamp: number;
  values: Instance<IAnyModelType>[];
}

export class Source<Q> implements ISource<any> {
  _container: any;
  _load: Load<Q>;
  _getId: GetId;
  _keyForQuery: KeyForQuery<Q>;
  _cacheDuration: number;
  _mapPropertyName: string;
  _defaultQuery?: () => Q;

  // XXX this grows indefinitely with cached results...
  @observable
  _cache = new Map<string, CacheEntry>();

  constructor({
    container,
    load,
    getId,
    keyForQuery,
    cacheDuration,
    mapPropertyName,
    defaultQuery
  }: {
    container: any;
    load: Load<Q>;
    getId?: GetId;
    keyForQuery?: KeyForQuery<Q>;
    cacheDuration?: number;
    mapPropertyName?: string;
    defaultQuery?: () => Q;
  }) {
    this._container = container;
    this._load = load;
    if (getId == null) {
      getId = (o: any) => o.id;
    }
    this._getId = getId;
    if (keyForQuery === undefined) {
      keyForQuery = (q: Q) => JSON.stringify(q);
    }
    this._keyForQuery = keyForQuery;
    this._cacheDuration =
      (cacheDuration != null ? cacheDuration : 5 * 60) * 1000;
    if (mapPropertyName == null) {
      mapPropertyName = "entryMap";
    }
    this._mapPropertyName = mapPropertyName;
    this._defaultQuery = defaultQuery;
  }

  @computed
  get container(): any {
    return typeof this._container === "function"
      ? this._container()
      : this._container;
  }

  @computed
  get items(): ObservableMap<any> {
    return this.container[this._mapPropertyName];
  }

  getById(id: any) {
    return this.items.get(id);
  }

  addOrUpdate(item: any) {
    const id = this._getId(item);
    const items = this.items;
    const existing = items.get(id);
    if (existing !== undefined) {
      applySnapshot(existing, item);
      return existing;
    } else {
      applyPatch(items, {
        op: "add",
        path: "/" + id.toString(),
        value: item
      });
      return items.get(id);
    }
  }

  @action
  setCache(key: string, values: string[], timestamp: number) {
    this._cache.set(key, { values: values, timestamp: timestamp });
  }

  queryOrDefault(q?: Q): Q {
    if (q == null) {
      if (this._defaultQuery == null) {
        throw new Error(
          "Cannot construct default query for load. Please provide defaultQuery to source"
        );
      }
      return this._defaultQuery();
    }
    return q;
  }

  async load(
    q?: Q,
    timestamp: number = new Date().getTime()
  ): Promise<Instance<IAnyModelType>[]> {
    q = this.queryOrDefault(q);
    const key = this._keyForQuery(q);
    const result = this._cache.get(key);
    if (
      result !== undefined &&
      timestamp < result.timestamp + this._cacheDuration
    ) {
      return result.values;
    }
    const items = await this._load(q);
    const values = items.map((item: any) => this.addOrUpdate(item));
    this.setCache(key, values, timestamp);
    return values;
  }

  values(q?: Q): Instance<IAnyModelType>[] | undefined {
    const result = this._cache.get(this._keyForQuery(this.queryOrDefault(q)));
    if (result == null) {
      return undefined;
    }

    return result.values;
  }

  // calling this only makes sense if you use safeReference
  // to refer to values
  @action
  clear() {
    this._cache.clear();
    applyPatch(this.container, {
      op: "replace",
      path: "/" + this._mapPropertyName,
      value: {}
    });
  }
}
