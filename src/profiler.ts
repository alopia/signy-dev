/**
 * Profiler - Performance Tracking
 *
 * Tracks timing of component lifecycle events, renders, and custom operations.
 * Uses the native Performance API when available.
 *
 * @module signy-dev/profiler
 */

import type { ComponentLike, SignalLike, EffectLike } from 'signy';
import { RingBuffer, WeakRegistry, now, withDefaults } from './helpers';

//=============================================
// Types
//=============================================

/**
 * Performance entry with metadata
 */
export interface PerformanceMetric {
  readonly name: string;
  readonly duration: number;
  readonly startTime: number;
  readonly entryType: 'mark' | 'measure';
}

/**
 * Profiler options
 */
export interface ProfilerOptions {
  /** Enable profiling (default: true) */
  enabled?: boolean;

  /** Prefix for performance entry names (default: 'signy') */
  prefix?: string;

  /** Maximum number of entries to keep, oldest dropped first (default: 1000) */
  maxEntries?: number;

  /**
   * Also put component mounts, unmounts and renders on the browser timeline,
   * for a DevTools Performance recording (default: false). Browsers keep
   * these until cleared, so leave it off outside a recording.
   */
  timeline?: boolean;
}

/**
 * Statistical summary for a single metric
 */
export interface MetricStats {
  readonly count: number;
  readonly total: number;
  readonly avg: number;
  readonly min: number;
  readonly max: number;
}

/**
 * Statistical summary of performance measures by name
 */
export interface PerformanceSummary {
  [metricName: string]: MetricStats;
}

/**
 * Performance report containing marks, measures, and summary statistics
 */
export interface PerformanceReport {
  readonly marks: readonly PerformanceMetric[];
  readonly measures: readonly PerformanceMetric[];
  readonly summary: Readonly<PerformanceSummary>;
}

//=============================================
// Profiler Class
//=============================================

/** Check if Performance API is available */
const hasPerformanceAPI =
  typeof performance !== 'undefined' && typeof performance.mark === 'function';

const DEFAULT_OPTIONS: Required<ProfilerOptions> = {
  enabled: true,
  prefix: 'signy',
  maxEntries: 1000,
  timeline: false,
};

/**
 * Performance profiler using native browser Performance API.
 *
 * Provides automatic naming based on class instances and methods,
 * statistical summaries, and timing tracking.
 */
export class Profiler {
  private _enabled: boolean;
  private readonly _prefix: string;
  private readonly _timeline: boolean;
  // A stack per name, so a nested timing with the same name keeps the outer one
  private readonly _marks = new Map<string, number[]>();
  private readonly _entries: RingBuffer<PerformanceMetric>;
  private readonly _signalWrites = new WeakRegistry<SignalLike, number>();
  private readonly _effectRuns = new WeakRegistry<EffectLike, number>();

  /**
   * Creates a new Profiler instance
   *
   * @param options - Profiler options
   */
  constructor(options: ProfilerOptions = {}) {
    const opts = withDefaults(DEFAULT_OPTIONS, options);
    this._enabled = opts.enabled;
    this._prefix = opts.prefix;
    this._timeline = opts.timeline;
    this._entries = new RingBuffer(opts.maxEntries);
  }

  //=============================================
  // Getters/Setters
  //=============================================

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
  }

  get isAvailable(): boolean {
    return hasPerformanceAPI;
  }

  //=============================================
  // Core Methods
  //=============================================

  /**
   * Start timing an operation
   */
  start(category: string, name: string): void {
    if (!this._enabled) return;

    const markName = this._createMarkName(category, name);
    const starts = this._marks.get(markName);
    if (starts) starts.push(now());
    else this._marks.set(markName, [now()]);
  }

  /**
   * End the most recent timing started with this name and record its duration
   */
  end(category: string, name: string): number | null {
    if (!this._enabled) return null;

    const markName = this._createMarkName(category, name);
    const starts = this._marks.get(markName);
    const startTime = starts?.pop();

    if (startTime === undefined) return null;
    if (starts!.length === 0) this._marks.delete(markName);

    const endTime = now();
    const duration = endTime - startTime;

    this._entries.push({
      name: markName,
      duration,
      startTime,
      entryType: 'measure',
    });

    if (hasPerformanceAPI) {
      try {
        performance.measure(markName, { start: startTime, end: endTime });
      } catch {
        // Ignore if measure fails
      }
    }

    return duration;
  }

  /**
   * Add a simple mark (point in time)
   */
  mark(category: string, name: string): void {
    if (!this._enabled) return;
    this._addMark(this._createMarkName(category, name), true);
  }

  //=============================================
  // Component Tracking
  //=============================================

  /**
   * Track a component mount
   */
  trackComponentMount(component: ComponentLike): void {
    if (!this._enabled) return;
    this._addMark(
      this._createMarkName('component', `${component.name}:mount`),
      this._timeline
    );
  }

  /**
   * Track a component unmount
   */
  trackComponentUnmount(component: ComponentLike): void {
    if (!this._enabled) return;
    this._addMark(
      this._createMarkName('component', `${component.name}:unmount`),
      this._timeline
    );
  }

  /**
   * Track a component render duration
   */
  trackComponentRender(component: ComponentLike, duration: number): void {
    if (!this._enabled) return;

    const name = this._createMarkName('render', component.name);
    const startTime = now() - duration;
    this._entries.push({ name, duration, startTime, entryType: 'measure' });

    if (this._timeline && hasPerformanceAPI) {
      try {
        performance.measure(name, { start: startTime, duration });
      } catch {
        // Ignore if measure fails
      }
    }
  }

  //=============================================
  // Signal Tracking
  //=============================================

  /**
   * Track a signal write
   */
  trackSignalWrite(signal: SignalLike): void {
    if (!this._enabled) return;
    const count = (this._signalWrites.get(signal) ?? 0) + 1;
    this._signalWrites.set(signal, count);
  }

  /**
   * Get signal write counts
   */
  getSignalWriteCounts(): Map<SignalLike, number> {
    return new Map(this._signalWrites.entries());
  }

  //=============================================
  // Effect Tracking
  //=============================================

  /**
   * Track an effect run
   */
  trackEffectRun(effect: EffectLike): void {
    if (!this._enabled) return;
    const count = (this._effectRuns.get(effect) ?? 0) + 1;
    this._effectRuns.set(effect, count);
  }

  /**
   * Get effect run counts
   */
  getEffectRunCounts(): Map<EffectLike, number> {
    return new Map(this._effectRuns.entries());
  }

  //=============================================
  // Reporting
  //=============================================

  /**
   * Get all recorded entries
   */
  getEntries(): readonly PerformanceMetric[] {
    return this._entries.toArray();
  }

  /**
   * Get entries by name pattern
   */
  getEntriesByName(pattern: string | RegExp): readonly PerformanceMetric[] {
    const entries = this._entries.toArray();
    if (typeof pattern === 'string') {
      return entries.filter((e) => e.name.includes(pattern));
    }
    return entries.filter((e) => pattern.test(e.name));
  }

  /**
   * Generate a performance report with statistics
   */
  report(): PerformanceReport {
    const entries = this._entries.toArray();
    const marks = entries.filter((e) => e.entryType === 'mark');
    const measures = entries.filter((e) => e.entryType === 'measure');

    const summary: Record<string, MetricStats> = {};
    for (const { name, duration } of measures) {
      const prev = summary[name];
      const count = (prev?.count ?? 0) + 1;
      const total = (prev?.total ?? 0) + duration;
      summary[name] = {
        count,
        total,
        avg: total / count,
        min: Math.min(prev?.min ?? duration, duration),
        max: Math.max(prev?.max ?? duration, duration),
      };
    }

    return { marks, measures, summary };
  }

  /**
   * Clear all recorded entries
   */
  clear(): void {
    this._entries.clear();
    this._marks.clear();
    this._signalWrites.clear();
    this._effectRuns.clear();

    if (hasPerformanceAPI) {
      try {
        // By name, so marks the app made itself survive
        const prefix = `${this._prefix}:`;
        for (const entry of performance.getEntries()) {
          if (!entry.name.startsWith(prefix)) continue;
          if (entry.entryType === 'mark') performance.clearMarks(entry.name);
          else if (entry.entryType === 'measure') {
            performance.clearMeasures(entry.name);
          }
        }
      } catch {
        // Ignore
      }
    }
  }

  //=============================================
  // Private Methods
  //=============================================

  private _createMarkName(category: string, name: string): string {
    return `${this._prefix}:${category}:${name}`;
  }

  private _addMark(markName: string, timeline: boolean): void {
    this._entries.push({
      name: markName,
      duration: 0,
      startTime: now(),
      entryType: 'mark',
    });

    if (timeline && hasPerformanceAPI) {
      try {
        performance.mark(markName);
      } catch {
        // Ignore
      }
    }
  }
}
