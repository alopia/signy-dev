# signy-dev

Development tools for Signy: a profiler, a state inspector, an event logger and human readable log messages.

## Installation

Not on npm yet. It will be:

```bash
npm install signy-dev --save-dev
```

## Usage

### Human readable log messages

Importing `signy-dev` registers the texts for Signy's log message ids:

```typescript
import 'signy-dev';
import { getLogMessage } from 'signy';

getLogMessage('app:not-mounted');
// => "Application is not mounted."
```

### Dev tools

```typescript
import { application } from 'signy';
import { enableDevTools } from 'signy-dev';
import { App } from './app';

if (import.meta.env.DEV) {
  const devTools = enableDevTools();

  console.log(devTools.profiler?.report());
  console.log(devTools.inspector?.getComponents());
}

application(App).mount('#app');
```

`enableDevTools()` also creates the global DevTools hook (`window.__SIGNY_DEVTOOLS_HOOK__`) that browser extensions connect to.

## Configuration

```typescript
const devTools = enableDevTools({
  profiler: true, // default: true, or { enabled, prefix, maxEntries, timeline }
  inspector: true, // default: true
  eventLogger: false, // default: false, or { maxEntries, consoleOutput, filter }
  globalHook: true, // default: true
});

devTools.cleanup(); // uninstalls the tools this call installed
```

A second `enableDevTools()` call replaces the first, so hot reload can run the setup again. If a tool fails to install, for example because the same feature was installed by hand, the call removes the tools it already installed and throws.

`disableDevTools()` uninstalls every signy-dev tool and leaves other features alone.

## What each tool sees

- **Profiler:** component mounts, renders and unmounts, signal writes, effect runs, and your own `start()`/`end()`/`mark()` timings. Keeps the newest 1000 entries. Your own timings always go on the browser timeline too. Component mounts, unmounts and renders only do with `timeline: true`, because browsers keep those marks until cleared. Turn it on for a DevTools Performance recording.
- **Inspector:** mounted components, mounted apps, signals with their write counts, effects with their run counts.
- **Event logger:** app mount and unmount, component create, mount, unmount and errors, signal creation and writes, effect creation, runs and disposals, computed creation and invalidations. Keeps the newest 1000 entries.

The tools hold signals and effects weakly, so tracking never keeps one alive. Profiler and event logger timestamps both come from `performance.now()`.

## Production

Keep it out of production builds with a dynamic import:

```typescript
if (import.meta.env.DEV) {
  import('signy-dev').then(({ enableDevTools }) => {
    enableDevTools();
  });
}
```

## Development

```bash
npm install
npm run check
```

Signy comes from npm. The test that every Signy log id has a text reads the ids from Signy's source, so check out `alopia/signy` next to this repo in `../signy`, or set `SIGNY_DIR`. Without it that test is skipped.
