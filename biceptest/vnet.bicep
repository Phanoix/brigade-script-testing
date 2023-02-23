
param location string = 'Canada Central'

var endpoints = [
  {
    service: 'Microsoft.KeyVault'
    locations: [
      '*'
    ]
  }
  {
    service: 'Microsoft.Storage'
    locations: [
      'canadacentral'
      'canadaeast'
    ]
  }
  {
    service: 'Microsoft.Web'
    locations: [
      '*'
    ]
  }
  {
    service: 'Microsoft.Sql'
    locations: [
      '*'
    ]
  }
]


resource vnet 'Microsoft.Network/virtualNetworks@2021-08-01' = {
  name: 'dev_test_vnet'
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: ['10.0.0.0/16']
    }
    enableDdosProtection: false
  }
}

resource subnet 'Microsoft.Network/virtualNetworks/subnets@2021-08-01' = {
  name: 'dev'
  parent: vnet
  properties: {
    addressPrefix: '10.0.0.0/24'
    serviceEndpoints: endpoints
    delegations: [
      {
        name: 'delegation'
        id: '${vnet.id}/delegations/delegation'
        properties: {
          serviceName: 'Microsoft.Web/serverfarms'
        }
        type: 'Microsoft.Network/virtualNetworks/subnets/delegations'
      }
    ]
    privateEndpointNetworkPolicies: 'Enabled'
    privateLinkServiceNetworkPolicies: 'Enabled'
  }
}

@description('The name of the virtual network peering.')
output name string = subnet.name

@description('The resource ID of the virtual network peering.')
output resourceId string = subnet.id
