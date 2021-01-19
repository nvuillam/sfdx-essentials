<!-- markdownlint-disable -->
Salesforce DX Essentials
========================

[![Version](https://img.shields.io/npm/v/sfdx-essentials.svg)](https://npmjs.org/package/sfdx-essentials)
[![Downloads/week](https://img.shields.io/npm/dw/sfdx-essentials.svg)](https://npmjs.org/package/sfdx-essentials)
[![Downloads/total](https://img.shields.io/npm/dt/sfdx-essentials.svg)](https://npmjs.org/package/sfdx-essentials)
[![CircleCI](https://circleci.com/gh/nvuillam/sfdx-essentials/tree/master.svg?style=shield)](https://circleci.com/gh/nvuillam/sfdx-essentials/tree/master)
[![codecov](https://codecov.io/gh/nvuillam/sfdx-essentials/branch/master/graph/badge.svg)](https://codecov.io/gh/nvuillam/sfdx-essentials)
[![Mega-Linter](https://github.com/nvuillam/sfdx-essentials/workflows/Mega-Linter/badge.svg?branch=master)](https://github.com/nvuillam/mega-linter#readme)
[![GitHub contributors](https://img.shields.io/github/contributors/nvuillam/sfdx-essentials.svg)](https://gitHub.com/nvuillam/sfdx-essentials/graphs/contributors/)
[![GitHub stars](https://img.shields.io/github/stars/nvuillam/sfdx-essentials?label=Star&maxAge=2592000)](https://GitHub.com/nvuillam/sfdx-essentials/stargazers/)
[![License](https://img.shields.io/npm/l/sfdx-essentials.svg)](https://github.com/nvuillam/sfdx-essentials/blob/master/package.json)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

# SFDX ESSENTIALS PLUGIN

Toolbox for Salesforce DX to provide some very helpful additional features to base sfdx commands.

**SFDX Essentials** commands are focused on DevOps, but not only (cleaning, sources consistency check ...)

Easy to integrate in a CD/CI process (Jenkins Pipeline,CircleCI...)

See [CHANGELOG](https://github.com/nvuillam/sfdx-essentials/blob/master/CHANGELOG.md)

Any **question**, **problem** or **enhancement request** ? Ask [**here**](https://github.com/nvuillam/sfdx-essentials/issues) :)

## Commands

### Metadata

| Command | Description |
| ------------- | ------------- |
| [essentials:metadata:filter-from-packagexml](#sfdx-essentialsmetadatafilter-from-packagexml) | **Filter metadatas generated from a SFDX Project** in order to be able to deploy only part of them on an org |
| [essentials:metadata:filter-xml-content](#sfdx-essentialsmetadatafilter-xml-content) | **Filter content of metadatas (XML)** in order to be able to deploy only part of them on an org |
| [sfdx essentials:metadata:uncomment](#sfdx-essentialsmetadatauncomment) | **Uncomment lines in sfdx/md files** (useful to manage @Deprecated annotations with managed packages) |

### Migration

| Command | Description |
| ------------- | ------------- |
| [essentials:mig:fix-aura-attributes-names](#sfdx-essentialsmigfix-aura-attributes-names) | **Replace reserved lightning attribute names in lightning components and apex classes** ( if you named a lightning attribute like a custom apex class, since Summer 18 you simply can not generate a managed package again) |
| [essentials:mig:migrate-object-model](#sfdx-essentialsmigmigrate-object-model) | **Migrate sources from an object model to a new object model** |
| [essentials:mig:add-namespace](#sfdx-essentialsmigadd-namespace) | **Update SFDX sources to add a namespace on references to items described in a package.xml file** |

### Package.xml

| Command | Description |
| ------------- | ------------- |
| [essentials:packagexml:append](#sfdx-essentialspackagexmlappend) | **Append content of a package.xml files into a single one** |
| [essentials:packagexml:sort](#sfdx-essentialspackagexmlsort) | **Reorder alphabetically the content of package.xml file(s)** |

### Permission sets

| Command | Description |
| ------------- | ------------- |
| [essentials:permissionset:generate](#sfdx-essentialspermissionsetgenerate) | **Generate permission sets** from packageXml file depending on JSON configuration file |

### SFDX Project

| Command | Description |
| ------------- | ------------- |
| [essentials:project:change-dependency-version](#sfdx-essentialsprojectchange-dependency-version) | **Replace other managed packages dependency version number** ( very useful when you build a managed package over another managed package, like Financial Services Cloud ) |
| [essentials:project:check-consistency-with-packagexml](#sfdx-essentialsprojectcheck-consistency-with-packagexml) | **Check consistency between a SFDX project files and package.xml files** |
| [essentials:project:count-apex-lines](#sfdx-essentialsprojectcount-apex-lines) | **Count apex source lines of filtered files** |

## INSTALLATION

```shell
    sfdx plugins:install sfdx-essentials
```

- Windows users: [sfdx plugin generator](https://github.com/forcedotcom/sfdx-plugin-generate) is bugged on windows (hardcode call of linux rm instruction) , so you may use [Git Bash](https://gitforwindows.org/) to run this code ( at least while it installs the plugin dependencies )

- CI Users: As the plugin is not signed, to install it from a Dockerfile or a script:

```shell
    echo 'y' | sfdx plugins:install sfdx-essentials
```

## UPGRADE

Its seems that `sfdx plugins:update` does not always work, in that case , uninstall then reinstall the plugin

```shell
    sfdx plugins:uninstall sfdx-essentials
    sfdx plugins:install sfdx-essentials
```

## CONTRIBUTE

Contributions are very welcome, please run **npm run lint:fix** and **npm run test** before making a new PR

- Fork the repo and clone it on your computer
- To [debug](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_plugins.meta/sfdx_cli_plugins/cli_plugins_debug.htm), run  ``` $ sfdx plugins:link ``` or use  ``` $ NODE_OPTIONS=--inspect-brk bin/run yourcommand ```
- Now your calls to sfdx essentials are performed on your local sources
- Once your code is ready, documented and linted, please make a pull request :)

# Command details
<!-- cSpell:disable -->
<!-- commands -->
* [`sfdx essentials:metadata:filter-from-packagexml`](#sfdx-essentialsmetadatafilter-from-packagexml)
* [`sfdx essentials:metadata:filter-xml-content`](#sfdx-essentialsmetadatafilter-xml-content)
* [`sfdx essentials:metadata:uncomment`](#sfdx-essentialsmetadatauncomment)
* [`sfdx essentials:mig:add-namespace`](#sfdx-essentialsmigadd-namespace)
* [`sfdx essentials:mig:fix-aura-attributes-names`](#sfdx-essentialsmigfix-aura-attributes-names)
* [`sfdx essentials:mig:migrate-object-model`](#sfdx-essentialsmigmigrate-object-model)
* [`sfdx essentials:packagexml:append`](#sfdx-essentialspackagexmlappend)
* [`sfdx essentials:packagexml:sort`](#sfdx-essentialspackagexmlsort)
* [`sfdx essentials:permissionset:generate`](#sfdx-essentialspermissionsetgenerate)
* [`sfdx essentials:project:change-dependency-version`](#sfdx-essentialsprojectchange-dependency-version)
* [`sfdx essentials:project:check-consistency-with-packagexml`](#sfdx-essentialsprojectcheck-consistency-with-packagexml)
* [`sfdx essentials:project:count-apex-lines`](#sfdx-essentialsprojectcount-apex-lines)

## `sfdx essentials:metadata:filter-from-packagexml`

Filter metadatas generated from a SFDX Project in order to be able to deploy only part of them on an org

```
USAGE
  $ sfdx essentials:metadata:filter-from-packagexml

OPTIONS
  -i, --inputfolder=inputfolder    Input folder (default: "." )
  -o, --outputfolder=outputfolder  Output folder (default: filteredMetadatas)
  -p, --packagexml=packagexml      package.xml file path
  -s, --silent                     Silent logs when no error
  -v, --verbose                    Verbose
  --noinsight                      Do not send anonymous usage stats

DESCRIPTION
  This can help if you need to deploy only part of the result of sfdx force:source:convert into a org, by filtering the 
  result (usually in mdapi_output_dir) to keep only the items referenced in your own package.xml file

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

ALIASES
  $ sfdx essentials:filter-metadatas

EXAMPLES
  $ sfdx essentials:metadata:filter-from-packagexml -p myPackage.xml
  $ sfdx essentials:metadata:filter-from-packagexml -i md_api_output_dir -p myPackage.xml -o md_api_filtered_output_dir
  $ sfdx force:source:convert -d tmp/deployDemoQuali/
  sfdx essentials:metadata:filter-from-packagexml -i tmp/deployDemoQuali/ -p myPackage.xml -o 
  tmp/deployDemoQualiFiltered/
  sfdx force:mdapi:deploy -d tmp/deployDemoQualiFiltered/ -w 60 -u DemoQuali
```

_See code: [src/commands/essentials/metadata/filter-from-packagexml.ts](https://github.com/nvuillam/sfdx-essentials/blob/v2.5.3/src/commands/essentials/metadata/filter-from-packagexml.ts)_

## `sfdx essentials:metadata:filter-xml-content`

Filter content of metadatas (XML) in order to be able to deploy only part of them on an org (See [Example configuration](https://github.com/nvuillam/sfdx-essentials/blob/master/examples/filter-xml-content-config.json))

```
USAGE
  $ sfdx essentials:metadata:filter-xml-content

OPTIONS
  -c, --configFile=configFile      Config JSON file path
  -i, --inputfolder=inputfolder    Input folder (default: "." )
  -o, --outputfolder=outputfolder  Output folder (default: parentFolder + _xml_content_filtered)
  --noinsight                      Do not send anonymous usage stats

DESCRIPTION
  When you perform deployments from one org to another, the features activated in the target org may not fit the content 
  of the sfdx/metadata files extracted from the source org.

  You may need to filter some elements in the XML files, for example in the Profiles

  This script requires a filter-config.json file

ALIASES
  $ sfdx essentials:filter-xml-content

EXAMPLES
  sfdx essentials:filter-xml-content -i "./mdapi_output"
  sfdx essentials:filter-xml-content -i "retrieveUnpackaged"
```

_See code: [src/commands/essentials/metadata/filter-xml-content.ts](https://github.com/nvuillam/sfdx-essentials/blob/v2.5.3/src/commands/essentials/metadata/filter-xml-content.ts)_

## `sfdx essentials:metadata:uncomment`

Uncomment lines in sfdx/md files (useful to manage @Deprecated annotations with managed packages)

```
USAGE
  $ sfdx essentials:metadata:uncomment

OPTIONS
  -f, --folder=folder              SFDX project folder containing files
  -k, --uncommentKey=uncommentKey  Uncomment key (default: SFDX_ESSENTIALS_UNCOMMENT)
  -v, --verbose                    Verbose
  --noinsight                      Do not send anonymous usage stats

DESCRIPTION
  Uncomment desired lines just before making a deployment

  Once you flagged a packaged method as **@Deprecated** , you can not deploy it in an org not used for generating a 
  managed package

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

ALIASES
  $ sfdx essentials:uncomment

EXAMPLE
  $ sfdx essentials:metadata:uncomment --folder "./Projects/DevRootSource/tmp/deployPackagingDxcDevFiltered" 
  --uncommentKey "SFDX_ESSENTIALS_UNCOMMENT_DxcDev_"
```

_See code: [src/commands/essentials/metadata/uncomment.ts](https://github.com/nvuillam/sfdx-essentials/blob/v2.5.3/src/commands/essentials/metadata/uncomment.ts)_

## `sfdx essentials:mig:add-namespace`

Migrate sources from an object model to a new object model (See [Example configuration](https://github.com/nvuillam/sfdx-essentials/blob/master/examples/migrate-object-model-config.json))

```
USAGE
  $ sfdx essentials:mig:add-namespace

OPTIONS
  -e, --excludeExpressionList=excludeExpressionList  List of expressions to ignore. ex: **/node_modules/**

  -f, --fetchExpressionList=fetchExpressionList      Fetch expression list. Let default if you dont know. ex:
                                                     ./aura/**/*.js,./aura/**/*.cmp,./classes/*.cls,./objects/*/fields/*
                                                     .xml,./objects/*/recordTypes/*.xml,./triggers/*.trigger,./permissio
                                                     nsets/*.xml,./profiles/*.xml,./staticresources/*.json

  -i, --inputFolder=inputFolder                      Input folder (default: "." )

  -l, --labelsfile=labelsfile                        Path to CustomLabel.labels-meta.xml

  -n, --namespace=namespace                          (required) Namespace string

  -p, --packagexml=packagexml                        (required) Path to package.xml file

  -v, --verbose                                      Verbose

  --noinsight                                        Do not send anonymous usage stats

DESCRIPTION
  Use this command if you need to replace a SObject by another one in all your sfdx sources

ALIASES
  $ sfdx essentials:migrate-object-model

EXAMPLES
  $ essentials:mig:add-namespace -n DxcOemDev -p "../../somefolder/package.xml"
  $ essentials:mig:add-namespace -n DxcOemDev -i "C:/Work/git/some-client-project/Projects/DevRootSource" 
  --fetchExpressionList="**/*.apex,**/*.json" -p 
  "C:/Work/git/DXCO4SF_Sources_OEM_ST/Config/packageXml/package_DevRoot_Managed.xml"
  $ essentials:mig:add-namespace -n DxcOemDev -e "**/www*" -p "../../somefolder/package.xml"
```

_See code: [src/commands/essentials/mig/add-namespace.ts](https://github.com/nvuillam/sfdx-essentials/blob/v2.5.3/src/commands/essentials/mig/add-namespace.ts)_

## `sfdx essentials:mig:fix-aura-attributes-names`

Replace reserved lightning attribute names in lightning components and apex classes

```
USAGE
  $ sfdx essentials:mig:fix-aura-attributes-names

OPTIONS
  -f, --folder=folder  SFDX project folder containing files
  --noinsight          Do not send anonymous usage stats

DESCRIPTION
  If you named a lightning attribute like a custom apex class, since Summer 18 you simply can not generate a managed 
  package again.

  This command lists all custom apex classes and custom objects names , then replaces all their references in lightning 
  components and also in apex classes with their camelCase version.

  Ex : MyClass_x attribute would be renamed myClassX

ALIASES
  $ sfdx essentials:fix-lightning-attribute-names

EXAMPLE
  sfdx essentials:mig:fix-aura-attributes-names
```

_See code: [src/commands/essentials/mig/fix-aura-attributes-names.ts](https://github.com/nvuillam/sfdx-essentials/blob/v2.5.3/src/commands/essentials/mig/fix-aura-attributes-names.ts)_

## `sfdx essentials:mig:migrate-object-model`

Migrate sources from an object model to a new object model (See [Example configuration](https://github.com/nvuillam/sfdx-essentials/blob/master/examples/migrate-object-model-config.json))

```
USAGE
  $ sfdx essentials:mig:migrate-object-model

OPTIONS
  -c, --configFile=configFile                    JSON config file
  -d, --[no-]deleteFiles                         Delete files with deprecated references

  -f, --fetchExpressionList=fetchExpressionList  Fetch expression list. Let default if you dont know. ex:
                                                 /aura/**/*.js,./aura/**/*.cmp,./classes/*.cls,./objects/*/fields/*.xml,
                                                 ./objects/*/recordTypes/*.xml,./triggers/*.trigger,./permissionsets/*.x
                                                 ml,./profiles/*.xml,./staticresources/*.json

  -i, --inputFolder=inputFolder                  Input folder (default: "." )

  -k, --[no-]deleteFilesExpr                     Delete files matching expression

  -r, --[no-]replaceExpressions                  Replace expressions using fetchExpressionList

  -s, --[no-]copySfdxProjectFolder               Copy sfdx project files after process

  -v, --verbose                                  Verbose

  --noinsight                                    Do not send anonymous usage stats

DESCRIPTION
  Use this command if you need to replace a SObject by another one in all your sfdx sources

ALIASES
  $ sfdx essentials:migrate-object-model

EXAMPLES
  $ sfdx essentials:mig:migrate-object-model -c "./config/migrate-object-model-config.json"
  $ sfdx essentials:mig:migrate-object-model -c migration/config-to-oem.json -i Config/packageXml --fetchExpressionList 
  "./package*.xml" --no-deleteFiles --no-deleteFilesExpr --no-copySfdxProjectFolder
```

_See code: [src/commands/essentials/mig/migrate-object-model.ts](https://github.com/nvuillam/sfdx-essentials/blob/v2.5.3/src/commands/essentials/mig/migrate-object-model.ts)_

## `sfdx essentials:packagexml:append`

Append content of a package.xml files into a single one

```
USAGE
  $ sfdx essentials:packagexml:append

OPTIONS
  -o, --outputfile=outputfile    package.xml output file
  -p, --packagexmls=packagexmls  package.xml files path (separated by commas)
  -v, --verbose                  Verbose
  --noinsight                    Do not send anonymous usage stats

DESCRIPTION
  API version number of the result file will be the same than in the first package.xml file sent as argument

EXAMPLE
  sfdx essentials:packagexml:append -p 
  "./Config/packageXml/package_DevRoot_Managed.xml,./Config/packageXml/package_DevRoot_Demo.xml,./Config/packageXml/pack
  age_DevRoot_Scratch.xml" -o "./Config/packageXml/package_for_new_scratch_org.xml"
```

_See code: [src/commands/essentials/packagexml/append.ts](https://github.com/nvuillam/sfdx-essentials/blob/v2.5.3/src/commands/essentials/packagexml/append.ts)_

## `sfdx essentials:packagexml:sort`

Developers have the bad habit to input package.xml files in a non-alphabetical order. Use this command to reorder alphabetically your package.xml files !

```
USAGE
  $ sfdx essentials:packagexml:sort

OPTIONS
  -p, --packagexml=packagexml  package.xml file path (or a folder containing package.xml files)
  --noinsight                  Do not send anonymous usage stats

ALIASES
  $ sfdx essentials:order-package-xml
  $ sfdx essentials:packagexml:reorder

EXAMPLES
  $ sfdx essentials:packagexml:sort -p "./Config/packageXml/package.xml"
  $ sfdx essentials:packagexml:sort -p "./Config/packageXml"
```

_See code: [src/commands/essentials/packagexml/sort.ts](https://github.com/nvuillam/sfdx-essentials/blob/v2.5.3/src/commands/essentials/packagexml/sort.ts)_

## `sfdx essentials:permissionset:generate`

Generate permission sets in XML format used for SFDX project from package.xml file depending on JSON configuration file (See [Example configuration](https://github.com/nvuillam/sfdx-essentials/blob/master/examples/generate-permission-sets-config.json) and [Example log](https://github.com/nvuillam/sfdx-essentials/blob/master/examples/generate-permission-sets.log)) ![Generate permission sets log image](https://github.com/nvuillam/sfdx-essentials/raw/master/examples/generate-permission-sets-log.png "Generate permission sets log image")

```
USAGE
  $ sfdx essentials:permissionset:generate

OPTIONS
  -c, --configfile=configfile                config.json file
  -f, --sfdxSourcesFolder=sfdxSourcesFolder  SFDX Sources folder (used to filter required and masterDetail fields)
  -o, --outputfolder=outputfolder            [default: .] Output folder (default: "." )
  -p, --packagexml=packagexml                package.xml file path
  -s, --nameSuffix=nameSuffix                Name suffix for generated permission sets
  -v, --verbose                              Verbose
  --noinsight                                Do not send anonymous usage stats

ALIASES
  $ sfdx essentials:generate-permission-sets

EXAMPLES
  $ sfdx essentials:permissionset:generate -c "./Config/generate-permission-sets.json" -p 
  "./Config/packageXml/package_DevRoot_Managed.xml" -f "./Projects/DevRootSource/force-app/main/default" -o 
  "./Projects/DevRootSource/force-app/main/default/permissionsets"
  $ sfdx essentials:permissionset:generate -c "./Config/generate-permission-sets.json" -p 
  "./Config/packageXml/package_DevRoot_xDemo.xml" -f "./Projects/DevRootSource/force-app/main/default" --nameSuffix 
  Custom -o "./Projects/DevRootSource/force-app/main/default/permissionsets"
```

_See code: [src\commands\essentials\permissionset\generate.ts](https://github.com/nvuillam/sfdx-essentials/blob/v2.5.3/src\commands\essentials\permissionset\generate.ts)_

## `sfdx essentials:project:change-dependency-version`

Allows to change an external package dependency version, or update api version

```
USAGE
  $ sfdx essentials:project:change-dependency-version

OPTIONS
  -a, --apiversion=apiversion      If sent, updates api version
  -f, --folder=folder              SFDX project folder containing files
  -j, --majorversion=majorversion  Major version
  -m, --minorversion=minorversion  Minor version
  -n, --namespace=namespace        Namespace of the managed package
  -r, --remove                     Verbose
  -v, --verbose                    Verbose
  --noinsight                      Do not send anonymous usage stats

DESCRIPTION
  Can also :

     - remove package dependencies if --namespace and --remove arguments are sent
     - update API version

ALIASES
  $ sfdx essentials:change-dependency-version
  $ sfdx essentials:change-api-version
  $ sfdx essentials:project:change-api-version

EXAMPLES
  $ sfdx essentials:project:change-dependency-version -n FinServ -j 214 -m 7
  $ sfdx essentials:project:change-dependency-version -n FinServ -r
  $ sfdx essentials:project:change-dependency-version -a 47.0
```

_See code: [src/commands/essentials/project/change-dependency-version.ts](https://github.com/nvuillam/sfdx-essentials/blob/v2.5.3/src/commands/essentials/project/change-dependency-version.ts)_

## `sfdx essentials:project:check-consistency-with-packagexml`

Allows to compare the content of a SFDX and the content of one or several (concatenated) package.xml files ( See [Example log](https://github.com/nvuillam/sfdx-essentials/blob/master/examples/check-sfdx-project-consistency.log)) ![Check SFDX project consistency log image](https://github.com/nvuillam/sfdx-essentials/raw/master/examples/check-sfdx-project-consistency-log.png "Check SFDX project consistency log image")

```
USAGE
  $ sfdx essentials:project:check-consistency-with-packagexml

OPTIONS
  -c, --chatty                                     Chatty logs

  -d, --ignoreDuplicateTypes=ignoreDuplicateTypes  List of types to ignore while checking for duplicates in package.xml
                                                   files

  -f, --failIfError                                Script failing if errors are founds

  -i, --inputfolder=inputfolder                    SFDX Project folder (default: "." )

  -j, --jsonLogging                                JSON logs

  -p, --packageXmlList=packageXmlList              List of package.xml files path

  --noinsight                                      Do not send anonymous usage stats

DESCRIPTION
  This will output a table with the number of elements :

     - Existing in both SFDX Project files and package.xml file(s)
     - Existing only in SFDX Project files
     - Existing only in package.xml file(s)

ALIASES
  $ sfdx essentials:check-sfdx-project-consistency

EXAMPLE
  $  sfdx essentials:project:check-consistency-with-packagexml -p 
  "./Config/packageXml/package_DevRoot_Managed.xml,./Config/packageXml/package_DevRoot_xDemo.xml" -i 
  "./Projects/DevRootSource/force-app/main/default" -d "Document,EmailTemplate" --failIfError
```

_See code: [src/commands/essentials/project/check-consistency-with-packagexml.ts](https://github.com/nvuillam/sfdx-essentials/blob/v2.5.3/src/commands/essentials/project/check-consistency-with-packagexml.ts)_

## `sfdx essentials:project:count-apex-lines`

Allows to count lines of apex executable code related to filtered items

```
USAGE
  $ sfdx essentials:project:count-apex-lines

OPTIONS
  -b, --browsingpattern=browsingpattern  Files browsing pattern. Default **/*.cls
  -e, --excludepattern=excludepattern    Regex to exclude patterns
  -f, --folder=folder                    SFDX project folder containing files
  -p, --packagexmls=packagexmls          package.xml files path (separated by commas)
  -s, --sort=sort                        [default: alpha] Sort order: alpha (default), lines, chars
  -v, --verbose                          Verbose
  -w, --weight                           Return also weight (number of chars). Slower and requires Perl
  --noinsight                            Do not send anonymous usage stats

ALIASES
  $ sfdx essentials:count-apex-lines

EXAMPLES
  $ sfdx essentials:project:count-apex-lines -f "./force-app/main/default"
  $ sfdx essentials:project:count-apex-lines -f "./force-app/main/default" -b "**/WsMockV*.cls"
  $ sfdx essentials:project:count-apex-lines -f "./force-app/main/default" -p "./packagexml/package1.xml"
  $ sfdx essentials:project:count-apex-lines -f "./force-app/main/default" -p "./packagexml/package1.xml" -e 
  "(WsBlabla|POC_)"
```

_See code: [src/commands/essentials/project/count-apex-lines.ts](https://github.com/nvuillam/sfdx-essentials/blob/v2.5.3/src/commands/essentials/project/count-apex-lines.ts)_
<!-- commandsstop -->
