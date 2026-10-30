import { Component, features, getDevToolsHook, html } from 'signy';
import {
  createInspectorFeature,
  createProfilerFeature,
  disableDevTools,
  enableDevTools,
} from '../src';
import { expectLogged } from './support/console';
import { mount } from './support/mount';

class Empty extends Component {
  protected render() {
    return html`<p>empty</p>`;
  }
}

describe('enableDevTools', () => {
  it('installs the profiler and inspector by default', () => {
    const devTools = enableDevTools();

    expect(devTools.installedFeatures).toEqual([
      'signy-dev:profiler',
      'signy-dev:inspector',
    ]);
    expect(devTools.profiler).toBeDefined();
    expect(devTools.inspector).toBeDefined();
    expect(devTools.eventLogger).toBeUndefined();
  });

  it('installs only the tools asked for', () => {
    const devTools = enableDevTools({
      profiler: false,
      inspector: false,
      eventLogger: true,
    });

    expect(devTools.installedFeatures).toEqual(['signy-dev:event-logger']);
  });

  it('cleanup() removes its own features and nothing else', () => {
    const other = features.install({
      id: 'test:other',
      name: 'Other',
      install() {},
    });
    const devTools = enableDevTools({ eventLogger: true });

    devTools.cleanup();

    expect(features.installed).toContain('test:other');
    expect(features.installed.some((id) => id.startsWith('signy-dev:'))).toBe(
      false
    );
    other();
  });

  it('disableDevTools() keeps features it does not own', () => {
    const other = features.install({
      id: 'test:other',
      name: 'Other',
      install() {},
    });
    enableDevTools();

    disableDevTools();

    expect(features.installed).toContain('test:other');
    other();
  });

  it('a second call replaces the first', () => {
    const first = enableDevTools();

    const second = enableDevTools();

    expect(first.installedFeatures).toEqual([]);
    expect(second.installedFeatures).toEqual([
      'signy-dev:profiler',
      'signy-dev:inspector',
    ]);
  });

  it('a feature that fails to install takes back the ones before it', () => {
    const manual = features.install(createInspectorFeature());

    expect(() => enableDevTools()).toThrow('already installed');

    expectLogged('error', 'feature:already-installed');
    expect(
      features.installed.filter((id) => id.startsWith('signy-dev:'))
    ).toEqual(['signy-dev:inspector']);
    manual();
  });

  it('a stale cleanup() leaves a later feature with the same id', () => {
    const devTools = enableDevTools();
    disableDevTools();
    const manual = features.install(createProfilerFeature());

    devTools.cleanup();

    expect(features.isInstalled('signy-dev:profiler')).toBe(true);
    manual();
  });

  it('an undefined option keeps its default', () => {
    const devTools = enableDevTools({ profiler: undefined });

    expect(devTools.profiler).toBeDefined();
  });

  it('the hook still sees apps after disableDevTools() and enableDevTools()', () => {
    enableDevTools();
    disableDevTools();
    enableDevTools();
    const seen: string[] = [];
    const off = getDevToolsHook()!.on('app:mount', (app) => seen.push(app.id));

    const app = mount(Empty);

    expect(seen).toEqual([app.id]);
    off();
  });
});
