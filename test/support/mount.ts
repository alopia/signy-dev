import { application, flushAll, type Component } from 'signy';

type App = ReturnType<typeof application>;

const mounted: App[] = [];

/** Mounts `Root` through application() and unmounts it after the test. */
export function mount(Root: new () => Component): App {
  const target = document.createElement('div');
  document.body.append(target);
  const app = application(Root).mount(target);
  mounted.push(app);
  flushAll();
  return app;
}

export function unmountAll(): void {
  for (const app of mounted.splice(0)) {
    if (app.isMounted) app.unmount();
  }
}
