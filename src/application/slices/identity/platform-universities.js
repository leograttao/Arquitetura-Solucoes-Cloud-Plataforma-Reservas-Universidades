import { randomUUID } from 'node:crypto';
import {
  assertUniversityRequest,
  UniversityStatus
} from '../../../domain/universities/model.js';

export function makePlatformUniversityUseCases({
  identity,
  hashPassword,
  events,
  clock = () => new Date()
}) {
  return {
    list: (query) => identity.listUniversities(query),

    create: async ({ name, domains }) => {
      const normalized = assertUniversityRequest({ name, domains });
      const now = clock().toISOString();

      const university = await identity.saveUniversity({
        id: randomUUID(),
        ...normalized,
        status: UniversityStatus.ACTIVE,
        createdAt: now,
        updatedAt: now
      });

      await events?.publish({
        id: randomUUID(),
        type: 'UniversityCreated',
        tenantId: university.id,
        occurredAt: now,
        payload: {
          universityId: university.id,
          name: university.name
        }
      });

      return university;
    },

    update: async ({ id, name, domains, status }) => {
      const current = await identity.findUniversity(id);

      if (!current) {
        throw Object.assign(new Error('Universidade não encontrada.'), {
          statusCode: 404
        });
      }

      const normalized = assertUniversityRequest({
        name: name ?? current.name,
        domains: domains ?? current.domains
      });

      const nextStatus = status ?? current.status;

      if (
        ![UniversityStatus.ACTIVE, UniversityStatus.SUSPENDED]
          .includes(nextStatus)
      ) {
        throw new Error('Status de universidade inválido.');
      }

      return identity.saveUniversity({
        ...current,
        ...normalized,
        status: nextStatus,
        updatedAt: clock().toISOString()
      });
    },

    remove: async ({ id }) => {
      const removed = await identity.deleteUniversity(id);

      if (!removed) {
        throw Object.assign(new Error('Universidade não encontrada.'), {
          statusCode: 404
        });
      }

      return { id, removed: true };
    },

    createAdmin: async ({ universityId, name, email, password }) => {
      const university = await identity.findUniversity(universityId);

      if (!university) {
        throw Object.assign(new Error('Universidade não encontrada.'), {
          statusCode: 404
        });
      }

      if (university.status !== UniversityStatus.ACTIVE) {
        throw new Error('Ative a universidade antes de criar o administrador.');
      }

      if (!name?.trim()) {
        throw new Error('Nome do administrador é obrigatório.');
      }

      if (String(password ?? '').length < 8) {
        throw new Error('A senha precisa ter pelo menos 8 caracteres.');
      }

      const normalizedEmail = String(email ?? '').trim().toLowerCase();
      const domain = normalizedEmail.split('@').at(-1);

      if (!university.domains.includes(domain)) {
        throw new Error(
          'O e-mail do administrador precisa pertencer a um domínio cadastrado para a universidade.'
        );
      }

      if (await identity.findUserByEmail(normalizedEmail)) {
        throw Object.assign(new Error('Este e-mail já possui cadastro.'), {
          statusCode: 409
        });
      }

      const user = await identity.saveUser({
        id: randomUUID(),
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: hashPassword(password),
        role: 'admin',
        tenantId: university.id,
        status: 'active',
        emailVerifiedAt: clock().toISOString(),
        createdAt: clock().toISOString()
      });

      const { passwordHash, ...safeUser } = user;
      return safeUser;
    }
  };
}