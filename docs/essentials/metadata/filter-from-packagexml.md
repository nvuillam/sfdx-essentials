<!-- This file has been generated with command 'sfdx hardis:doc:plugin:generate'. Please do not update it manually or it may be overwritten -->
# essentials:metadata:filter-from-packagexml

## Description

Filter metadatas generated from a SFDX Project in order to be able to deploy only part of them on an org

This can help if you need to deploy only part of the result of sfdx force:source:convert into a org, by filtering the result (usually in mdapi_output_dir) to keep only the items referenced in your own package.xml file

WARNING: This version does not support all the metadata types yet, please contribute if you are in a hurry :)

Package.xml types currently managed:

- ApexClass
- ApexComponent
- ApexPage
- ApexTrigger
- ApprovalProcess
- AuraDefinitionBundle
- AuthProvider
- BusinessProcess
- ContentAsset
- CustomApplication
- CustomField
- CustomLabel
- CustomMetadata
- CustomObject
- CustomObjectTranslation
- CustomPermission
- CustomPlatformEvent
- CustomSettings
- CustomSite
- CustomTab
- Document
- EmailTemplate
- EscalationRules
- FlexiPage
- Flow
- FieldSet
- GlobalValueSet
- GlobalValueSetTranslation
- HomePageLayout
- ListView
- LightningComponentBundle
- Layout
- NamedCredential
- Network
- NetworkBranding
- PermissionSet
- Profile
- Queue
- QuickAction
- RecordType
- RemoteSiteSetting
- Report
- SiteDotCom
- StandardValueSet
- StandardValueSetTranslation
- StaticResource
- Translations
- ValidationRule
- WebLink
- Workflow

## Parameters

|Name|Type|Description|Default|Required|Options|
|:---|:--:|:----------|:-----:|:------:|:-----:|
|inputfolder<br/>-i|option|Input folder (default: "." )||||
|noinsight|boolean|Do not send anonymous usage stats||||
|outputfolder<br/>-o|option|Output folder (default: filteredMetadatas)||||
|packagexml<br/>-p|option|package.xml file path||||
|silent<br/>-s|boolean|Silent logs when no error||||
|verbose<br/>-v|boolean|Verbose||||

## Examples

```shell
$ sfdx essentials:metadata:filter-from-packagexml -p myPackage.xml
```

```shell
$ sfdx essentials:metadata:filter-from-packagexml -i md_api_output_dir -p myPackage.xml -o md_api_filtered_output_dir
```

```shell
$ sfdx force:source:convert -d tmp/deployDemoQuali/
sfdx essentials:metadata:filter-from-packagexml -i tmp/deployDemoQuali/ -p myPackage.xml -o tmp/deployDemoQualiFiltered/
sfdx force:mdapi:deploy -d tmp/deployDemoQualiFiltered/ -w 60 -u DemoQuali
```


