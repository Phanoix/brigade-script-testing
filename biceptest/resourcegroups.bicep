targetScope = 'subscription'

resource devRG 'Microsoft.Resources/resourceGroups@2021-01-01' = {
  name: 'DEV'
  location: 'Canada Central'
}


module plan './appPlan.bicep' = {
  name: 'devplan'
  scope: resourceGroup(devRG.name)
  params: {  }
}
