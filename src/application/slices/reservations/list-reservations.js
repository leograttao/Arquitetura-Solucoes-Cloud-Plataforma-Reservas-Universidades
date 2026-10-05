export function listReservationsSlice({ reservations }) {
  return async function listReservations({ tenantId }) {
    if (!tenantId) {
      throw new Error('Tenant é obrigatório.');
    }

    return reservations.list(tenantId);
  };
}