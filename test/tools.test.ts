import { Component, Computed, Signal, effect, flushAll, html } from 'signy';
import { enableDevTools } from '../src';
import { ignoreLogged } from './support/console';
import { mount } from './support/mount';

let counter: Counter | undefined;

class Broken extends Component {
  protected render(): never {
    throw new Error('broken');
  }
}

class Counter extends Component {
  readonly count = new Signal(0);
  runs = 0;

  protected render() {
    counter = this;
    effect(
      () => {
        this.runs = this.count.value;
      },
      undefined,
      { name: 'counter' }
    );
    return html`<p>${() => this.count.value}</p>`;
  }
}

describe('tools with a mounted app', () => {
  it('the profiler marks mounts and unmounts', () => {
    const { profiler } = enableDevTools({ inspector: false });

    const app = mount(Counter);
    app.unmount();

    expect(profiler!.report().marks.map((m) => m.name)).toEqual([
      'signy:component:Counter:mount',
      'signy:component:Counter:unmount',
    ]);
  });

  it('the inspector lists mounted components and apps', () => {
    const { inspector } = enableDevTools({ profiler: false });

    const app = mount(Counter);

    expect(inspector!.getComponents().map((c) => c.name)).toEqual(['Counter']);
    expect(inspector!.getApps().map((a) => a.id)).toEqual([app.id]);

    app.unmount();

    expect(inspector!.getComponents()).toEqual([]);
    expect(inspector!.getApps()).toEqual([]);
  });

  it('the inspector and the event logger see child components', () => {
    class Leaf extends Component {
      protected render() {
        return html`<i>leaf</i>`;
      }
    }
    class Tree extends Component {
      protected render() {
        return html`<section><${Leaf} /></section>`;
      }
    }
    const { inspector, eventLogger } = enableDevTools({
      profiler: false,
      eventLogger: true,
    });

    const app = mount(Tree);

    expect(inspector!.getComponents().map((c) => c.name)).toEqual([
      'Leaf',
      'Tree',
    ]);
    const leaf = eventLogger!
      .getByType('component:mount')
      .find((e) => e.name === 'Leaf');
    expect(leaf?.data).toMatchObject({ target: 'SECTION' });

    app.unmount();
    expect(inspector!.getComponents()).toEqual([]);
  });

  it('the inspector counts effect runs and drops disposed effects', () => {
    const { inspector } = enableDevTools({ profiler: false });
    const app = mount(Counter);
    counter!.count.value = 1;
    flushAll();

    const named = inspector!.getEffects().filter((e) => e.name === 'counter');
    expect(named).toHaveLength(1);
    expect(inspector!.getEffectInfo(named[0]!)!.runCount).toBe(2);

    app.unmount();

    expect(inspector!.getEffects()).toEqual([]);
  });

  it('the event logger logs signal writes, effect runs and disposals', () => {
    const { eventLogger } = enableDevTools({
      profiler: false,
      inspector: false,
      eventLogger: true,
    });
    const app = mount(Counter);
    counter!.count.value = 1;
    flushAll();
    app.unmount();

    const types = new Set(eventLogger!.entries.map((e) => e.type));
    expect([...types]).toEqual(
      expect.arrayContaining([
        'app:mount',
        'app:unmount',
        'component:create',
        'component:mount',
        'signal:write',
        'effect:create',
        'effect:run',
        'effect:dispose',
        'component:unmount',
      ])
    );
    expect(eventLogger!.getByType('signal:write')[0]!.data).toEqual({
      prev: 0,
      next: 1,
    });
  });
});

describe('Signy events', () => {
  it('the inspector lists signals (signalCreate)', () => {
    const { inspector } = enableDevTools({ profiler: false });
    mount(Counter);

    expect(inspector!.getSignals().length).toBeGreaterThan(0);
  });

  it('the profiler times renders (componentRender)', () => {
    const { profiler } = enableDevTools({ inspector: false });
    mount(Counter);

    expect(profiler!.report().summary['signy:render:Counter']).toBeDefined();
  });

  it('the event logger logs signal creation (signalCreate)', () => {
    const { eventLogger } = enableDevTools({
      profiler: false,
      inspector: false,
      eventLogger: true,
    });
    mount(Counter);

    expect(eventLogger!.getByType('signal:create').length).toBeGreaterThan(0);
  });

  it('the event logger logs computed creation and invalidation', () => {
    const { eventLogger } = enableDevTools({
      profiler: false,
      inspector: false,
      eventLogger: true,
    });
    const source = new Signal(1);
    const double = new Computed(() => source.value * 2);
    double.value;
    source.value = 2;

    expect(eventLogger!.getByType('computed:create')).toHaveLength(1);
    expect(eventLogger!.getByType('computed:invalidate')).toHaveLength(1);
  });

  it('the event logger logs component errors (componentError)', () => {
    const { eventLogger } = enableDevTools({
      profiler: false,
      inspector: false,
      eventLogger: true,
    });
    try {
      mount(Broken);
    } catch {
      // The error itself is not under test
    }
    ignoreLogged();

    expect(eventLogger!.getByType('component:error')).toHaveLength(1);
  });
});
