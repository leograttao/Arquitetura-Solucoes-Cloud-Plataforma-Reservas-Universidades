import { ReservationConflict, overlaps } from '../../domain/reservations/model.js';
import { ReservationRepository } from '../../ports/reservation-repository.js';

export class MemoryReservationStore extends ReservationRepository {
  #items = new Map();
  #tail = Promise.resolve();

  constructor() {
    super();
  }
  async createIfAvailable(candidate) {
    let release; const previous=this.#tail; this.#tail=new Promise(r=>release=r); await previous;
    try {
      const conflict=[...this.#items.values()].some(x=>x.tenantId===candidate.tenantId && x.roomId===candidate.roomId && x.status==='confirmed' && overlaps(x,candidate));
      if (conflict) throw new ReservationConflict();
      this.#items.set(candidate.id, structuredClone(candidate)); return structuredClone(candidate);
    } finally { release(); }
  }
  async findById(tenantId,id) { const x=this.#items.get(id); return x?.tenantId===tenantId ? structuredClone(x) : null; }
  async cancel(tenantId,id) { const x=await this.findById(tenantId,id); if (!x) return null; x.status='cancelled'; this.#items.set(id,x); return structuredClone(x); }
  async list(tenantId) { return [...this.#items.values()].filter(x=>x.tenantId===tenantId).map(x=>structuredClone(x)); }
}
