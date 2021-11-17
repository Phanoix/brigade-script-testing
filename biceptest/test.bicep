targetScope = 'subscription'

resource RG1 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: 'Biceptest'
  location: 'Canada Central'
}

resource RG2 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: 'Biceptest2'
  location: 'Canada Central'
}
