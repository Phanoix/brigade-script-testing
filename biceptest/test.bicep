
// Storage Account
resource storageAccount 'Microsoft.Storage/storageAccounts@2019-06-01' = {
  name: 'phanbiceptest2'
  location: 'Canada Central'
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    accessTier: 'Hot'
  }
}
