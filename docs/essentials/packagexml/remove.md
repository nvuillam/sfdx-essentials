<!-- This file has been generated with command 'sfdx hardis:doc:plugin:generate'. Please do not update it manually or it may be overwritten -->
# essentials:packagexml:remove

## Description

Removes the content of a package.xml file matching another package.xml file

## Parameters

|Name|Type|Description|Default|Required|Options|
|:---|:--:|:----------|:-----:|:------:|:-----:|
|noinsight|boolean|Do not send anonymous usage stats||||
|outputfile<br/>-o|option|package.xml output file||||
|packagexml<br/>-p|option|package.xml file to reduce||||
|removedonly<br/>-z|boolean|Use this flag to generate a package.xml with only removed items||||
|removepackagexml<br/>-r|option|package.xml file to use to filter input package.xml||||
|verbose<br/>-v|boolean|Verbose||||

## Examples

```shell
sfdx essentials:packagexml:remove -p "package.xml" -r "destructiveChanges.xml" -o "my-reduced-package.xml"
```


