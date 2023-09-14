resourceGroupName=eft-resource-group
appName=eft-as-main
zipFile=source.zip

# az webapp deployment source config-zip --resource-group $resourceGroupName --name $appName --src $zipFile
# az webapp config appsettings set --resource-group $resourceGroupName --name $appName --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true
az webapp deploy \
    --name $appName \
    --resource-group $resourceGroupName \
    --src-path $zipFile