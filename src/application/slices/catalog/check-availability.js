import {assertSlot} from '../../../domain/reservations/model.js';
export function checkAvailabilitySlice({catalog}){return async function checkAvailability({tenantId,roomId,startsAt,endsAt}){assertSlot({roomId,startsAt,endsAt});return {available:await catalog.isAvailable({tenantId,roomId,startsAt,endsAt}),roomId,startsAt,endsAt};};}
