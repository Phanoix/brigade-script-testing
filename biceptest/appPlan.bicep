param location string = 'canadacentral'

@allowed([
  'dev'
  'uat'
  'prod'
])
param env string = 'dev'

param sku object = {
    name: 'P1v2'
    tier: 'PremiumV2'
    size: 'P1v2'
    capacity: 1
  }

var planName = 'plan-${env}'


resource servicePlan 'Microsoft.Web/serverfarms@2021-02-01' = {
  name: planName
  location: location
  sku: sku
  kind: 'linux'
  properties: {
    perSiteScaling: false
    elasticScaleEnabled: false
    maximumElasticWorkerCount: 1
    isSpot: false
    reserved: true
    isXenon: false
    hyperV: false
    targetWorkerCount: 0
    targetWorkerSizeId: 0
    zoneRedundant: false
  }
}


output servicePlanID string = servicePlan.id
