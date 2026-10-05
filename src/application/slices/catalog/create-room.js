import {assertRoom} from '../../../domain/catalog/model.js';
export function createRoomSlice({catalog}){return async function createRoom({tenantId,name,capacity}){assertRoom({name,capacity});return catalog.createRoom({tenantId,name:name.trim(),capacity});};}
