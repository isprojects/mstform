import { debounce as lodashDebounce } from "lodash";

interface ProcessChange {
  (path: string): Promise<any>;
}

export interface DebounceFunc {
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

  // process requests - field paths in the order of changes, debounced
  requests: string[] = [];

  isProcessing: boolean = false;
  processingPromise: Promise<void> = Promise.resolve();

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
    this.startChange(path);
    this.debounceProcess.run(path);
  }

  startChange(path: string) {
    this.changed.set(path, undefined);
  }

  finishChange(path: string) {
    this.changed.delete(path);
  }

  // queue the request
  makeRequest(path: string): void {
    this.requests.push(path);
    this.finishChange(path);
    this.processingPromise = this.processRequests();
  }

  // process all requests, in order
  // store the fields in requested.
  async processRequests(): Promise<void> {
    // if we're already busy, wait for promise we already have
    if (this.isProcessing) {
      return this.processingPromise;
    }
    this.isProcessing = true;

    // get the requests, updating the requests to be empty immediately
    // as new ones can come in now
    const requests = this.requests;
    this.requests = [];

    // process it all in sequence
    const processingPromise = requests.reduce(async (previousPromise, path) => {
      await previousPromise;
      // as soon as we start processing a path are done with the request
      const r = await this.process(path);
      return r;
    }, Promise.resolve());

    // we need to wait until processing is done before we complete
    await processingPromise;
    this.isProcessing = false;

    // if there is more to process now, process it too
    if (this.requests.length > 0) {
      return this.processRequests();
    }

    return processingPromise;
  }

  hasChanged(path: string): boolean {
    if (this.changed.has(path)) {
      return true;
    }
    return this.requests.includes(path);
  }

  isFinished(): Promise<void> {
    return this.processingPromise;
  }
}
