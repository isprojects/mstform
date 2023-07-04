import { debounce as lodashDebounce } from "lodash";

// the change tracker solves the problem of sending changes to
// a form to the server in the order in which they were made,
// one after another, and allowing changes to be queued up.
// Queued up changes that aren't yet being handled can be
// accessed -- this is useful if we want new changes to override
// any changes from the backend in the form processor.

// the change tracker debounces changes, so that multiple changes
// to the same field shortly after another are only sent once.

// the change tracker is used by the form processor.

interface ProcessChange {
  (path: string, paths?: string[]): Promise<any>;
}

export interface DebounceFunc {
  (f: any, delay: number): void;
}

export type DebounceOptions = {
  debounce: DebounceFunc;
  delay: number;
};

class DebounceProcess {
  debounced: Map<string, any> = new Map();
  debounce: DebounceFunc;
  delay: number;

  constructor(
    public func: (path: string) => void,
    { debounce = lodashDebounce, delay = 500 }: Partial<DebounceOptions>
  ) {
    this.debounce = debounce;
    this.delay = delay;
  }

  run(path: string) {
    let f = this.debounced.get(path);
    if (f == null) {
      f = this.debounce(() => this.func(path), this.delay);
      this.debounced.set(path, f);
    }
    f();
  }
}

export class ChangeTracker {
  changed: Map<string, void> = new Map();

  // process requests - field paths in the order of changes, debounced
  requests: string[] = [];

  isProcessing = false;
  processingPromise: Promise<void> = Promise.resolve();

  debounceProcess: DebounceProcess;
  bulkProcess: boolean;

  constructor(
    public process: ProcessChange,
    options: Partial<DebounceOptions>,
    bulkProcess: boolean
  ) {
    this.debounceProcess = new DebounceProcess(
      (path: string) => this.makeRequest(path),
      options
    );
    this.bulkProcess = bulkProcess;
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

    if (this.bulkProcess && requests.length > 1) {
      const r = await this.process("", requests);
      this.isProcessing = false;
      return r;
    }

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
