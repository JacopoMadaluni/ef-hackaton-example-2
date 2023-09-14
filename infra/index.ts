import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";

const config = new pulumi.Config();
const location = "WestEurope";

const resourceGroup = new azure_native.resources.ResourceGroup("efrg", {
  location: location,
});

const storageAccount = new azure_native.storage.StorageAccount("efsa", {
  resourceGroupName: resourceGroup.name,
  sku: {
    name: "Standard_LRS",
  },
  kind: "StorageV2",
  location: location,
});

const storageAccountKeys = pulumi
  .all([storageAccount.name, resourceGroup.name])
  .apply(async ([accountName, resourceGroupName]) => {
    return await azure_native.storage.listStorageAccountKeys({
      accountName,
      resourceGroupName,
    });
  });

const appServicePlan = new azure_native.web.AppServicePlan("efasp", {
  location: location,
  resourceGroupName: resourceGroup.name,
  kind: "Linux",
  reserved: true,
  sku: {
    name: "B1",
    tier: "Basic",
  },
});

const app = new azure_native.web.WebApp("efwa", {
  location: location,
  resourceGroupName: resourceGroup.name,
  serverFarmId: appServicePlan.id,
  siteConfig: {
    alwaysOn: false,
    nodeVersion: "14-lts",
    linuxFxVersion: "NODE|14-lts",
  },
});

new azure_native.web.WebAppApplicationSettings("efwaas", {
  name: app.name,
  resourceGroupName: resourceGroup.name,
  properties: {
    STORAGE_CONNECTION_STRING:
      "DefaultEndpointsProtocol=https;AccountName=" +
      storageAccount.name +
      ";AccountKey=" +
      storageAccountKeys.keys[0].value +
      ";EndpointSuffix=core.windows.net",
    CONTAINER: "mycontainer",
    PORT: "3000",
  },
});

export const apiAppName = app.name;
export const apiResourceGroupName = resourceGroup.name;
