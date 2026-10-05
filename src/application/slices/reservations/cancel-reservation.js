import { randomUUID } from 'node:crypto';
export function cancelReservationSlice({ reservations, events, clock = () => new Date() }) {
  return async function cancelReservation({ tenantId, actorId, reservationId }) {
    const reservation = await reservations.findById(tenantId, reservationId);
    if (!reservation) throw Object.assign(new Error('Reserva não encontrada.'), { statusCode: 404 });
    if (reservation.actorId !== actorId && actorId !== 'platform-admin') throw Object.assign(new Error('Sem permissão para cancelar esta reserva.'), { statusCode: 403 });
    const cancelled = await reservations.cancel(tenantId, reservationId);
    await events.publish({ id: randomUUID(), type: 'ReservationCancelled', tenantId, occurredAt: clock().toISOString(), payload: { reservationId, roomId: reservation.roomId, startsAt: reservation.startsAt, endsAt: reservation.endsAt } });
    return cancelled;
  };
}
