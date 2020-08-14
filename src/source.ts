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
import { timingSafeEqual } from "crypto";

export type Query = {};

export interface ISource<T extends IAnyModelType, Q extends Query> {
  load(query?: Q, timestamp?: number): Promise<Instance<T>[]>;
  values(query?: Q): Instance<T>[] | undefined;
  getById(id: any): Instance<T> | undefined;
}

interface GetId<T> {
  (o: SnapshotIn<T>): string;
}

interface Load<T, Q extends Query> {
  (q: Q): Promise<SnapshotIn<T>[]>;
}

interface KeyForQuery<Q extends Query> {
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

export class Source<T extends IAnyModelType, Q extends Query>
  implements ISource<T, Q> {
  _entryMap: GetEntryMap<T>;
  _load: Load<T, Q>;
  _getId: GetId<T>;
  _keyForQuery: KeyForQuery<Q>;
  _cacheDuration: number;

  // XXX this grows indefinitely with cached results...
  @observable
  _cache = new Map<string, CacheEntry<T>>();

  _existingLoad = new Map<string, Promise<SnapshotIn<T>[]>>();

  constructor({
    entryMap,
    load,
    getId,
    keyForQuery,
    cacheDuration
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

  getFullQuery(q?: Q): Q {
    if (q == null) {
      return {} as Q;
    }
    return q;
  }

  async load(
    q?: Q,
    timestamp: number = new Date().getTime()
  ): Promise<Instance<T>[]> {
    q = this.getFullQuery(q);
    const key = this._keyForQuery(q);
    const result = this._cache.get(key);
    if (
      result !== undefined &&
      timestamp < result.timestamp + this._cacheDuration
    ) {
      return result.values;
    }
    const items = await this.loadOrExisting(key, q).finally(() =>
      this._existingLoad.delete(key)
    );
    const values = items.map((item: any) => this.addOrUpdate(item));
    this.setCache(key, values, timestamp);
    return values;
  }

  async loadOrExisting(key: string, q: Q): Promise<SnapshotIn<T>[]> {
    const existingLoad = this._existingLoad.get(key);
    if (existingLoad) {
      return existingLoad;
    }
    const load = this._load(q);
    this._existingLoad.set(key, load);
    return load;
  }

  values(q?: Q): Instance<T>[] | undefined {
    const result = this._cache.get(this._keyForQuery(this.getFullQuery(q)));
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
    this._existingLoad.clear();
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
