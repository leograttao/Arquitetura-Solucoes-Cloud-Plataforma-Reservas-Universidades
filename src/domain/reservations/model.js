export class ReservationConflict extends Error {
  constructor(message = 'O horário solicitado não está disponível.') { super(message); this.name = 'ReservationConflict'; }
}
export function assertSlot({ roomId, startsAt, endsAt }) {
  if (!roomId || !startsAt || !endsAt) throw new Error('roomId, startsAt e endsAt são obrigatórios.');
  const start = Date.parse(startsAt), end = Date.parse(endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) throw new Error('Intervalo de horário inválido.');
  return { start, end };
}
export function overlaps(a, b) { return Date.parse(a.startsAt) < Date.parse(b.endsAt) && Date.parse(b.startsAt) < Date.parse(a.endsAt); }
