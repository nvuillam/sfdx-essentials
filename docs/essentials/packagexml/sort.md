<!-- This file has been generated with command 'sfdx hardis:doc:plugin:generate'. Please do not update it manually or it may be overwritten -->
# essentials:packagexml:sort

## Description

Developers have the bad habit to input package.xml files in a non-alphabetical order. Use this command to reorder alphabetically your package.xml files !

## Parameters

|Name|Type|Description|Default|Required|Options|
|:---|:--:|:----------|:-----:|:------:|:-----:|
|noinsight|boolean|Do not send anonymous usage stats||||
|packagexml<br/>-p|option|package.xml file path (or a folder containing package.xml files)||||

## Examples

```shell
$ sfdx essentials:packagexml:sort -p "./Config/packageXml/package.xml"
```

```shell
$ sfdx essentials:packagexml:sort -p "./Config/packageXml"
```


