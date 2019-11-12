import { observable } from "mobx";
import {
  applySnapshot,
  applyPatch,
  Instance,
  IAnyModelType
} from "mobx-state-tree";

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

export class Source<Q> {
  _container: any;
  _load: Load<Q>;
  _getId: GetId;
  _keyForQuery: KeyForQuery<Q>;
  _cacheDuration: number;

  // XXX this grows indefinitely with cached results...
  @observable
  _cache = new Map<string, CacheEntry>();

  constructor({
    container,
    load,
    getId,
    keyForQuery,
    cacheDuration
  }: {
    container: any;
    load: Load<Q>;
    getId?: GetId;
    keyForQuery?: KeyForQuery<Q>;
    cacheDuration?: number;
  }) {
    // XXX make it to we can get the container dynamically
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
  }

  getById(id: any) {
    return this._container.items.get(id);
  }

  addOrUpdate(item: any) {
    const id = this._getId(item);
    const items = this._container.items;
    const existing = items.get(id);
    if (existing !== undefined) {
      applySnapshot(existing, item);
      return existing;
    } else {
      applyPatch(items, {
        op: "add",
        path: id.toString(),
        value: item
      });
      return items.get(id);
    }
  }

  async load(timestamp: number, q: Q): Promise<Instance<IAnyModelType>[]> {
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
    this._cache.set(key, { values: values, timestamp: timestamp });
    return values;
  }

  values(q: Q): Instance<IAnyModelType>[] | undefined {
    const result = this._cache.get(this._keyForQuery(q));
    if (result == null) {
      return undefined;
    }

    return result.values;
  }
}
