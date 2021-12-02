targetScope = 'subscription'

resource devRG 'Microsoft.Resources/resourceGroups@2021-01-01' = {
  name: 'DEV'
  location: 'Canada Central'
}


module plan './appPlan.bicep' = {
  name: 'plan'
  scope: resourceGroup(devRG.name)
  params: {  }
}

module func './app.bicep' = {
  name: 'func'
  scope: resourceGroup(devRG.name)
  params: {
    appName: 'phanb'
    appService: plan.outputs.servicePlanID
    customDomain: 'test1.phanoix.com'
    appType: 'functionapp'
  }
}

module web './app.bicep' = {
  name: 'web'
  scope: resourceGroup(devRG.name)
  params: {
    appName: 'phanwb'
    appService: plan.outputs.servicePlanID
    httpsOnly: false
    appType: 'app'
  }
}



module keyV './keyVault.bicep' = {
  name: 'keyV'
  scope: resourceGroup(devRG.name)
  params: {
    appName: 'dphan'
    tenantId: subscription().tenantId
  }
}

module storage1 './test.bicep' = {
  name: 'storageDeploy'
  scope: resourceGroup(devRG.name)
  params: {
    prefix: 'dphan'
  }
}

