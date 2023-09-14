import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";

const config = new pulumi.Config();

const resourceGroup = new azure_native.resources.ResourceGroup(
  "resourceGroup",
  {
    resourceGroupName: "apiResourceGroupName",
    location: "West Europe",
  }
);

const storageAccount = new azure_native.storage.StorageAccount(
  "storageAccount",
  {
    resourceGroupName: resourceGroup.name,
    accountName: "storageaccount",
    kind: "StorageV2",
    sku: {
      name: "Standard_LRS",
    },
  }
);

const container = new azure_native.storage.BlobContainer("container", {
  resourceGroupName: resourceGroup.name,
  accountName: storageAccount.name,
  containerName: "container",
});

const appServicePlan = new azure_native.web.AppServicePlan("appServicePlan", {
  resourceGroupName: resourceGroup.name,
  name: "appServicePlan",
  kind: "Linux",
  reserved: true,
  sku: {
    name: "B1",
    tier: "Basic",
  },
});

const webApp = new azure_native.web.WebApp("webApp", {
  resourceGroupName: resourceGroup.name,
  name: "apiAppName",
  serverFarmId: appServicePlan.id,
  siteConfig: {
    alwaysOn: false,
    nodeVersion: "14-lts",
    linuxFxVersion: "NODE|14-lts",
  },
});

const appSettings = new azure_native.web.WebAppApplicationSettings(
  "appSettings",
  {
    resourceGroupName: resourceGroup.name,
    name: webApp.name,
    properties: {
      STORAGE_CONNECTION_STRING: storageAccount.primaryConnectionString,
      CONTAINER: container.name,
      API_KEY: config.requireSecret("API_KEY"),
      PORT: "3000",
    },
  }
);

export const apiAppName = webApp.name;
export const apiResourceGroupName = resourceGroup.name;
