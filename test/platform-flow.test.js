import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryIdentityStore } from '../src/adapters/memory/identity-store.js';
import { InMemoryEventBus } from '../src/adapters/events/in-memory-event-bus.js';
import { makeIdentityHandlers } from '../src/services/identity/handlers.js';

test('plataforma cadastra universidade, administrador e permite login', async () => {
  const identity = new MemoryIdentityStore();
  const events = new InMemoryEventBus();
  const handlers = makeIdentityHandlers({
    identity,
    universities: identity,
    events
  });

  const university = await handlers.createUniversity({
    body: {
      name: 'Universidade de Demonstração',
      domains: ['demo.edu.br']
    }
  });

  assert.equal(university.status, 'active');

  const administrator = await handlers.createUniversityAdmin({
    params: { id: university.id },
    body: {
      name: 'Administradora Demo',
      email: 'admin@demo.edu.br',
      password: 'Admin@123'
    }
  });

  assert.equal(administrator.role, 'admin');
  assert.equal(administrator.tenantId, university.id);

  const session = await handlers.login({
    body: {
      email: 'admin@demo.edu.br',
      password: 'Admin@123'
    }
  });

  assert.equal(session.principal.role, 'admin');
  assert.equal(session.principal.tenantId, university.id);
  assert.ok(session.token);
});

test('aluno usa domínio da universidade e só entra após validação', async () => {
  const identity = new MemoryIdentityStore();
  const events = new InMemoryEventBus();
  const handlers = makeIdentityHandlers({
    identity,
    universities: identity,
    events
  });

  const university = await handlers.createUniversity({
    body: {
      name: 'Universidade Acadêmica',
      domains: ['academica.edu.br']
    }
  });

  const registration = await handlers.registerStudent({
    body: {
      universityId: university.id,
      name: 'Aluno Demo',
      email: 'aluno@academica.edu.br',
      password: 'Aluno@123'
    }
  });

  assert.match(registration.message, /Cadastro iniciado/);
  await assert.rejects(
    () => handlers.login({
      body: {
        email: 'aluno@academica.edu.br',
        password: 'Aluno@123'
      }
    }),
    { statusCode: 403 }
  );
});
