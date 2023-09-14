import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";

const config = new pulumi.Config();
const location = "WestEurope";
const runtime = "Node.js";
const runtimeVersion = "14.0.0";

const resourceGroup = new azure_native.resources.ResourceGroup(
  "efResourceGroup",
  {
    location: location,
  }
);

const storageAccount = new azure_native.storage.StorageAccount(
  "efStorageAccount",
  {
    resourceGroupName: resourceGroup.name,
    sku: {
      name: "Standard_LRS",
    },
    kind: "StorageV2",
    location: location,
  }
);

const storageAccountKeys = pulumi
  .all([storageAccount.name, resourceGroup.name])
  .apply(async ([accountName, resourceGroupName]) => {
    return await azure_native.storage.listStorageAccountKeys({
      accountName,
      resourceGroupName,
    });
  });

const appServicePlan = new azure_native.web.AppServicePlan("efAppServicePlan", {
  resourceGroupName: resourceGroup.name,
  location: location,
  kind: "Linux",
  reserved: true,
  sku: {
    name: "B1",
    tier: "Basic",
    size: "B1",
  },
});

const appService = new azure_native.web.WebApp("efAppService", {
  resourceGroupName: resourceGroup.name,
  location: location,
  serverFarmId: appServicePlan.id,
  siteConfig: {
    alwaysOn: false,
    nodeVersion: runtime,
    linuxFxVersion: `NODE|${runtimeVersion}`,
  },
});

const appSettings = new azure_native.web.WebAppApplicationSettings(
  "efAppSettings",
  {
    resourceGroupName: resourceGroup.name,
    name: appService.name,
    properties: {
      STORAGE_CONNECTION_STRING: `DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccountKeys.keys[0].value};EndpointSuffix=core.windows.net`,
      CONTAINER: "mycontainer",
      PORT: "3000",
    },
  }
);

export const apiAppName = appService.name;
export const apiResourceGroupName = resourceGroup.name;
