import { observable } from "mobx";
import { applySnapshot, applyPatch } from "mobx-state-tree";

interface GetId {
  (o: object): string;
}

interface Load<Q> {
  (q: Q): Promise<any[]>;
}

interface KeyForQuery<Q> {
  (q: Q): string;
}

export class Source<Q> {
  _container: any;
  _load: Load<Q>;
  _getId: GetId;
  // XXX this grows indefinitely with cached results...
  @observable
  _cache = new Map();

  _keyForQuery: KeyForQuery<Q>;

  constructor({
    container,
    load,
    getId,
    keyForQuery
  }: {
    container: any;
    load: Load<Q>;
    getId?: GetId;
    keyForQuery?: KeyForQuery<Q>;
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

  async load(q: Q): Promise<any[]> {
    const key = this._keyForQuery(q);
    const result = this._cache.get(key);
    if (result !== undefined) {
      return result;
    }
    const items = await this._load(q);
    const references = items.map((item: any) => this.addOrUpdate(item));
    this._cache.set(key, references);
    return references;
  }

  references(q: Q): any[] | undefined {
    return this._cache.get(this._keyForQuery(q));
  }
}
