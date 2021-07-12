<!-- This file has been generated with command 'sfdx hardis:doc:plugin:generate'. Please do not update it manually or it may be overwritten -->
# essentials:project:count-apex-lines

## Description

Allows to count lines of apex executable code related to filtered items

## Parameters

|Name|Type|Description|Default|Required|Options|
|:---|:--:|:----------|:-----:|:------:|:-----:|
|browsingpattern<br/>-b|option|Files browsing pattern. Default **/*.cls||||
|excludepattern<br/>-e|option|Regex to exclude patterns||||
|folder<br/>-f|option|SFDX project folder containing files||||
|noinsight|boolean|Do not send anonymous usage stats||||
|packagexmls<br/>-p|option|package.xml files path (separated by commas)||||
|sort<br/>-s|option|Sort order: alpha (default), lines, chars|alpha|||
|verbose<br/>-v|boolean|Verbose||||
|weight<br/>-w|boolean|Return also weight (number of chars). Slower and requires Perl||||

## Examples

```shell
$ sfdx essentials:project:count-apex-lines -f "./force-app/main/default"
```

```shell
$ sfdx essentials:project:count-apex-lines -f "./force-app/main/default" -b "**/WsMockV*.cls"
```

```shell
$ sfdx essentials:project:count-apex-lines -f "./force-app/main/default" -p "./packagexml/package1.xml"
```

```shell
$ sfdx essentials:project:count-apex-lines -f "./force-app/main/default" -p "./packagexml/package1.xml" -e "(WsBlabla|POC_)"
```


