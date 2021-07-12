<!-- This file has been generated with command 'sfdx hardis:doc:plugin:generate'. Please do not update it manually or it may be overwritten -->
# essentials:mig:migrate-object-model

## Description

Migrate sources from an object model to a new object model (See [Example configuration](https://github.com/nvuillam/sfdx-essentials/blob/master/examples/migrate-object-model-config.json))

Use this command if you need to replace a SObject by another one in all your sfdx sources

## Parameters

|Name|Type|Description|Default|Required|Options|
|:---|:--:|:----------|:-----:|:------:|:-----:|
|configFile<br/>-c|option|JSON config file||||
|copySfdxProjectFolder<br/>-s|boolean|Copy sfdx project files after process||||
|deleteFiles<br/>-d|boolean|Delete files with deprecated references||||
|deleteFilesExpr<br/>-k|boolean|Delete files matching expression||||
|fetchExpressionList<br/>-f|option|Fetch expression list. Let default if you dont know. ex: /aura/**/*.js,./aura/**/*.cmp,./classes/*.cls,./objects/*/fields/*.xml,./objects/*/recordTypes/*.xml,./triggers/*.trigger,./permissionsets/*.xml,./profiles/*.xml,./staticresources/*.json||||
|inputFolder<br/>-i|option|Input folder (default: "." )||||
|noinsight|boolean|Do not send anonymous usage stats||||
|replaceExpressions<br/>-r|boolean|Replace expressions using fetchExpressionList||||
|verbose<br/>-v|boolean|Verbose||||

## Examples

```shell
$ sfdx essentials:mig:migrate-object-model -c "./config/migrate-object-model-config.json"
```

```shell
$ sfdx essentials:mig:migrate-object-model -c migration/config-to-oem.json -i Config/packageXml --fetchExpressionList "./package*.xml" --no-deleteFiles --no-deleteFilesExpr --no-copySfdxProjectFolder
```


