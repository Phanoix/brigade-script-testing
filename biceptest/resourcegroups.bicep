targetScope = 'subscription'

resource newRG1 'Microsoft.Resources/resourceGroups@2021-01-01' = {
  name: 'Biceptest'
  location: 'Canada Central'
}

resource newRG2 'Microsoft.Resources/resourceGroups@2021-01-01' = {
  name: 'Biceptest2'
  location: 'Canada Central'
}

resource newRG3 'Microsoft.Resources/resourceGroups@2021-01-01' = {
  name: 'Biceptest3'
  location: 'Canada Central'
}


module keyV './keyVault.bicep' = {
  name: 'keyV'
  scope: resourceGroup(newRG1.name)
  params: {
    appName: 'phan'
    tenantId: subscription().tenantId
  }
}

module storage1 './test.bicep' = {
  name: 'storageDeploy'
  scope: resourceGroup(newRG1.name)
  params: {
    prefix: 'phanbiceptest2'
  }
}


module storage2 './test.bicep' = {
  name: 'storageDeploy'
  scope: resourceGroup(newRG3.name)
  params: {
    prefix: 'phanbiceptest3'
  }
}
