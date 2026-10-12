import { randomUUID } from 'node:crypto';
import {
  assertUniversityRequest,
  UniversityStatus
} from '../../../domain/universities/model.js';

// Caso de uso mantido para solicitações futuras; a demonstração oficial
// cadastra universidades diretamente pela administração da plataforma.
export function registerUniversitySlice({
  universities,
  events,
  clock = () => new Date()
}) {
  return async function registerUniversity(command) {
    const normalized = assertUniversityRequest(command);
    const item = {
      id: randomUUID(),
      ...normalized,
      status: UniversityStatus.PENDING,
      createdAt: clock().toISOString()
    };
    const saved = await universities.save(item);

    await events.publish({
      id: randomUUID(),
      type: 'UniversityRegistered',
      tenantId: saved.id,
      occurredAt: clock().toISOString(),
      payload: {
        universityId: saved.id,
        name: saved.name,
        domains: saved.domains
      }
    });

    return saved;
  };
}
