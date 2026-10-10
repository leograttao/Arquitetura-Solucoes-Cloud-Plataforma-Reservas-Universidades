import { randomUUID } from 'node:crypto';
import { emailDomain } from '../../../domain/universities/model.js';

export function makeIdentityAuth({
  identity,
  universities,
  hashPassword,
  verifyPassword,
  events,
  clock = () => new Date()
}) {
  return {
    registerStudent: async ({ universityId, name, email, password }) => {
      const university = await universities.findUniversity(universityId);

      if (!university || university.status !== 'active') {
        throw Object.assign(new Error('Universidade indisponível para cadastro.'), {
          statusCode: 404
        });
      }

      if (!name?.trim()) {
        throw new Error('Nome do aluno é obrigatório.');
      }

      if (String(password ?? '').length < 8) {
        throw new Error('A senha precisa ter pelo menos 8 caracteres.');
      }

      const domain = emailDomain(email);

      if (!university.domains.includes(domain)) {
        throw Object.assign(
          new Error('Use o e-mail institucional de um dos domínios desta universidade.'),
          { statusCode: 403 }
        );
      }

      if (await identity.findUserByEmail(email)) {
        throw Object.assign(new Error('Este e-mail já possui cadastro.'), {
          statusCode: 409
        });
      }

      const user = await identity.saveUser({
        id: randomUUID(),
        name: name.trim(),
        email,
        passwordHash: hashPassword(password),
        role: 'student',
        tenantId: university.id,
        status: 'pending',
        emailVerifiedAt: null,
        createdAt: clock().toISOString()
      });

      const code = await identity.createVerificationCode(user.id);

      await events?.publish({
        id: randomUUID(),
        type: 'StudentVerificationRequested',
        tenantId: university.id,
        occurredAt: clock().toISOString(),
        payload: {
          email: user.email,
          name: user.name,
          code
        }
      });

      if (!events) {
        console.log(`[UniSalas] Código de validação para ${user.email}: ${code}`);
      }

      return {
        message: 'Cadastro iniciado. Enviamos o código de validação para o seu e-mail institucional.'
      };
    },

    verifyStudent: async ({ email, code }) => {
      const user = await identity.findUserByEmail(email);

      if (!user || user.role !== 'student') {
        throw Object.assign(new Error('Cadastro de aluno não encontrado.'), {
          statusCode: 404
        });
      }

      if (user.status === 'active') {
        return { message: 'E-mail já validado.' };
      }

      const valid = await identity.verifyCode(user.id, code);

      if (!valid) {
        throw Object.assign(new Error('Código inválido ou expirado.'), {
          statusCode: 400
        });
      }

      await identity.saveUser({
        ...user,
        status: 'active',
        emailVerifiedAt: clock().toISOString()
      });

      return {
        message: 'E-mail validado. Agora você pode entrar na universidade.'
      };
    },

    login: async ({ email, password }) => {
      const user = await identity.findUserByEmail(email);

      if (!user || !verifyPassword(password, user.passwordHash)) {
        throw Object.assign(new Error('E-mail ou senha inválidos.'), {
          statusCode: 401
        });
      }

      if (user.status !== 'active') {
        const message = user.role === 'student'
          ? 'Valide seu e-mail institucional antes de entrar.'
          : 'A conta está suspensa.';

        throw Object.assign(new Error(message), { statusCode: 403 });
      }

      const { token, principal } = await identity.createSession(user);
      const university = user.tenantId === 'platform'
        ? null
        : await universities.findUniversity(user.tenantId);

      return {
        token,
        principal,
        university: university
          ? { id: university.id, name: university.name }
          : null
      };
    }
  };
}