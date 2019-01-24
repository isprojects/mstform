// a way to wait for all reactions to have been resolved
export function resolveReactions() {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, 0);
  });
}
