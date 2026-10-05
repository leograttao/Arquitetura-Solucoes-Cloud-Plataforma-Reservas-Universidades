import { createReservationSlice } from '../../application/slices/reservations/create-reservation.js';
import { cancelReservationSlice } from '../../application/slices/reservations/cancel-reservation.js';
import { listReservationsSlice } from '../../application/slices/reservations/list-reservations.js';

export function makeReservationHandlers(deps) {
  const createReservation = createReservationSlice(deps);
  const cancelReservation = cancelReservationSlice(deps);
  const listReservations = listReservationsSlice(deps);

  return {
    create: async ({ principal, body }) =>
      createReservation({
        tenantId: principal.tenantId,
        actorId: principal.sub,
        ...body
      }),

    cancel: async ({ principal, params }) =>
      cancelReservation({
        tenantId: principal.tenantId,
        actorId: principal.sub,
        reservationId: params.id
      }),

    list: async ({ principal }) =>
      listReservations({
        tenantId: principal.tenantId
      })
  };
}