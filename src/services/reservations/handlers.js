import { createReservationSlice } from '../../application/slices/reservations/create-reservation.js';
import { cancelReservationSlice } from '../../application/slices/reservations/cancel-reservation.js';
// Factory de handlers no formato de função serverless (AWS Lambda, Azure Functions etc.).
export function makeReservationHandlers(deps) {
  const create=createReservationSlice(deps), cancel=cancelReservationSlice(deps);
  return {
    create: async ({ principal, body }) => create({ tenantId:principal.tenantId, actorId:principal.sub, ...body }),
    cancel: async ({ principal, params }) => cancel({ tenantId:principal.tenantId, actorId:principal.sub, reservationId:params.id }),
    list: async ({ principal }) => deps.reservations.list(principal.tenantId)
  };
}
