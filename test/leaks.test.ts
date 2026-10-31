import { Signal, createRoot, effect, flushAll } from 'signy';
import { enableDevTools } from '../src';

function churn(count: number): void {
  for (let i = 0; i < count; i++) {
    createRoot((dispose) => {
      const signal = new Signal(0);
      effect(() => {
        void signal.value;
      });
      signal.value = 1;
      flushAll();
      dispose();
    });
  }
}

async function collectGarbage(): Promise<void> {
  // WeakRef targets stay alive until the current job ends
  await new Promise((resolve) => setTimeout(resolve, 0));
  globalThis.gc!();
}

describe('leaks', () => {
  it('the profiler does not keep collected signals and effects', async () => {
    const { profiler } = enableDevTools({ inspector: false });
    churn(100);
    expect(profiler!.getEffectRunCounts().size).toBeGreaterThan(0);

    await collectGarbage();

    expect(profiler!.getSignalWriteCounts().size).toBe(0);
    expect(profiler!.getEffectRunCounts().size).toBe(0);
  });

  it('the inspector drops disposed effects', () => {
    const { inspector } = enableDevTools({ profiler: false });
    churn(10);

    expect(inspector!.getEffects()).toEqual([]);
  });
});
