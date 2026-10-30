import { Profiler } from '../src';

describe('Profiler', () => {
  it('times an operation', () => {
    const profiler = new Profiler();

    profiler.start('task', 'load');
    const duration = profiler.end('task', 'load');

    expect(duration).toBeGreaterThanOrEqual(0);
    expect(profiler.report().summary['signy:task:load']!.count).toBe(1);
    expect(performance.getEntriesByType('measure').map((m) => m.name)).toEqual([
      'signy:task:load',
    ]);
  });

  it('keeps the outer timing when the same name is nested', () => {
    const profiler = new Profiler();

    profiler.start('task', 'load');
    profiler.start('task', 'load');

    expect(profiler.end('task', 'load')).not.toBeNull();
    expect(profiler.end('task', 'load')).not.toBeNull();
    expect(profiler.end('task', 'load')).toBeNull();
  });

  it('end() without start() returns null', () => {
    expect(new Profiler().end('task', 'load')).toBeNull();
  });

  it('summarises measures by name', () => {
    const profiler = new Profiler();
    const component = { id: 'c-1', name: 'Card', isMounted: true };
    profiler.trackComponentRender(component, 2);
    profiler.trackComponentRender(component, 4);

    expect(profiler.report().summary['signy:render:Card']).toEqual({
      count: 2,
      total: 6,
      avg: 3,
      min: 2,
      max: 4,
    });
  });

  it('keeps the newest maxEntries entries', () => {
    const profiler = new Profiler({ maxEntries: 2 });
    profiler.mark('task', 'a');
    profiler.mark('task', 'b');
    profiler.mark('task', 'c');

    expect(profiler.getEntries().map((e) => e.name)).toEqual([
      'signy:task:b',
      'signy:task:c',
    ]);
  });

  it('finds entries by string or RegExp', () => {
    const profiler = new Profiler({ prefix: 'app' });
    profiler.mark('task', 'load');
    profiler.mark('task', 'save');

    expect(profiler.getEntriesByName('load').map((e) => e.name)).toEqual([
      'app:task:load',
    ]);
    expect(profiler.getEntriesByName(/^app:task:/)).toHaveLength(2);
  });

  it('records nothing while disabled', () => {
    const profiler = new Profiler({ enabled: false });
    profiler.start('task', 'load');
    profiler.mark('task', 'tick');

    expect(profiler.end('task', 'load')).toBeNull();
    expect(profiler.getEntries()).toEqual([]);
  });

  it('keeps component events off the browser timeline by default', () => {
    const profiler = new Profiler();
    const component = { id: 'c-1', name: 'Card', isMounted: true };
    profiler.trackComponentMount(component);
    profiler.trackComponentRender(component, 2);
    profiler.trackComponentUnmount(component);

    expect(profiler.getEntries()).toHaveLength(3);
    expect(performance.getEntries()).toEqual([]);
  });

  it('puts component events on the browser timeline with timeline: true', () => {
    const profiler = new Profiler({ timeline: true });
    const component = { id: 'c-1', name: 'Card', isMounted: true };
    profiler.trackComponentMount(component);
    profiler.trackComponentRender(component, 2);
    profiler.trackComponentUnmount(component);

    // Sorted by start time, and a render starts before it is reported
    expect(
      performance
        .getEntries()
        .map((e) => `${e.entryType} ${e.name}`)
        .sort()
    ).toEqual([
      'mark signy:component:Card:mount',
      'mark signy:component:Card:unmount',
      'measure signy:render:Card',
    ]);
  });

  it('clear() leaves marks it did not create', () => {
    const profiler = new Profiler();
    performance.mark('app:boot');
    profiler.mark('task', 'tick');

    profiler.clear();

    const names = performance.getEntriesByType('mark').map((m) => m.name);
    expect(names).toEqual(['app:boot']);
    expect(profiler.getEntries()).toEqual([]);
  });
});
