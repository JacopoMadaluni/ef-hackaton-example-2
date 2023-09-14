import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";

const config = new pulumi.Config();
const location = "WestEurope";

const resourceGroup = new azure_native.resources.ResourceGroup("efrg", {
  resourceGroupName: "efrg",
  location: location,
});

const storageAccount = new azure_native.storage.StorageAccount("efsa", {
  resourceGroupName: resourceGroup.name,
  accountName: "efsa",
  kind: "StorageV2",
  sku: {
    name: "Standard_LRS",
  },
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
  resourceGroupName: resourceGroup.name,
  name: "efasp",
  kind: "Linux",
  reserved: true,
  sku: {
    name: "B1",
    tier: "Basic",
  },
});

const app = new azure_native.web.WebApp("efwa", {
  resourceGroupName: resourceGroup.name,
  name: "efwa",
  serverFarmId: appServicePlan.id,
  siteConfig: {
    alwaysOn: false,
    nodeVersion: "14-lts",
    linuxFxVersion: "NODE|14-lts",
  },
});

const appSettings = new azure_native.web.WebAppApplicationSettings("efwas", {
  name: app.name,
  resourceGroupName: resourceGroup.name,
  properties: {
    STORAGE_CONNECTION_STRING:
      "DefaultEndpointsProtocol=https;AccountName=" +
      storageAccount.name +
      ";AccountKey=" +
      storageAccountKeys.keys[0].value +
      ";EndpointSuffix=core.windows.net",
    CONTAINER: "efcontainer",
    API_KEY: config.requireSecret("API_KEY"),
    PORT: "3000",
  },
});

export const apiAppName = app.name;
export const apiResourceGroupName = resourceGroup.name;
