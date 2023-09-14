import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";
import * as azure_native from "@pulumi/azure-native";
import * as dotenv from "dotenv";

dotenv.config();

const env = "main"

export = async () => {
  const resourceGroup = new azure.core.ResourceGroup(
    "eft-resource-group",
    {
      name: "eft-resource-group",
      location: "UKSouth",
    }
  );

  const storageAccount = new azure_native.storage.StorageAccount(
    "adam-storage-" + env,
    {
      kind: "StorageV2",
      location: "UK South",
      accountName: "audiogenadamstorage" + env,
      resourceGroupName: resourceGroup.name,
      sku: {
        name: "Standard_LRS",
      },
    },
    {
      parent: resourceGroup,
    }
  );

  const container = new azure.storage.Container(
    "container-" + env,
    {
      storageAccountName: storageAccount.name,
      name: "container",
      containerAccessType: "private",
    },
    {
      parent: storageAccount,
    }
  );


  const servicePlan = new azure_native.web.AppServicePlan(
    "eft-service-plan-" + env,
    {
      kind: "Linux",
      reserved: true,
      location: "UK South",
      name: "eft-sp-" + env,
      resourceGroupName: resourceGroup.name,
      sku: {
        name: "B1",
        capacity: 1,
        size: "B1",
        tier: "Basic",
      },
    },
    {
      parent: resourceGroup,
    }
  );

  const appService = new azure_native.web.WebApp(
    "eft-app-service-" + env,
    {
      name: "eft-as-" + env,
      resourceGroupName: resourceGroup.name,
      serverFarmId: servicePlan.id,
      siteConfig: {
        alwaysOn: true,
        nodeVersion: "18.14.2",
        linuxFxVersion: "Node|18",
      },
    },
    {
      parent: servicePlan,
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

  const applicationENV = {
    STORAGE_CONNECTION_STRING:
      "DefaultEndpointsProtocol=https;AccountName=" +
      storageAccount.name +
      ";AccountKey=" +
      storageAccountKeys.keys[0].value +
      ";EndpointSuffix=core.windows.net",
    CONTAINER: container.name,
    DEBUG: "true",
  };

  const applicationSettings = new azure_native.web.WebAppApplicationSettings(
    "eft-application-settings-" + env,
    {
      name: appService.name,
      resourceGroupName: resourceGroup.name,
      properties: applicationENV,
    },
    {
      parent: appService,
    }
  );

};
