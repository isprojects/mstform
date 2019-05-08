import { debounce as lodashDebounce } from "lodash";

interface ProcessChange {
  (path: string): Promise<any>;
}

interface DebounceFunc {
  (f: any, delay: number): void;
}

class DebounceProcess {
  debounced: Map<string, any> = new Map();
  debounce: DebounceFunc;

  constructor(
    public func: (path: string) => void,
    { debounce }: { debounce?: DebounceFunc }
  ) {
    this.debounce = debounce || lodashDebounce;
  }

  run(path: string) {
    let f = this.debounced.get(path);
    if (f == null) {
      f = this.debounce(() => this.func(path), 500);
      this.debounced.set(path, f);
    }
    f();
  }
}

export class ChangeTracker {
  changed: Map<string, void> = new Map();
  requested: Map<string, number> = new Map();

  // process requests - field paths in the order of changes, debounced
  requests: string[] = [];

  isProcessing: boolean = false;
  processingPromises: Map<string, Promise<any>> = new Map();

  debounceProcess: DebounceProcess;

  constructor(
    public process: ProcessChange,
    { debounce }: { debounce?: DebounceFunc }
  ) {
    this.debounceProcess = new DebounceProcess(
      (path: string) => this.makeRequest(path),
      {
        debounce: debounce
      }
    );
  }

  // track a field that has changed. debounce requests
  change(path: string): void {
    this.changed.set(path, undefined);
    this.debounceProcess.run(path);
  }

  // queue the request
  makeRequest(path: string): void {
    const count = this.requested.get(path);
    this.requested.set(path, count != null ? count + 1 : 0);
    this.requests.push(path);
    this.processingPromises.set(path, this.processRequests());
  }

  // process all requests, in order
  // store the fields in requested.
  async processRequests(): Promise<any> {
    if (this.isProcessing) {
      return;
    }
    this.isProcessing = true;
    const requests = this.requests;
    this.requests = [];
    this.isProcessing = true;
    const processingPromise = requests.reduce(async (previousPromise, path) => {
      await previousPromise;
      const r = await this.process(path);
      const count = this.requested.get(path);
      if (count != null) {
        if (count > 1) {
          this.requested.set(path, count - 1);
        } else {
          this.requested.delete(path);
        }
      }
      return r;
    }, Promise.resolve());
    await processingPromise;
    this.isProcessing = false;
    if (this.requests.length > 0) {
      return this.processRequests();
    }
    return processingPromise;
  }

  isRequested(path: string): boolean {
    const count = this.requested.get(path);
    if (count == null) {
      return false;
    }
    return count > 0;
  }

  isPathProcessing(path: string): boolean {
    return false;
  }

  isFinished(): Promise<any> {
    return Promise.all(Array.from(this.processingPromises.values()));
  }
}
