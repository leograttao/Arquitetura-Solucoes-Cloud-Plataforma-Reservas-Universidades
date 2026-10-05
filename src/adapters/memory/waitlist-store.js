import { WaitlistRepository } from '../../ports/waitlist-repository.js';

export class MemoryWaitlistStore extends WaitlistRepository {
  #items = [];

  constructor() {
    super();
  }
  async enqueue(entry) { this.#items.push(structuredClone(entry)); return structuredClone(entry); }
  async next(tenantId,roomId,startsAt,endsAt) { return this.#items.find(x=>x.tenantId===tenantId&&x.roomId===roomId&&x.startsAt===startsAt&&x.endsAt===endsAt&&x.status==='waiting') ?? null; }
  async remove(tenantId,id) { const x=this.#items.find(x=>x.id===id&&x.tenantId===tenantId); if(x) x.status='promoted'; return x?structuredClone(x):null; }
  async list(tenantId) { return this.#items.filter(x=>x.tenantId===tenantId).map(x=>structuredClone(x)); }
}
