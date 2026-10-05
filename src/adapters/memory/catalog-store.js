import { randomUUID } from 'node:crypto';
import { intervalsOverlap } from '../../domain/catalog/model.js';
import { CatalogRepository } from '../../ports/catalog-repository.js';

export class MemoryCatalogStore extends CatalogRepository {
  #rooms = new Map();
  #blocks = [];

  constructor() {
    super();
  }

  async createRoom({ tenantId, name, capacity }) {
    const room = {
      id: randomUUID(),
      tenantId,
      name,
      capacity
    };

    this.#rooms.set(room.id, room);

    return structuredClone(room);
  }

  async listRooms(tenantId) {
    return [...this.#rooms.values()]
      .filter(room => room.tenantId === tenantId)
      .map(room => structuredClone(room));
  }

  async isAvailable({ tenantId, roomId, startsAt, endsAt }) {
    const room = this.#rooms.get(roomId);

    if (!room || room.tenantId !== tenantId) {
      return false;
    }

    return !this.#blocks.some(block =>
      block.tenantId === tenantId &&
      block.roomId === roomId &&
      intervalsOverlap(block, { startsAt, endsAt })
    );
  }

  async blockSlot({ tenantId, roomId, startsAt, endsAt }) {
    const available = await this.isAvailable({
      tenantId,
      roomId,
      startsAt,
      endsAt
    });

    if (!available) {
      throw new Error('Sala inexistente ou horário já bloqueado.');
    }

    const block = {
      id: randomUUID(),
      tenantId,
      roomId,
      startsAt,
      endsAt
    };

    this.#blocks.push(block);

    return structuredClone(block);
  }
}