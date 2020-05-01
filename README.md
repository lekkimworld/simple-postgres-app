# simple-postgres-heroku-app
Super simple demo counter-app using Postgres for state for Heroku.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/lekkimworld/simple-postgres-heroku-app)

## Configuration ##
Create the following environment variables:
* `DATABASE_URL` posgres:// like URL to connect to Postgres instance or connection string

Setting `DEBUG_APP_LOAD` will not load any Postgres dependencies but only show configured environment variables.

## Deployment to Heroku ##

#### Proivision compute and push app ####
```
export HEROKU_APP_NAME=simple-redis-heroku-$(date +%s)
export HEROKU_DB_SKU=hobby-dev

heroku apps:create --region eu $HEROKU_APP_NAME
heroku addons:create --app $HEROKU_APP_NAME heroku-postgresql:$HEROKU_DB_SKU
git push heroku master
heroku open
```

#### Destroy app on Heroku ####
```
heroku apps:destroy --app $HEROKU_APP_NAME --confirm $HEROKU_APP_NAME
```

## Deployment to Azure ##

#### Provision compute on Azure #####
```
export AZ_APP_PREFIX='my-postgres-demo'
export AZ_LOCATION='northeurope'
export AZ_POSTGRES_USERNAME=mypostgresuser
export AZ_POSTGRES_PASSWORD=t@7Yg9F2BTB8d04C
export AZ_DB_SERVER_SKU=B_Gen5_1
export AZ_DB_NAME=mydb
export AZ_APPSERVICE_SKU=B1

# create a resource group to logically contain everything
az group create --location "$AZ_LOCATION" --name "$AZ_APP_PREFIX-resourcegroup"

# create postgres server and db
az postgres server create --name "$AZ_APP_PREFIX-postgres" --resource-group "$AZ_APP_PREFIX-resourcegroup" --admin-user "$AZ_POSTGRES_USERNAME" --admin-password "$AZ_POSTGRES_PASSWORD" --sku-name "$AZ_DB_SERVER_SKU"
az postgres db create --name "$AZ_DB_NAME" --resource-group "$AZ_APP_PREFIX-resourcegroup" --server-name "$AZ_APP_PREFIX-postgres"

# create an app service plan (the compute) and the app service (webapp) in the plan
az appservice plan create --name "$AZ_APP_PREFIX-appplan" --resource-group "$AZ_APP_PREFIX-resourcegroup" --is-linux --location "$AZ_LOCATION" --sku $AZ_APPSERVICE_SKU --number-of-workers 1
az webapp create --name "$AZ_APP_PREFIX-appservice" --resource-group "$AZ_APP_PREFIX-resourcegroup" --plan "$AZ_APP_PREFIX-appplan" --runtime "node|10.14" --deployment-local-git

# get database instance url and set webapp settings
export AZ_DB_DOMAIN=`az postgres server show --name "$AZ_APP_PREFIX-postgres" --resource-group "$AZ_APP_PREFIX-resourcegroup" | jq ".fullyQualifiedDomainName" -r`
export AZ_DATABASE_URL="host=$AZ_DB_DOMAIN port=5432 dbname=$AZ_DB_NAME user=$AZ_POSTGRES_USERNAME@$AZ_APP_PREFIX-postgres password=$AZ_POSTGRES_PASSWORD sslmode=require"
az webapp config appsettings set --name "$AZ_APP_PREFIX-appservice" --resource-group "$AZ_APP_PREFIX-resourcegroup" --settings DATABASE_URL="$AZ_DATABASE_URL"
```

#### Open Postgres firewall for Azure services ####
By default Azure Postgres does not allow for connections so you need to open the firewall either for specific IP addresses or IP ranges. There is also an option to allow access from Azure services. If you do not do this you'll see an error like the below. To enable do as follows:
1. Open your Postgres service in Azure Portal
2. Click "Connection Security" in the lefthand navigator
3. Enable "Allow access to Azure services"
4. Be sure to save the settings.

```
Oops! Something went wrong!
no pg_hba.conf entry for host "137.116.253.47", user "mypostgresuser", database "mydb", SSL on
```


#### Deploy source to Azure from local git repo ####
```
# get git remote for deployment
export AZ_GIT_URL=`az webapp deployment list-publishing-credentials --name "$AZ_APP_PREFIX-appservice" --resource-group "$AZ_APP_PREFIX-resourcegroup" --query scmUri --output tsv`/$AZ_APP_PREFIX-appservice.git
git remote add azure $AZ_GIT_URL
git push azure master
```

#### Deploy source to Azure from Github ####
```
# deploy source from github
az webapp deployment source config --name "$AZ_APP_PREFIX-appservice" --resource-group "$AZ_APP_PREFIX-resourcegroup" --repo-url https://github.com/lekkimworld/simple-postgres-heroku-app.git --branch master
```

#### Open app on Azure ####
```
# get hostname
export AZ_HOSTNAME=`az webapp show --name "$AZ_APP_PREFIX-appservice" --resource-group "$AZ_APP_PREFIX-resourcegroup"  | jq ".hostNames[0]" -r`
open "https://$AZ_HOSTNAME"
```

## Destroy services on Azure ##
```
az group delete --name $AZ_APP_PREFIX-resourcegroup
```
