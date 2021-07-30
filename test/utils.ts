export function resolveReactions(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 0);
  });
}

// we have to use a simplistic mock debounce instead of the
// one in lodash, as the lodash one doesn't play well
// with jest's fake timers. we use the lodash one in production
// as it's more robust.
// https://github.com/facebook/jest/issues/3465
export function debounce(f: any, delay: number) {
  let timeout: any = null;
  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(f, delay);
  };
}

export function until() {
  let resolveResult: () => void = () => {
    /* nothing */
  };

  const finished: Promise<void> = new Promise((resolve) => {
    resolveResult = resolve;
  });

  return { resolve: resolveResult, finished };
}
