
param location string = 'canadacentral'

@maxLength(6)
param appName string = 'phan'

@secure()
param tenantId string

@allowed([
  'standard'
  'premium'
])
param sku string = 'standard'

var vaultName = 'vault-${appName}'

resource vault 'Microsoft.KeyVault/vaults@2021-06-01-preview' = {
  name: vaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: sku
    }
    tenantId: tenantId
    networkAcls: {
      bypass: 'None'
      defaultAction: 'Deny'
      ipRules: []
      virtualNetworkRules: []
    }
    accessPolicies: []
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: false
    enableRbacAuthorization: true
    enablePurgeProtection: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 30
  }
}
