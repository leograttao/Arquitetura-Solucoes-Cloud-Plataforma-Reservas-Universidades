import { randomUUID } from 'node:crypto';
import { ReservationConflict } from '../../../domain/reservations/model.js';
export function promoteNextWaitlistSlice({ reservations, waitlist, events, clock=()=>new Date() }) {
  return async function promoteNext(event) {
    const {tenantId,payload}=event;
    const next=await waitlist.next(tenantId,payload.roomId,payload.startsAt,payload.endsAt);
    if(!next) return {outcome:'empty'};
    const reservation={id:randomUUID(),tenantId,actorId:next.actorId,roomId:next.roomId,startsAt:next.startsAt,endsAt:next.endsAt,status:'confirmed',createdAt:clock().toISOString()};
    try {
      const saved=await reservations.createIfAvailable(reservation);
      await waitlist.remove(tenantId,next.id);
      await events.publish({id:randomUUID(),type:'ReservationPromoted',tenantId,occurredAt:clock().toISOString(),payload:{reservationId:saved.id,waitlistId:next.id,actorId:next.actorId,roomId:next.roomId,startsAt:next.startsAt,endsAt:next.endsAt}});
      return {outcome:'promoted',reservation:saved};
    } catch(error) { if(error instanceof ReservationConflict) return {outcome:'still-conflict'}; throw error; }
  };
}
