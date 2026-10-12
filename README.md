# Plataforma de Reservas de Salas Universitárias

Implementação de referência do trabalho de Arquitetura e Soluções Cloud.

## Estado da implementação

O repositório contém um protótipo executável em Node.js 22 que materializa:

- API Gateway interno;
- BFFs para plataforma, administrador, aluno e autenticação;
- casos de uso organizados em slices verticais;
- isolamento lógico por universidade;
- reservas concorrentes, conflito e fila de espera;
- eventos internos e notificações;
- três interfaces web estáticas.

O cadastro oficial de universidades é feito pela **administração da plataforma** em
`/platform`. Depois de criar uma universidade, a administração cria a conta do
administrador institucional. O administrador e o aluno acessam seus portais com
as sessões emitidas por `/auth/login`.

O armazenamento atual é em memória e é reiniciado junto com o processo. PostgreSQL,
armazenamento de objetos e broker de mensagens são decisões da arquitetura-alvo
documentada no PDF, não serviços provisionados neste protótipo local.

## Execução

Requisitos: Node.js 22 ou superior.

```bash
npm test
npm start
```

Aplicações:

- Plataforma: <http://localhost:8080/platform>
- Administrador: <http://localhost:8080/admin>
- Aluno: <http://localhost:8080/student>

Credenciais iniciais da plataforma:

- e-mail: `admin@unisal.local`
- senha: `Admin@123`

É possível alterar esses valores com `PLATFORM_ADMIN_EMAIL` e
`PLATFORM_ADMIN_PASSWORD`.

## Fluxo de demonstração

1. Entre em `/platform` com a conta inicial.
2. Cadastre uma universidade e seus domínios institucionais.
3. Crie o administrador da universidade usando um e-mail de domínio cadastrado.
4. Entre em `/admin` com a conta criada e cadastre uma sala.
5. Cadastre e valide um aluno pelo fluxo de autenticação da API e entre em `/student`.
6. Faça uma reserva, repita o horário para demonstrar a fila e cancele a primeira
   reserva para demonstrar a promoção automática.

Sem configuração de provedor externo, as notificações são registradas no console.
Para usar o adaptador de e-mail Resend, configure `RESEND_API_KEY` e
`RESEND_FROM_EMAIL`.

## Camada distribuída Azure (adicional)

O protótipo acima foi preservado. A implementação de referência para uma
topologia distribuída fica em `azure/`: BFF, serviços de produtos e pedidos,
Function HTTP, contrato do API Management, Bicep, microfrontend e Dockerfiles.
Ela roda sem credenciais e usa fallbacks em memória explicitamente quando
`MONGODB_ATLAS_URI` ou `AZURE_SQL_CONNECTION_STRING` não estão definidos.
Consulte `azure/README.md` para iniciar os três processos.

## Validações

```bash
npm test
node --check src/local-server.js
```

Os testes verificam regras de domínio, isolamento por tenant, concorrência,
dependências arquiteturais, autenticação e promoção da fila.
