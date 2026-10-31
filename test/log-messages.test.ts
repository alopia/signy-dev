import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { getLogMessage, logger } from 'signy';
import { LOG_MESSAGES } from '../src';
import { expectLogged, ignoreLogged } from './support/console';

// The ids are only in Signy's source, the npm package types them as string.
// CI checks out the tag of the installed version, see .github/workflows/ci.yml.
const SIGNY_SRC = join(process.env['SIGNY_DIR'] ?? resolve('../signy'), 'src');
const HAS_SIGNY_SRC = existsSync(SIGNY_SRC);

/** Every message id Signy defines, read from its `log-messages.ts` files. */
function signyMessageIds(): string[] {
  const ids = new Set<string>();
  for (const entry of readdirSync(SIGNY_SRC, {
    recursive: true,
    encoding: 'utf8',
  })) {
    if (!entry.endsWith('log-messages.ts')) continue;
    const source = readFileSync(join(SIGNY_SRC, entry), 'utf8');
    for (const [, id] of source.matchAll(
      /^\s+[A-Z_]+: '([a-z]+:[a-z0-9-]+)'/gm
    )) {
      ids.add(id!);
    }
  }
  return [...ids].sort();
}

describe('log messages', () => {
  it('registers the resolver on import', () => {
    expect(getLogMessage('app:not-mounted')).toBe(
      'Application is not mounted.'
    );
  });

  it('prints the text next to the id', () => {
    logger.error('app:not-mounted');
    try {
      expectLogged('error', 'Application is not mounted.');
    } finally {
      ignoreLogged();
    }
  });

  it.skipIf(!HAS_SIGNY_SRC)('has a text for every id Signy defines', () => {
    const ids = signyMessageIds();
    expect(ids.length).toBeGreaterThan(30);
    expect(ids.filter((id) => !LOG_MESSAGES[id])).toEqual([]);
  });

  it.skipIf(!HAS_SIGNY_SRC)('has no text for an id Signy dropped', () => {
    const ids = new Set(signyMessageIds());
    expect(Object.keys(LOG_MESSAGES).filter((id) => !ids.has(id))).toEqual([]);
  });

  it('links to the Signy issue tracker', () => {
    expect(LOG_MESSAGES['core:defensive-check-failed']).toContain(
      'https://github.com/alopia/signy/issues'
    );
  });
});
