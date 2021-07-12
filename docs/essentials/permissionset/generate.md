<!-- This file has been generated with command 'sfdx hardis:doc:plugin:generate'. Please do not update it manually or it may be overwritten -->
# essentials:permissionset:generate

## Description

Generate permission sets in XML format used for SFDX project from package.xml file depending on JSON configuration file (See [Example configuration](https://github.com/nvuillam/sfdx-essentials/blob/master/examples/generate-permission-sets-config.json) and [Example log](https://github.com/nvuillam/sfdx-essentials/blob/master/examples/generate-permission-sets.log)) ![Generate permission sets log image](https://github.com/nvuillam/sfdx-essentials/raw/master/examples/generate-permission-sets-log.png "Generate permission sets log image")

## Parameters

|Name|Type|Description|Default|Required|Options|
|:---|:--:|:----------|:-----:|:------:|:-----:|
|configfile<br/>-c|option|config.json file||||
|nameSuffix<br/>-s|option|Name suffix for generated permission sets||||
|noinsight|boolean|Do not send anonymous usage stats||||
|outputfolder<br/>-o|option|Output folder (default: "." )|.|||
|packagexml<br/>-p|option|package.xml file path||||
|sfdxSourcesFolder<br/>-f|option|SFDX Sources folder (used to filter required and masterDetail fields)||||
|verbose<br/>-v|boolean|Verbose||||

## Examples

```shell
$ sfdx essentials:permissionset:generate -c "./Config/generate-permission-sets.json" -p "./Config/packageXml/package_DevRoot_Managed.xml" -f "./Projects/DevRootSource/force-app/main/default" -o "./Projects/DevRootSource/force-app/main/default/permissionsets"
```

```shell
$ sfdx essentials:permissionset:generate -c "./Config/generate-permission-sets.json" -p "./Config/packageXml/package_DevRoot_xDemo.xml" -f "./Projects/DevRootSource/force-app/main/default" --nameSuffix Custom -o "./Projects/DevRootSource/force-app/main/default/permissionsets"
```


