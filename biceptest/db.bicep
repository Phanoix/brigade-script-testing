param location string = 'Canada Central'
param subnetID string = ''

resource server 'Microsoft.DBforMariaDB/servers@2018-06-01' = {
  location: 'Canada Central'
  name: 'testdev-collab-db'
  sku: {
    name: 'GP_Gen5_2'
    tier: 'GeneralPurpose'
    capacity: 2
    size: string(5120)
    family: 'Gen5'
  }
  properties: {
    createMode: 'Default'
    version: '10.3'
    administratorLogin: 'elgg'
    administratorLoginPassword: 'a12345af2432S12*E'
    storageProfile: {
      storageMB: 5120
      storageAutogrow: 'Disabled'
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    sslEnforcement: 'Disabled'
  }
}

resource AllowSubnet 'Microsoft.DBforMariaDB/servers/virtualNetworkRules@2018-06-01' = {
  parent: server
  name: 'AllowSubnet'
  properties: {
    virtualNetworkSubnetId: subnetID
    ignoreMissingVnetServiceEndpoint: false
  }
}
