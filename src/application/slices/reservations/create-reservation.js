import { randomUUID } from 'node:crypto';
import { assertSlot, ReservationConflict } from '../../../domain/reservations/model.js';
export function createReservationSlice({ reservations, waitlist, events, clock = () => new Date() }) {
  return async function createReservation({ tenantId, actorId, roomId, startsAt, endsAt }) {
    if (!tenantId || !actorId) throw new Error('Contexto autenticado incompleto.');
    assertSlot({ roomId, startsAt, endsAt });
    const reservation = { id: randomUUID(), tenantId, actorId, roomId, startsAt, endsAt, status: 'confirmed', createdAt: clock().toISOString() };
    try {
      const saved = await reservations.createIfAvailable(reservation);
      await events.publish({ id: randomUUID(), type: 'ReservationConfirmed', tenantId, occurredAt: clock().toISOString(), payload: { reservationId: saved.id, roomId, actorId, startsAt, endsAt } });
      return { outcome: 'confirmed', reservation: saved };
    } catch (error) {
      if (!(error instanceof ReservationConflict)) throw error;
      const entry = await waitlist.enqueue({ id: randomUUID(), tenantId, actorId, roomId, startsAt, endsAt, status: 'waiting', createdAt: clock().toISOString() });
      await events.publish({ id: randomUUID(), type: 'WaitlistJoined', tenantId, occurredAt: clock().toISOString(), payload: { waitlistId: entry.id, roomId, actorId, startsAt, endsAt } });
      return { outcome: 'waitlisted', waitlist: entry };
    }
  };
}
