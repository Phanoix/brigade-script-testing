

param location string = 'Canada Central'
param name string
param sku object = {
  name: 'Basic'
}

resource acr 'Microsoft.ContainerRegistry/registries@2021-09-01' = {
  name: name
  location: location
  sku: sku
}
