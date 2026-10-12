# Camada Azure

Esta pasta implementa a arquitetura distribuída do PJBL:

- microfrontend independente;
- BFF Node.js com agregação;
- microsserviço de produtos;
- microsserviço de pedidos;
- Azure Function HTTP Trigger;
- API Management como API Gateway;
- Azure SQL para pedidos;
- MongoDB Atlas para produtos;
- Azure Service Bus para eventos;
- Azure Blob Storage para arquivos.

## Execução local

Os fallbacks em memória existem apenas para testes e demonstração sem
credenciais. Quando as variáveis de produção são configuradas, os adaptadores
usam os serviços reais.

```bash
node azure/services/products/server.js
node azure/services/orders/server.js
PRODUCTS_URL=http://localhost:3001 \
ORDERS_URL=http://localhost:3002 \
FUNCTION_URL=http://localhost:7071/api/orders/enrich \
node azure/bff/server.js
```

O BFF expõe `GET /aggregated-data`, que consulta os dois microsserviços e a
Azure Function, retornando um único JSON. Operações de escrita publicam
eventos no tópico `pjbl-events` quando `SERVICE_BUS_CONNECTION_STRING` estiver
configurada.

## Variáveis de produção

- `MONGODB_ATLAS_URI`
- `MONGODB_DATABASE`
- `MONGODB_PRODUCTS_COLLECTION`
- `AZURE_SQL_CONNECTION_STRING`
- `SERVICE_BUS_CONNECTION_STRING`
- `SERVICE_BUS_TOPIC`
- `FUNCTION_URL`

Execute [schema.sql](C:/Users/jbrin/Arquitetura-Solucoes-Cloud-Plataforma-Reservas-Universidades/azure/services/orders/schema.sql)
no Azure SQL antes de ativar o adaptador de pedidos.

## Deploy Azure

[main.bicep](C:/Users/jbrin/Arquitetura-Solucoes-Cloud-Plataforma-Reservas-Universidades/azure/infra/main.bicep)
provisiona Function App, API Management, Blob Storage, Service Bus e Azure SQL.
O MongoDB Atlas é externo ao Azure e deve ser criado/configurado separadamente.
Os microsserviços e o BFF podem ser publicados como imagens Docker em Azure
Container Apps ou App Service for Containers.

```bash
az deployment group create \
  --resource-group <resource-group> \
  --template-file azure/infra/main.bicep \
  --parameters namePrefix=<prefix> \
               sqlAdministratorLogin=<login> \
               sqlAdministratorPassword=<password>
```

Não armazene strings de conexão, senhas ou chaves de Function no GitHub.
