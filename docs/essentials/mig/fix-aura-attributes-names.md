<!-- This file has been generated with command 'sfdx hardis:doc:plugin:generate'. Please do not update it manually or it may be overwritten -->
# essentials:mig:fix-aura-attributes-names

## Description

Replace reserved lightning attribute names in lightning components and apex classes

If you named a lightning attribute like a custom apex class, since Summer 18 you simply can not generate a managed package again.

This command lists all custom apex classes and custom objects names , then replaces all their references in lightning components and also in apex classes with their camelCase version.

Ex : MyClass_x attribute would be renamed myClassX

## Parameters

|Name|Type|Description|Default|Required|Options|
|:---|:--:|:----------|:-----:|:------:|:-----:|
|folder<br/>-f|option|SFDX project folder containing files||||
|noinsight|boolean|Do not send anonymous usage stats||||

## Examples

```shell
sfdx essentials:mig:fix-aura-attributes-names
```


