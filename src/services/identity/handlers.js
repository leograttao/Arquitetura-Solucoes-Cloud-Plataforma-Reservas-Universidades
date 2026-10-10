import { makeIdentityAuth } from '../../application/slices/identity/auth.js';
import { makePlatformUniversityUseCases } from '../../application/slices/identity/platform-universities.js';
import { makeUniversityAdminUseCases } from '../../application/slices/identity/university-admin.js';
import {
  hashPassword,
  verifyPassword
} from '../../adapters/security/passwords.js';

export function makeIdentityHandlers({ identity, universities, events }) {
  const auth = makeIdentityAuth({
    identity,
    universities,
    hashPassword,
    verifyPassword,
    events
  });

  const platform = makePlatformUniversityUseCases({
    identity,
    hashPassword,
    events
  });

  const universityAdmin = makeUniversityAdminUseCases({
    identity,
    universities
  });

  return {
    registerStudent: ({ body }) => auth.registerStudent(body),
    verifyStudent: ({ body }) => auth.verifyStudent(body),
    login: ({ body }) => auth.login(body),

    listUniversities: ({ query }) =>
      platform.list({
        search: query?.search ?? '',
        activeOnly: true
      }),

    listAllUniversities: () =>
      platform.list({ activeOnly: false }),

    createUniversity: ({ body }) =>
      platform.create(body),

    updateUniversity: ({ params, body }) =>
      platform.update({ id: params.id, ...body }),

    removeUniversity: ({ params }) =>
      platform.remove({ id: params.id }),

    createUniversityAdmin: ({ params, body }) =>
      platform.createAdmin({
        universityId: params.id,
        ...body
      }),

    listStudents: ({ principal }) =>
      universityAdmin.listStudents({ principal }),

    getOwnUniversity: async ({ principal }) => {
      const university = await universities.findUniversity(
        principal.tenantId
      );

      if (!university) {
        throw Object.assign(new Error('Universidade não encontrada.'), {
          statusCode: 404
        });
      }

      return university;
    },

    removeStudent: ({ principal, params }) =>
      universityAdmin.removeStudent({
        principal,
        studentId: params.id
      }),

    updateDomains: ({ principal, body }) =>
      universityAdmin.updateDomains({
        principal,
        domains: body.domains
      }),

    verifyToken: async (token) =>
      identity.findSession(token),

    logout: async ({ token }) =>
      identity.revokeSession(token)
  };
}