export const UniversityStatus=Object.freeze({PENDING:'pending',APPROVED:'approved',REJECTED:'rejected',SUSPENDED:'suspended'});
export function normalizeDomain(value){return String(value??'').trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\/$/,'');}
export function assertUniversityRequest({name,primaryDomain}){if(!name?.trim())throw new Error('Nome da universidade é obrigatório.');const domain=normalizeDomain(primaryDomain);if(!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain))throw new Error('Domínio institucional inválido.');return domain;}
