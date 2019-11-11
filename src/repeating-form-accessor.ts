import { observable, computed } from "mobx";
import { applyPatch } from "mobx-state-tree";

import { FormDefinition, RepeatingForm, GroupDefinition } from "./form";
import { FormState } from "./state";
import { RepeatingFormIndexedAccessor } from "./repeating-form-indexed-accessor";
import { AccessorBase } from "./accessor-base";
import { ValidateOptions } from "./validate-options";
import { ExternalMessages } from "./validationMessages";
import {
  IAccessor,
  IRepeatingFormIndexedAccessor,
  IRepeatingFormAccessor,
  IFormAccessor
} from "./interfaces";

export class RepeatingFormAccessor<
  D extends FormDefinition<any>,
  G extends GroupDefinition<D>
> extends AccessorBase implements IRepeatingFormAccessor<D, G> {
  name: string;

  @observable
  repeatingFormIndexedAccessors: Map<
    number,
    IRepeatingFormIndexedAccessor<D, G>
  > = observable.map();

  externalErrors = new ExternalMessages();
  externalWarnings = new ExternalMessages();

  constructor(
    public state: FormState<any, any, any>,
    public repeatingForm: RepeatingForm<D, G>,
    public parent: IFormAccessor<any, any>,
    name: string
  ) {
    super(parent);
    this.name = name;
    this.initialize();
  }

  @computed
  get path(): string {
    return this.parent.path + "/" + this.name;
  }

  @computed
  get value(): any {
    return this.state.getValue(this.path);
  }

  // XXX validate and isValid should be implemented on accessor?
  validate(options?: ValidateOptions): boolean {
    const values = this.accessors.map(accessor => accessor.validate(options));
    // appending possible error on the repeatingform itself
    const ignoreGetError = options != null ? options.ignoreGetError : false;
    if (!ignoreGetError) {
      values.push(this.errorValue === undefined);
    }
    return values.every(value => value);
  }

  @computed
  get isValid(): boolean {
    return this.accessors.every(accessor => accessor.isValid);
  }

  @computed
  get addMode(): boolean {
    return this.parent.addMode;
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

  index(index: number): IRepeatingFormIndexedAccessor<D, G> {
    const accessor = this.repeatingFormIndexedAccessors.get(index);
    if (accessor == null) {
      throw new Error(`${index} is not a RepeatingFormIndexedAccessor`);
    }
    return accessor;
  }

  @computed
  get accessors(): IRepeatingFormIndexedAccessor<D, G>[] {
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

  insert(index: number, node: any, addModeDefaults: string[] = []) {
    const path = this.path + "/" + index;
    applyPatch(this.state.node, [{ op: "add", path, value: node }]);
    this.index(index).setAddMode(addModeDefaults);
  }

  push(node: any, addModeDefaults: string[] = []) {
    const a = this.value;
    const index = a.length;
    const path = this.path + "/" + index;
    applyPatch(this.state.node, [{ op: "add", path, value: node }]);
    const indexedAccessor = this.index(index);
    indexedAccessor.setAddMode(addModeDefaults);
  }

  remove(node: any) {
    const a = this.value;
    const index = a.indexOf(node);
    if (index === -1) {
      throw new Error("Cannot find node to remove.");
    }
    applyPatch(this.state.node, [
      { op: "remove", path: this.path + "/" + index }
    ]);
  }

  removeIndex(index: number) {
    const accessors = this.repeatingFormIndexedAccessors;
    const isRemoved = accessors.delete(index);
    if (!isRemoved) {
      return;
    }
    const toDelete: number[] = [];
    const toInsert: IRepeatingFormIndexedAccessor<any, any>[] = [];

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
    const toInsert: IRepeatingFormIndexedAccessor<any, any>[] = [];
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
    toInsert: IRepeatingFormIndexedAccessor<any, any>[]
  ) {
    const accessors = this.repeatingFormIndexedAccessors;

    // first remove all accessors that are renumbered
    toDelete.forEach(index => {
      accessors.delete(index);
    });
    // insert renumbered accessors all at once afterwards
    toInsert.forEach(accessor => {
      accessors.set(accessor.index, accessor);
    });
  }

  @computed
  get length(): number {
    return this.value.length;
  }
}
