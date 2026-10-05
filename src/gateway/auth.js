export function makeTokenVerifier(tokenToPrincipal) {
  return async function verify(request) {
    const value=request.headers?.authorization ?? ''; const token=value.startsWith('Bearer ')?value.slice(7):'';
    const principal=tokenToPrincipal[token]; if(!principal) throw Object.assign(new Error('Token inválido.'),{statusCode:401});
    if(!principal.tenantId || !principal.sub || !principal.role) throw Object.assign(new Error('Claims incompletos.'),{statusCode:401});
    return principal;
  };
}
