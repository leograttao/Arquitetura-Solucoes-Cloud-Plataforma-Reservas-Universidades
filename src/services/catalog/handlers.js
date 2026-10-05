import { createRoomSlice } from '../../application/slices/catalog/create-room.js';
import { checkAvailabilitySlice } from '../../application/slices/catalog/check-availability.js';
import { listRoomsSlice } from '../../application/slices/catalog/list-rooms.js';

export function makeCatalogHandlers({ catalog }) {
  const createRoom = createRoomSlice({ catalog });
  const checkAvailability = checkAvailabilitySlice({ catalog });
  const listRooms = listRoomsSlice({ catalog });

  return {
    createRoom: ({ principal, body }) =>
      createRoom({
        tenantId: principal.tenantId,
        ...body
      }),

    checkAvailability: ({ principal, query }) =>
      checkAvailability({
        tenantId: principal.tenantId,
        ...query
      }),

    listRooms: ({ principal }) =>
      listRooms({
        tenantId: principal.tenantId
      })
  };
}