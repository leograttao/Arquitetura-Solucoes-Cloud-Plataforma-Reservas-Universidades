export function listRoomsSlice({ catalog }) {
  return async function listRooms({ tenantId }) {
    if (!tenantId) {
      throw new Error('Tenant é obrigatório.');
    }

    return catalog.listRooms(tenantId);
  };
}