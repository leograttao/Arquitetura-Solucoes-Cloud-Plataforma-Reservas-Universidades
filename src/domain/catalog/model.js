export function assertRoom({name,capacity}){if(!name?.trim())throw new Error('Nome da sala é obrigatório.');if(!Number.isInteger(capacity)||capacity<1)throw new Error('Capacidade deve ser um inteiro positivo.');}
export function intervalsOverlap(a,b){return Date.parse(a.startsAt)<Date.parse(b.endsAt)&&Date.parse(b.startsAt)<Date.parse(a.endsAt);}
