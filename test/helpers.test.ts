import {
  RingBuffer,
  WeakRegistry,
  safeStringify,
  withDefaults,
} from '../src/helpers';

describe('RingBuffer', () => {
  it('keeps the newest items in order once full', () => {
    const buffer = new RingBuffer<number>(3);
    for (let i = 1; i <= 5; i++) buffer.push(i);

    expect(buffer.toArray()).toEqual([3, 4, 5]);
    expect(buffer.size).toBe(3);
  });

  it('keeps nothing with a capacity of 0', () => {
    const buffer = new RingBuffer<number>(0);
    buffer.push(1);

    expect(buffer.toArray()).toEqual([]);
  });

  it('starts over after clear()', () => {
    const buffer = new RingBuffer<number>(2);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    buffer.clear();
    buffer.push(4);

    expect(buffer.toArray()).toEqual([4]);
  });
});

describe('WeakRegistry', () => {
  it('lists, updates and deletes entries', () => {
    const registry = new WeakRegistry<object, number>();
    const a = {};
    const b = {};
    registry.set(a, 1);
    registry.set(b, 2);
    registry.set(a, 3);
    registry.delete(b);

    expect([...registry.entries()]).toEqual([[a, 3]]);
    expect(registry.size).toBe(1);
  });

  it('is empty after clear()', () => {
    const registry = new WeakRegistry<object, number>();
    const key = {};
    registry.set(key, 1);
    registry.clear();

    expect(registry.get(key)).toBeUndefined();
    expect(registry.keys()).toEqual([]);
  });
});

describe('safeStringify', () => {
  it('marks cycles but not shared references', () => {
    const shared = { n: 1 };
    const value: Record<string, unknown> = { a: shared, b: shared };
    value['self'] = value;

    expect(JSON.parse(safeStringify(value))).toEqual({
      a: { n: 1 },
      b: { n: 1 },
      self: '[Circular]',
    });
  });

  it('writes BigInt, functions, Map and Set', () => {
    const value = {
      big: 10n,
      fn: () => 1,
      map: new Map([['k', 1]]),
      set: new Set([1, 2]),
    };

    expect(JSON.parse(safeStringify(value))).toEqual({
      big: '10n',
      fn: '[Function]',
      map: { k: 1 },
      set: [1, 2],
    });
  });

  it('cuts objects deeper than maxDepth', () => {
    expect(JSON.parse(safeStringify({ a: { b: { c: 1 } } }, 2))).toEqual({
      a: { b: '[max depth reached]' },
    });
  });
});

describe('withDefaults', () => {
  it('keeps a default when the option is undefined', () => {
    const defaults = { a: 1, b: 2 };
    expect(
      withDefaults<{ a?: number; b?: number }>(defaults, { a: undefined, b: 3 })
    ).toEqual({
      a: 1,
      b: 3,
    });
  });
});
