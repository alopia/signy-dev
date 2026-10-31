/**
 * Shared helpers for the dev tools.
 *
 * @module signy-dev/helpers
 */

//=============================================
// Time
//=============================================

/**
 * Milliseconds since page load. The one clock every tool uses, so profiler
 * and event logger timestamps line up with each other and the browser timeline.
 */
export function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

//=============================================
// Options
//=============================================

/**
 * Merges `options` over `defaults`, skipping `undefined` so it never clears a
 * default the way a plain spread does.
 */
export function withDefaults<T extends object>(
  defaults: Required<T>,
  options: T
): Required<T> {
  const result = { ...defaults };
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined) (result as Record<string, unknown>)[key] = value;
  }
  return result;
}

//=============================================
// JSON
//=============================================

/**
 * JSON.stringify that never throws on app data. Cycles, BigInt, functions,
 * Map and Set get a readable stand in. Objects deeper than `maxDepth` are cut.
 */
export function safeStringify(
  value: unknown,
  maxDepth = Infinity,
  space: number = 2
): string {
  // Objects on the path from the root to the current value. A repeated object
  // that is not an ancestor is a shared reference, not a cycle.
  const holders: unknown[] = [];
  const sources: unknown[] = [];

  return JSON.stringify(
    value,
    function (this: unknown, _key, current: unknown) {
      if (typeof current === 'bigint') return `${current}n`;
      if (typeof current === 'function') return '[Function]';
      if (typeof current !== 'object' || current === null) return current;

      while (holders.length > 0 && holders[holders.length - 1] !== this) {
        holders.pop();
        sources.pop();
      }
      if (sources.includes(current)) return '[Circular]';
      if (holders.length >= maxDepth) return '[max depth reached]';

      let out: unknown = current;
      if (current instanceof Map) out = Object.fromEntries(current);
      else if (current instanceof Set) out = Array.from(current);

      holders.push(out);
      sources.push(current);
      return out;
    },
    space
  );
}

//=============================================
// RingBuffer
//=============================================

/**
 * Fixed capacity list that drops the oldest item when full.
 */
export class RingBuffer<T> {
  private readonly _items: (T | undefined)[];
  private _start = 0;
  private _size = 0;

  constructor(readonly capacity: number) {
    this._items = new Array<T | undefined>(Math.max(0, capacity));
  }

  get size(): number {
    return this._size;
  }

  push(item: T): void {
    if (this._items.length === 0) return;
    const end = (this._start + this._size) % this._items.length;
    this._items[end] = item;
    if (this._size < this._items.length) this._size++;
    else this._start = (this._start + 1) % this._items.length;
  }

  /** Items from oldest to newest. */
  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this._size; i++) {
      result.push(this._items[(this._start + i) % this._items.length] as T);
    }
    return result;
  }

  clear(): void {
    this._items.fill(undefined);
    this._start = 0;
    this._size = 0;
  }
}

//=============================================
// WeakRegistry
//=============================================

interface WeakEntry<K extends object, V> {
  readonly ref: WeakRef<K>;
  value: V;
}

/**
 * Map that can be listed but does not keep its keys alive, so tracking a
 * signal or effect never stops it from being garbage collected.
 */
export class WeakRegistry<K extends object, V> {
  private _entries = new WeakMap<K, WeakEntry<K, V>>();
  private readonly _refs = new Set<WeakRef<K>>();
  private readonly _finalizer = new FinalizationRegistry<WeakRef<K>>((ref) =>
    this._refs.delete(ref)
  );

  /** Live entries. Collected keys can linger here until finalized. */
  get size(): number {
    let size = 0;
    for (const ref of this._refs) if (ref.deref()) size++;
    return size;
  }

  get(key: K): V | undefined {
    return this._entries.get(key)?.value;
  }

  set(key: K, value: V): void {
    const entry = this._entries.get(key);
    if (entry) {
      entry.value = value;
      return;
    }
    const ref = new WeakRef(key);
    this._entries.set(key, { ref, value });
    this._refs.add(ref);
    this._finalizer.register(key, ref, ref);
  }

  delete(key: K): void {
    const entry = this._entries.get(key);
    if (!entry) return;
    this._entries.delete(key);
    this._refs.delete(entry.ref);
    this._finalizer.unregister(entry.ref);
  }

  *entries(): IterableIterator<[K, V]> {
    for (const ref of this._refs) {
      const key = ref.deref();
      const entry = key && this._entries.get(key);
      if (entry) yield [key, entry.value];
    }
  }

  keys(): K[] {
    return Array.from(this.entries(), ([key]) => key);
  }

  clear(): void {
    for (const ref of this._refs) this._finalizer.unregister(ref);
    this._refs.clear();
    this._entries = new WeakMap();
  }
}
