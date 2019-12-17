import { observable, computed, action, runInAction } from "mobx";
import {
  applySnapshot,
  applyPatch,
  IMSTMap,
  IAnyModelType,
  Instance,
  SnapshotIn,
  protect,
  unprotect,
  getRoot
} from "mobx-state-tree";

export interface ISource<T extends IAnyModelType, Q> {
  load(query?: Q, timestamp?: number): Promise<Instance<T>[]>;
  values(query?: Q): Instance<T>[] | undefined;
  getById(id: any): Instance<T> | undefined;
}

interface GetId<T> {
  (o: SnapshotIn<T>): string;
}

interface Load<T, Q> {
  (q: Q): Promise<SnapshotIn<T>[]>;
}

interface KeyForQuery<Q> {
  (q: Q): string;
}

interface CacheEntry<T> {
  timestamp: number;
  values: Instance<T>[];
}

type EntryMap<T extends IAnyModelType> = IMSTMap<T>;

interface EntryMapFunc<T extends IAnyModelType> {
  (): EntryMap<T>;
}

type GetEntryMap<T extends IAnyModelType> = EntryMap<T> | EntryMapFunc<T>;

export class Source<T extends IAnyModelType, Q> implements ISource<T, Q> {
  _entryMap: GetEntryMap<T>;
  _load: Load<T, Q>;
  _getId: GetId<T>;
  _keyForQuery: KeyForQuery<Q>;
  _cacheDuration: number;
  _defaultQuery?: () => Q;

  // XXX this grows indefinitely with cached results...
  @observable
  _cache = new Map<string, CacheEntry<T>>();

  constructor({
    entryMap,
    load,
    getId,
    keyForQuery,
    cacheDuration,
    defaultQuery
  }: {
    entryMap: GetEntryMap<T>;
    load: Load<T, Q>;
    getId?: GetId<T>;
    keyForQuery?: KeyForQuery<Q>;
    cacheDuration?: number;
    mapPropertyName?: string;
    defaultQuery?: () => Q;
  }) {
    this._entryMap = entryMap;
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
    this._defaultQuery = defaultQuery;
  }

  @computed
  get entryMap(): EntryMap<T> {
    return typeof this._entryMap === "function"
      ? this._entryMap()
      : this._entryMap;
  }

  getById(id: any): Instance<T> | undefined {
    return this.entryMap.get(id);
  }

  addOrUpdate(item: SnapshotIn<T>): Instance<T> {
    const id = this._getId(item);
    const entryMap = this.entryMap;
    const existing = entryMap.get(id);
    if (existing !== undefined) {
      applySnapshot(existing, item);
      return existing;
    } else {
      applyPatch(entryMap, {
        op: "add",
        path: "/" + id.toString(),
        value: item
      });
      return entryMap.get(id) as Instance<T>;
    }
  }

  @action
  setCache(key: string, values: Instance<T>[], timestamp: number) {
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
  ): Promise<Instance<T>[]> {
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

  values(q?: Q): Instance<T>[] | undefined {
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
    runInAction(() => {
      const root = getRoot(this.entryMap);
      unprotect(root);
      try {
        this.entryMap.clear();
      } catch {
        // make sure we protect in case of errors
        protect(root);
        return;
      }
      protect(root);
    });
  }
}
