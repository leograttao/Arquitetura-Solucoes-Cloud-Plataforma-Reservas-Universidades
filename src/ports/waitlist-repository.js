export class WaitlistRepository {
  async enqueue(_entry) { throw new Error('Not implemented'); }
  async next(_tenantId, _roomId, _startsAt, _endsAt) { throw new Error('Not implemented'); }
  async remove(_tenantId, _id) { throw new Error('Not implemented'); }
}
