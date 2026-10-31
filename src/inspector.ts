/**
 * Inspector - State and Component Inspection
 *
 * Provides utilities for inspecting component state, signal values,
 * and the reactive dependency graph.
 *
 * @module signy-dev/inspector
 */

import type {
  ComponentLike,
  SignalLike,
  EffectLike,
  ApplicationLike,
} from 'signy';
import { WeakRegistry, safeStringify } from './helpers';

//=============================================
// Types
//=============================================

/**
 * Snapshot of a reactive value
 */
export interface ReactiveSnapshot {
  readonly values: Record<string, unknown>;
  readonly propertyCount: number;
  readonly timestamp: number;
}

/**
 * Information about a component
 */
export interface ComponentInfo {
  readonly id: string;
  readonly name: string;
  readonly isMounted: boolean;
}

/**
 * Information about a signal
 */
export interface SignalInfo {
  readonly id: string;
  readonly value: unknown;
  readonly writeCount: number;
}

/**
 * Information about an effect
 */
export interface EffectInfo {
  readonly name: string;
  readonly runCount: number;
}

/**
 * Application inspection info
 */
export interface AppInfo {
  readonly id: string;
  readonly isMounted: boolean;
}

/**
 * Counts of everything the inspector tracks, across all apps
 */
export interface InspectorCounts {
  readonly components: number;
  readonly signals: number;
  readonly effects: number;
  readonly apps: number;
}

//=============================================
// Inspector Class
//=============================================

/**
 * State and component inspector for debugging.
 *
 * Tracks registered components, signals, and effects,
 * providing inspection and querying capabilities.
 */
export class Inspector {
  private readonly _components = new Map<string, ComponentLike>();
  private readonly _signals = new WeakRegistry<SignalLike, SignalInfo>();
  private readonly _effects = new WeakRegistry<EffectLike, EffectInfo>();
  private readonly _apps = new Map<string, ApplicationLike>();
  private _nextSignalId = 0;

  //=============================================
  // Getters
  //=============================================

  /**
   * Counts of tracked components, signals, effects and apps, across all apps.
   * Components carry no app, so there are no counts per app.
   */
  get counts(): InspectorCounts {
    return {
      components: this._components.size,
      signals: this._signals.size,
      effects: this._effects.size,
      apps: this._apps.size,
    };
  }

  //=============================================
  // Component Registration
  //=============================================

  /**
   * Register a component for tracking
   */
  registerComponent(component: ComponentLike): void {
    this._components.set(component.id, component);
  }

  /**
   * Unregister a component
   */
  unregisterComponent(component: ComponentLike): void {
    this._components.delete(component.id);
  }

  /**
   * Get info about a component
   */
  getComponentInfo(component: ComponentLike): ComponentInfo {
    return {
      id: component.id,
      name: component.name,
      isMounted: component.isMounted,
    };
  }

  /**
   * Get all registered components
   */
  getComponents(): readonly ComponentLike[] {
    return Array.from(this._components.values());
  }

  /**
   * Find component by ID
   */
  findComponent(id: string): ComponentLike | undefined {
    return this._components.get(id);
  }

  //=============================================
  // Signal Registration
  //=============================================

  /**
   * Register a signal for tracking
   */
  registerSignal(signal: SignalLike, initialValue: unknown): void {
    this._signals.set(signal, {
      id: `signal-${this._nextSignalId++}`,
      value: initialValue,
      writeCount: 0,
    });
  }

  /**
   * Track a write to a registered signal. Takes the value from the caller, so
   * the inspector never reads `signal.value` and gets tracked by an effect.
   */
  trackSignalWrite(signal: SignalLike, nextValue: unknown): void {
    const info = this._signals.get(signal);
    if (!info) return;
    this._signals.set(signal, {
      ...info,
      value: nextValue,
      writeCount: info.writeCount + 1,
    });
  }

  /**
   * Get info about a signal
   */
  getSignalInfo(signal: SignalLike): SignalInfo | undefined {
    return this._signals.get(signal);
  }

  /**
   * Get all tracked signals
   */
  getSignals(): readonly SignalLike[] {
    return this._signals.keys();
  }

  //=============================================
  // Effect Registration
  //=============================================

  /**
   * Register an effect for tracking
   */
  registerEffect(effect: EffectLike): void {
    this._effects.set(effect, {
      name: effect.name ?? 'anonymous',
      runCount: 0,
    });
  }

  /**
   * Unregister an effect
   */
  unregisterEffect(effect: EffectLike): void {
    this._effects.delete(effect);
  }

  /**
   * Track an effect run
   */
  trackEffectRun(effect: EffectLike): void {
    const info = this._effects.get(effect);
    if (!info) return;
    this._effects.set(effect, { ...info, runCount: info.runCount + 1 });
  }

  /**
   * Get info about an effect
   */
  getEffectInfo(effect: EffectLike): EffectInfo | undefined {
    return this._effects.get(effect);
  }

  /**
   * Get all tracked effects
   */
  getEffects(): readonly EffectLike[] {
    return this._effects.keys();
  }

  //=============================================
  // Application Registration
  //=============================================

  /**
   * Register an application for tracking
   */
  registerApp(app: ApplicationLike): void {
    this._apps.set(app.id, app);
  }

  /**
   * Unregister an application
   */
  unregisterApp(app: ApplicationLike): void {
    this._apps.delete(app.id);
  }

  /**
   * Get info about an application
   */
  getAppInfo(app: ApplicationLike): AppInfo {
    return {
      id: app.id,
      isMounted: app.isMounted,
    };
  }

  /**
   * Get all registered applications
   */
  getApps(): readonly ApplicationLike[] {
    return Array.from(this._apps.values());
  }

  //=============================================
  // Utility Methods
  //=============================================

  /**
   * Take a snapshot of a reactive object's current state
   */
  static snapshot(obj: object, maxDepth = 3): ReactiveSnapshot {
    const values = Inspector.deepClone(obj, maxDepth);
    return {
      values: values as Record<string, unknown>,
      propertyCount: Object.keys(values as object).length,
      timestamp: Date.now(),
    };
  }

  /**
   * Deep clone an object for inspection (to prevent mutations)
   */
  static deepClone(obj: unknown, maxDepth = 3, currentDepth = 0): unknown {
    if (currentDepth >= maxDepth) {
      return '[max depth reached]';
    }

    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) =>
        Inspector.deepClone(item, maxDepth, currentDepth + 1)
      );
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (obj instanceof Map) {
      return new Map(
        Array.from(obj.entries()).map(([k, v]) => [
          k,
          Inspector.deepClone(v, maxDepth, currentDepth + 1),
        ])
      );
    }

    if (obj instanceof Set) {
      return new Set(
        Array.from(obj.values()).map((v) =>
          Inspector.deepClone(v, maxDepth, currentDepth + 1)
        )
      );
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = Inspector.deepClone(value, maxDepth, currentDepth + 1);
    }
    return result;
  }

  /**
   * Stringify an object for display
   */
  static stringify(obj: unknown, maxDepth = 2): string {
    try {
      return safeStringify(obj, maxDepth);
    } catch {
      // A getter that throws
      return '[non-serializable]';
    }
  }

  //=============================================
  // Cleanup
  //=============================================

  /**
   * Clear all tracked data
   */
  clear(): void {
    this._components.clear();
    this._signals.clear();
    this._effects.clear();
    this._apps.clear();
  }
}
