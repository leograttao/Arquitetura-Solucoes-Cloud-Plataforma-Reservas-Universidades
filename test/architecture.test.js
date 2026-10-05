import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../src/', import.meta.url));

async function walk(dir) {
  const files = [];

  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await walk(path));
    } else if (path.endsWith('.js')) {
      files.push(path);
    }
  }

  return files;
}

test(
  'domínio e casos de uso não dependem de adaptadores, gateway ou BFF',
  async () => {
    for (const path of await walk(root)) {
      const normalizedPath = path.replaceAll('\\', '/');

      if (
        !normalizedPath.includes('/domain/') &&
        !normalizedPath.includes('/application/')
      ) {
        continue;
      }

      const source = await readFile(path, 'utf8');

      assert.doesNotMatch(
        source,
        /from ['"][^'"]*(adapters|gateway|bff|services)\//,
        path
      );
    }
  }
);

test(
  'BFF e gateway não importam adaptadores de infraestrutura diretamente',
  async () => {
    for (const path of await walk(root)) {
      const normalizedPath = path.replaceAll('\\', '/');

      if (
        !normalizedPath.includes('/bff/') &&
        !normalizedPath.includes('/gateway/')
      ) {
        continue;
      }

      const source = await readFile(path, 'utf8');

      assert.doesNotMatch(
        source,
        /from ['"][^'"]*adapters\//,
        path
      );
    }
  }
);

test(
  'slice de reserva depende do domínio e de abstrações, sem acessar outro serviço',
  async () => {
    const path = join(
      root,
      'application',
      'slices',
      'reservations',
      'create-reservation.js'
    );

    const source = await readFile(path, 'utf8');

    assert.doesNotMatch(source, /services\//);
    assert.doesNotMatch(source, /adapters\//);
  }
);