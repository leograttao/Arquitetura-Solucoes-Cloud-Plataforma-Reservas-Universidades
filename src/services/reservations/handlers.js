import { createReservationSlice } from '../../application/slices/reservations/create-reservation.js';
import { cancelReservationSlice } from '../../application/slices/reservations/cancel-reservation.js';

// Cria os handlers do serviço de reservas.
// Eles organizam os dados recebidos antes de chamar os casos de uso.
export function makeReservationHandlers(deps) {
  const create = createReservationSlice(deps);
  const cancel = cancelReservationSlice(deps);

  return {
    create: async ({ principal, body }) =>
      create({
        tenantId: principal.tenantId,
        actorId: principal.sub,
        ...body
      }),

    cancel: async ({ principal, params }) =>
      cancel({
        tenantId: principal.tenantId,
        actorId: principal.sub,
        reservationId: params.id
      }),

    list: async ({ principal }) =>
      deps.reservations.list(principal.tenantId),

    listMine: async ({ principal }) =>
      deps.reservations.listByActor(principal.tenantId, principal.sub),

    listMineWaitlist: async ({ principal }) =>
      deps.waitlist.listByActor(principal.tenantId, principal.sub),

    isAvailable: async ({ principal, query }) =>
      deps.reservations.isAvailable({
        tenantId: principal.tenantId,
        ...query
      })
  };
}