<!-- This file has been generated with command 'sfdx hardis:doc:plugin:generate'. Please do not update it manually or it may be overwritten -->
# essentials:project:check-consistency-with-packagexml

## Description

Allows to compare the content of a SFDX and the content of one or several (concatenated) package.xml files ( See [Example log](https://github.com/nvuillam/sfdx-essentials/blob/master/examples/check-sfdx-project-consistency.log)) ![Check SFDX project consistency log image](https://github.com/nvuillam/sfdx-essentials/raw/master/examples/check-sfdx-project-consistency-log.png "Check SFDX project consistency log image")

  This will output a table with the number of elements :

  - Existing in both SFDX Project files and package.xml file(s)
  - Existing only in SFDX Project files
  - Existing only in package.xml file(s)
  

## Parameters

|Name|Type|Description|Default|Required|Options|
|:---|:--:|:----------|:-----:|:------:|:-----:|
|chatty<br/>-c|boolean|Chatty logs||||
|failIfError<br/>-f|boolean|Script failing if errors are founds||||
|ignoreDuplicateTypes<br/>-d|option|List of types to ignore while checking for duplicates in package.xml files||||
|inputfolder<br/>-i|option|SFDX Project folder (default: "." )||||
|jsonLogging<br/>-j|boolean|JSON logs||||
|noinsight|boolean|Do not send anonymous usage stats||||
|packageXmlList<br/>-p|option|List of package.xml files path||||

## Examples

```shell
$  sfdx essentials:project:check-consistency-with-packagexml -p "./Config/packageXml/package_DevRoot_Managed.xml,./Config/packageXml/package_DevRoot_xDemo.xml" -i "./Projects/DevRootSource/force-app/main/default" -d "Document,EmailTemplate" --failIfError
```


