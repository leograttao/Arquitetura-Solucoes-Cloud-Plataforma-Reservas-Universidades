export function makeTokenVerifier(tokenToPrincipal) {
  return async function verify(request) {
    const authorization = request.headers?.authorization ?? '';
    const token = authorization.startsWith('Bearer ')
      ? authorization.slice(7)
      : '';

    const principal = tokenToPrincipal[token];

    if (!principal) {
      throw Object.assign(new Error('Token inválido.'), {
        statusCode: 401
      });
    }

    if (!principal.tenantId || !principal.sub || !principal.role) {
      throw Object.assign(new Error('Claims incompletos.'), {
        statusCode: 401
      });
    }

    return principal;
  };
}

export function makeSessionVerifier(identity) {
  return async function verify(request) {
    const authorization = request.headers?.authorization ?? '';
    const token = authorization.startsWith('Bearer ')
      ? authorization.slice(7)
      : '';

    const principal = token
      ? await identity.findSession(token)
      : null;

    if (!principal) {
      throw Object.assign(
        new Error('Sessão inválida ou expirada. Entre novamente.'),
        { statusCode: 401 }
      );
    }

    return principal;
  };
}