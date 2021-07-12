<!-- This file has been generated with command 'sfdx hardis:doc:plugin:generate'. Please do not update it manually or it may be overwritten -->
# essentials:mig:add-namespace

## Description

Migrate sources from an object model to a new object model (See [Example configuration](https://github.com/nvuillam/sfdx-essentials/blob/master/examples/migrate-object-model-config.json))

  Use this command if you need to replace a SObject by another one in all your sfdx sources

## Parameters

|Name|Type|Description|Default|Required|Options|
|:---|:--:|:----------|:-----:|:------:|:-----:|
|excludeExpressionList<br/>-e|option|List of expressions to ignore. ex: **/node_modules/**||||
|fetchExpressionList<br/>-f|option|Fetch expression list. Let default if you dont know. ex: ./aura/**/*.js,./aura/**/*.cmp,./classes/*.cls,./objects/*/fields/*.xml,./objects/*/recordTypes/*.xml,./triggers/*.trigger,./permissionsets/*.xml,./profiles/*.xml,./staticresources/*.json||||
|inputFolder<br/>-i|option|Input folder (default: "." )||||
|labelsfile<br/>-l|option|Path to CustomLabel.labels-meta.xml||||
|namespace<br/>-n|option|Namespace string||||
|noinsight|boolean|Do not send anonymous usage stats||||
|packagexml<br/>-p|option|Path to package.xml file||||
|verbose<br/>-v|boolean|Verbose||||

## Examples

```shell
$ essentials:mig:add-namespace -n DxcOemDev -p "../../somefolder/package.xml"
```

```shell
$ essentials:mig:add-namespace -n DxcOemDev -i "C:/Work/git/some-client-project/Projects/DevRootSource" --fetchExpressionList="**/*.apex,**/*.json" -p "C:/Work/git/DXCO4SF_Sources_OEM_ST/Config/packageXml/package_DevRoot_Managed.xml"
```

```shell
$ essentials:mig:add-namespace -n DxcOemDev -e "**/www*" -p "../../somefolder/package.xml"
```


