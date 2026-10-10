import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../src/', import.meta.url));

async function walk(directory) {
  const files = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await walk(path));
    } else if (path.endsWith('.js')) {
      files.push(path);
    }
  }

  return files;
}

function normalizedPath(path) {
  return path.replaceAll('\\', '/');
}

test('domínio e casos de uso não dependem de adaptadores, gateway ou BFF', async () => {
  for (const path of await walk(root)) {
    const filePath = normalizedPath(relative(root, path));

    if (!filePath.startsWith('domain/') && !filePath.startsWith('application/')) {
      continue;
    }

    const source = await readFile(path, 'utf8');

    assert.doesNotMatch(
      source,
      /from ['"][^'"]*(adapters|gateway|bff|services)\//,
      filePath
    );
  }
});

test('BFF e gateway não importam adaptadores de infraestrutura diretamente', async () => {
  for (const path of await walk(root)) {
    const filePath = normalizedPath(relative(root, path));

    if (!filePath.startsWith('bff/') && !filePath.startsWith('gateway/')) {
      continue;
    }

    const source = await readFile(path, 'utf8');

    assert.doesNotMatch(source, /from ['"][^'"]*adapters\//, filePath);
  }
});

test('slice de reserva depende de portas e domínio, sem acessar outro serviço', async () => {
  const path = join(root, 'application', 'slices', 'reservations', 'create-reservation.js');
  const source = await readFile(path, 'utf8');

  assert.doesNotMatch(source, /services\//);
  assert.doesNotMatch(source, /adapters\//);
});