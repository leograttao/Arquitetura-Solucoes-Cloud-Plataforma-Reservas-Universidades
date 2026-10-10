import { normalizeDomains } from '../../../domain/universities/model.js';

export function makeUniversityAdminUseCases({
  identity,
  universities,
  clock = () => new Date()
}) {
  return {
    listStudents: ({ principal }) =>
      identity.listStudents(principal.tenantId),

    removeStudent: async ({ principal, studentId }) => {
      const removed = await identity.deleteStudent(
        principal.tenantId,
        studentId
      );

      if (!removed) {
        throw Object.assign(
          new Error('Aluno não encontrado nesta universidade.'),
          { statusCode: 404 }
        );
      }

      return { id: studentId, removed: true };
    },

    updateDomains: async ({ principal, domains }) => {
      const university = await universities.findUniversity(
        principal.tenantId
      );

      if (!university) {
        throw Object.assign(new Error('Universidade não encontrada.'), {
          statusCode: 404
        });
      }

      const saved = await universities.saveUniversity({
        ...university,
        domains: normalizeDomains(domains),
        updatedAt: clock().toISOString()
      });

      return {
        id: saved.id,
        name: saved.name,
        domains: saved.domains,
        status: saved.status
      };
    }
  };
}