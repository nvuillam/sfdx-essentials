<!-- This file has been generated with command 'sfdx hardis:doc:plugin:generate'. Please do not update it manually or it may be overwritten -->
# essentials:metadata:filter-xml-content

## Description

Filter content of metadatas (XML) in order to be able to deploy only part of them on an org (See [Example configuration](https://github.com/nvuillam/sfdx-essentials/blob/master/examples/filter-xml-content-config.json))

When you perform deployments from one org to another, the features activated in the target org may not fit the content of the sfdx/metadata files extracted from the source org.

You may need to filter some elements in the XML files, for example in the Profiles

This script requires a filter-config.json file

## Parameters

|Name|Type|Description|Default|Required|Options|
|:---|:--:|:----------|:-----:|:------:|:-----:|
|configFile<br/>-c|option|Config JSON file path||||
|inputfolder<br/>-i|option|Input folder (default: "." )||||
|noinsight|boolean|Do not send anonymous usage stats||||
|outputfolder<br/>-o|option|Output folder (default: parentFolder + _xml_content_filtered)||||

## Examples

```shell
sfdx essentials:filter-xml-content -i "./mdapi_output"
```

```shell
sfdx essentials:filter-xml-content -i "retrieveUnpackaged"
```


