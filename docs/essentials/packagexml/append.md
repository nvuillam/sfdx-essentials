<!-- This file has been generated with command 'sfdx hardis:doc:plugin:generate'. Please do not update it manually or it may be overwritten -->
# essentials:packagexml:append

## Description

Append content of a package.xml files into a single one

API version number of the result file will be the same than in the first package.xml file sent as argument

## Parameters

|Name|Type|Description|Default|Required|Options|
|:---|:--:|:----------|:-----:|:------:|:-----:|
|noinsight|boolean|Do not send anonymous usage stats||||
|outputfile<br/>-o|option|package.xml output file||||
|packagexmls<br/>-p|option|package.xml files path (separated by commas)||||
|verbose<br/>-v|boolean|Verbose||||

## Examples

```shell
sfdx essentials:packagexml:append -p "./Config/packageXml/package_DevRoot_Managed.xml,./Config/packageXml/package_DevRoot_Demo.xml,./Config/packageXml/package_DevRoot_Scratch.xml" -o "./Config/packageXml/package_for_new_scratch_org.xml"
```


