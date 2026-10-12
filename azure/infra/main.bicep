param location string = resourceGroup().location
param namePrefix string = 'unisalas'
param sqlAdministratorLogin string
@secure()
param sqlAdministratorPassword string

resource plan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: '${namePrefix}-functions-plan'
  location: location
  sku: { name: 'Y1', tier: 'Dynamic' }
}
resource functionApp 'Microsoft.Web/sites@2022-03-01' = {
  name: '${namePrefix}-enrichment'
  location: location
  kind: 'functionapp'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    siteConfig: { appSettings: [{ name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }, { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'node' }] }
  }
}
resource storage 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: '${namePrefix}files'
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
}
resource serviceBus 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' = {
  name: '${namePrefix}-events'
  location: location
  sku: { name: 'Standard' }
}
resource topic 'Microsoft.ServiceBus/namespaces/topics@2022-10-01-preview' = {
  name: 'pjbl-events'
  parent: serviceBus
  properties: { enablePartitioning: true }
}
resource sqlServer 'Microsoft.Sql/servers@2022-05-01-preview' = {
  name: '${namePrefix}-sql'
  location: location
  properties: {
    administratorLogin: sqlAdministratorLogin
    administratorLoginPassword: sqlAdministratorPassword
    version: '12.0'
  }
}
resource sqlDatabase 'Microsoft.Sql/servers/databases@2022-05-01-preview' = {
  name: 'orders'
  parent: sqlServer
  location: location
  sku: { name: 'Basic', tier: 'Basic' }
}
resource apiManagement 'Microsoft.ApiManagement/service@2022-08-01' = {
  name: '${namePrefix}-apim'
  location: location
  sku: { name: 'Consumption', capacity: 0 }
  properties: { publisherEmail: 'replace-with-operator@example.invalid', publisherName: 'UniSalas' }
}
