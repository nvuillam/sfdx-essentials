<!-- This file has been generated with command 'sfdx hardis:doc:plugin:generate'. Please do not update it manually or it may be overwritten -->
# essentials:metadata:uncomment

## Description

Uncomment lines in sfdx/md files (useful to manage @Deprecated annotations with managed packages)

Uncomment desired lines just before making a deployment

Once you flagged a packaged method as **@Deprecated** , you can not deploy it in an org not used for generating a managed package

Before :
// @Deprecated SFDX_ESSENTIALS_UNCOMMENT
global static List<OrgDebugOption__c> setDebugOption() {
  return null;
}

After :
@Deprecated // Uncommented by sfdx essentials:uncomment (https://github.com/nvuillam/sfdx-essentials)
global static List<OrgDebugOption__c> setDebugOption() {
  return null;
}
  

## Parameters

|Name|Type|Description|Default|Required|Options|
|:---|:--:|:----------|:-----:|:------:|:-----:|
|folder<br/>-f|option|SFDX project folder containing files||||
|noinsight|boolean|Do not send anonymous usage stats||||
|uncommentKey<br/>-k|option|Uncomment key (default: SFDX_ESSENTIALS_UNCOMMENT)||||
|verbose<br/>-v|boolean|Verbose||||

## Examples

```shell
$ sfdx essentials:metadata:uncomment --folder "./Projects/DevRootSource/tmp/deployPackagingDxcDevFiltered" --uncommentKey "SFDX_ESSENTIALS_UNCOMMENT_DxcDev_"
```


