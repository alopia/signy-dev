import { Inspector } from '../src';

describe('Inspector', () => {
  it('tracks signal writes from the value it is given', () => {
    const inspector = new Inspector();
    // Reading .value inside a write handler could get it tracked by an effect
    const signal = {
      get value(): number {
        throw new Error('read');
      },
    };

    inspector.registerSignal(signal, 0);
    inspector.trackSignalWrite(signal, 5);

    expect(inspector.getSignalInfo(signal)).toEqual({
      id: 'signal-0',
      value: 5,
      writeCount: 1,
    });
  });

  it('ignores writes to a signal it never registered', () => {
    const inspector = new Inspector();
    inspector.trackSignalWrite({ value: 1 }, 1);

    expect(inspector.getSignals()).toEqual([]);
  });

  it('counts everything it tracks', () => {
    const inspector = new Inspector();
    inspector.registerComponent({ id: 'c-1', name: 'Card', isMounted: true });
    inspector.registerSignal({ value: 0 }, 0);
    inspector.registerApp({ id: 'app-1', isMounted: true });

    expect(inspector.counts).toEqual({
      components: 1,
      signals: 1,
      effects: 0,
      apps: 1,
    });
    expect(inspector.getAppInfo({ id: 'app-1', isMounted: true })).toEqual({
      id: 'app-1',
      isMounted: true,
    });
  });

  it('snapshot() copies Map, Set and Date and stops at maxDepth', () => {
    const date = new Date(0);
    const source = {
      map: new Map([['k', { deep: { deeper: 1 } }]]),
      set: new Set([1]),
      date,
    };

    const { values, propertyCount } = Inspector.snapshot(source, 3);

    expect(propertyCount).toBe(3);
    expect(values['map']).toEqual(
      new Map([['k', { deep: '[max depth reached]' }]])
    );
    expect(values['set']).toEqual(new Set([1]));
    expect(values['date']).toEqual(date);
    expect(values['date']).not.toBe(date);
  });

  it('stringify() handles cycles and stops at maxDepth', () => {
    const value: Record<string, unknown> = { a: { b: { c: 1 } } };
    value['self'] = value;

    expect(JSON.parse(Inspector.stringify(value))).toEqual({
      a: { b: '[max depth reached]' },
      self: '[Circular]',
    });
  });
});
