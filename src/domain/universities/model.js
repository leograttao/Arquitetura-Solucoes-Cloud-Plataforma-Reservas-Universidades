export const UniversityStatus = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ACTIVE: 'active',
  SUSPENDED: 'suspended'
});

export function normalizeDomain(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^@/, '')
    .replace(/\/$/, '');
}

export function normalizeDomains(values) {
  const list = Array.isArray(values)
    ? values
    : String(values ?? '').split(/[\s,;]+/);

  const domains = [
    ...new Set(list.map(normalizeDomain).filter(Boolean))
  ];

  if (
    !domains.length ||
    domains.some((domain) => !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain))
  ) {
    throw new Error('Informe pelo menos um domínio institucional válido.');
  }

  return domains;
}

export function assertUniversityRequest(request) {
  const { name } = request;

  if (!name?.trim()) {
    throw new Error('Nome da universidade é obrigatório.');
  }

  const normalizedDomains = normalizeDomains(
    request.domains ?? request.primaryDomain
  );

  return {
    name: name.trim(),
    domains: normalizedDomains,
    primaryDomain: normalizedDomains[0]
  };
}

export function emailDomain(email) {
  const normalized = String(email ?? '').trim().toLowerCase();
  const parts = normalized.split('@');

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('Informe um e-mail válido.');
  }

  return parts[1];
}