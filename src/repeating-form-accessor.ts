import { observable, computed, makeObservable, action, toJS } from "mobx";
import {
  IAnyModelType,
  applyPatch,
  Instance,
  getSnapshot,
  cast,
} from "mobx-state-tree";

import { FormDefinition, RepeatingForm, GroupDefinition } from "./form";
import { AnyFormState } from "./state";
import { RepeatingFormIndexedAccessor } from "./repeating-form-indexed-accessor";
import { AccessorBase } from "./accessor-base";
import { ValidateOptions } from "./validate-options";
import { ExternalMessages } from "./validationMessages";
import {
  IAccessor,
  IRepeatingFormIndexedAccessor,
  IRepeatingFormAccessor,
  IAnyFormAccessor,
} from "./interfaces";

export class RepeatingFormAccessor<
    D extends FormDefinition<M>,
    G extends GroupDefinition<D>,
    M extends IAnyModelType
  >
  extends AccessorBase
  implements IRepeatingFormAccessor<D, G, M>
{
  name: string;

  @observable
  repeatingFormIndexedAccessors: Map<
    number,
    IRepeatingFormIndexedAccessor<D, G, M>
  > = observable.map();

  externalErrors = new ExternalMessages();
  externalWarnings = new ExternalMessages();
  @observable _originalValue: any[] = [];
  @observable _originalHashes: string[] = [];

  constructor(
    public state: AnyFormState,
    public repeatingForm: RepeatingForm<M, D, G>,
    public parent: IAnyFormAccessor,
    name: string
  ) {
    super(parent);
    makeObservable(this);
    this.name = name;
    this.initialize();
    this.setOriginalValue();
  }

  @computed
  get path(): string {
    return this.parent.path + "/" + this.name;
  }

  @computed
  get value(): Instance<M>[] {
    return this.state.getValue(this.path);
  }

  // XXX validate and isValid should be implemented on accessor?
  validate(options?: ValidateOptions): boolean {
    const values = this.accessors.map((accessor) => accessor.validate(options));
    // appending possible error on the repeatingform itself
    const ignoreGetError = options != null ? options.ignoreGetError : false;
    if (!ignoreGetError) {
      values.push(this.errorValue === undefined);
    }
    return values.every((value) => value);
  }

  @computed
  get isValid(): boolean {
    return (
      this.errorValue == null &&
      this.accessors.every((accessor) => accessor.isValid)
    );
  }

  @computed
  get addMode(): boolean {
    return this.parent.addMode;
  }

  @computed
  get isDirty(): boolean {
    // If length doesn't match we return true without checking further accessors
    if (this.length != this._originalHashes.length) {
      return true;
    }

    // If the hashes of our accessor don't match we know something has changed.
    if (!this.hashesMatch) {
      return true;
    }

    // If hashes do match, check if a nested accessor is dirty.
    return this.accessors.some((accessor) => accessor.isDirty);
  }

  @computed
  get hashesMatch() {
    const currentHashes = this.accessors
      .map((accessor) => accessor._hash)
      .sort()
      .join(",");
    const existingHashes = this._originalHashes.slice().sort().join(",");
    return currentHashes == existingHashes;
  }

  restore(): void {
    // If this accessor isn't dirty, don't bother to restore.
    if (!this.isDirty) {
      return;
    }

    // If hashes do match we don't need to restore any removed lines or remove
    // newly added ones.
    if (this.hashesMatch) {
      this.accessors.forEach((accessor) => accessor.restore());
      return;
    }

    // If hashes do not match we need to restore from the original snapshot.
    applyPatch(this.state.node, {
      op: "replace",
      path: this.path,
      value: toJS(this._originalValue),
    });
    this.resetDirtyState();
  }

  resetDirtyState(): void {
    this.setOriginalValue();
  }

  @action
  setOriginalValue(): void {
    this._originalValue = getSnapshot(cast(this.value));
    this._originalHashes = this.accessors.map((accessor) => accessor._hash);
  }

  initialize() {
    const entries = this.state.getValue(this.path);
    let i = 0;
    entries.forEach(() => {
      this.createFormIndexedAccessor(i);
      i++;
    });
  }

  createFormIndexedAccessor(index: number) {
    const result = new RepeatingFormIndexedAccessor(
      this.state,
      this.repeatingForm.definition,
      this.repeatingForm.groupDefinition,
      this,
      index
    );
    this.repeatingFormIndexedAccessors.set(index, result);
  }

  index(index: number): IRepeatingFormIndexedAccessor<D, G, M> {
    const accessor = this.repeatingFormIndexedAccessors.get(index);
    if (accessor == null) {
      throw new Error(`${index} is not a RepeatingFormIndexedAccessor`);
    }
    return accessor;
  }

  @computed
  get accessors(): IRepeatingFormIndexedAccessor<D, G, M>[] {
    const result = Array.from(this.repeatingFormIndexedAccessors.values());
    result.sort((first, second) => first.index - second.index);
    return result;
  }

  accessBySteps(steps: string[]): IAccessor | undefined {
    const [first, ...rest] = steps;
    const nr = parseInt(first, 10);
    if (isNaN(nr)) {
      throw new Error("Expected index of repeating form");
    }
    const accessor = this.index(nr);
    return accessor.accessBySteps(rest);
  }

  insert(index: number, node: Instance<M>, addModeDefaults: string[] = []) {
    const path = this.path + "/" + index;
    applyPatch(this.state.node, [{ op: "add", path, value: node }]);
    this.index(index).setAddMode(addModeDefaults);
  }

  push(node: Instance<M>, addModeDefaults: string[] = []) {
    const a = this.value;
    const index = a.length;
    const path = this.path + "/" + index;
    applyPatch(this.state.node, [{ op: "add", path, value: node }]);
    const indexedAccessor = this.index(index);
    indexedAccessor.setAddMode(addModeDefaults);
  }

  remove(node: Instance<M>) {
    const a = this.value;
    const index = a.indexOf(node);
    if (index === -1) {
      throw new Error("Cannot find node to remove.");
    }
    applyPatch(this.state.node, [
      { op: "remove", path: this.path + "/" + index },
    ]);
  }

  removeIndex(index: number) {
    const accessors = this.repeatingFormIndexedAccessors;
    const isRemoved = accessors.delete(index);
    if (!isRemoved) {
      return;
    }
    const toDelete: number[] = [];
    const toInsert: IRepeatingFormIndexedAccessor<any, any, any>[] = [];

    accessors.forEach((accessor, i) => {
      if (i <= index) {
        return;
      }
      accessor.setIndex(i - 1);
      toDelete.push(i);
      toInsert.push(accessor);
    });
    this.executeRenumber(toDelete, toInsert);
  }

  addIndex(index: number) {
    const accessors = this.repeatingFormIndexedAccessors;

    const toDelete: number[] = [];
    const toInsert: IRepeatingFormIndexedAccessor<any, any, any>[] = [];
    accessors.forEach((accessor, i) => {
      if (i < index) {
        return;
      }
      accessor.setIndex(i + 1);
      toDelete.push(i);
      toInsert.push(accessor);
    });
    this.executeRenumber(toDelete, toInsert);
    this.createFormIndexedAccessor(index);
  }

  private executeRenumber(
    toDelete: number[],
    toInsert: IRepeatingFormIndexedAccessor<any, any, any>[]
  ) {
    const accessors = this.repeatingFormIndexedAccessors;

    // first remove all accessors that are renumbered
    toDelete.forEach((index) => {
      accessors.delete(index);
    });
    // insert renumbered accessors all at once afterwards
    toInsert.forEach((accessor) => {
      accessors.set(accessor.index, accessor);
    });
  }

  @computed
  get length(): number {
    return this.value.length;
  }
}
