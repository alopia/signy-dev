import { defineConfig } from 'tsup';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
});
