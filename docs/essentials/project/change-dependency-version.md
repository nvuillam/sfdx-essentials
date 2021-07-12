<!-- This file has been generated with command 'sfdx hardis:doc:plugin:generate'. Please do not update it manually or it may be overwritten -->
# essentials:project:change-dependency-version

## Description

Allows to change an external package dependency version, or update api version

  Can also :

  - remove package dependencies if --namespace and --remove arguments are sent
  - update API version
   

## Parameters

|Name|Type|Description|Default|Required|Options|
|:---|:--:|:----------|:-----:|:------:|:-----:|
|apiversion<br/>-a|option|If sent, updates api version||||
|folder<br/>-f|option|SFDX project folder containing files||||
|majorversion<br/>-j|option|Major version||||
|minorversion<br/>-m|option|Minor version||||
|namespace<br/>-n|option|Namespace of the managed package||||
|noinsight|boolean|Do not send anonymous usage stats||||
|remove<br/>-r|boolean|Verbose||||
|verbose<br/>-v|boolean|Verbose||||

## Examples

```shell
$ sfdx essentials:project:change-dependency-version -n FinServ -j 214 -m 7
```

```shell
$ sfdx essentials:project:change-dependency-version -n FinServ -r
```

```shell
$ sfdx essentials:project:change-dependency-version -a 47.0
```


