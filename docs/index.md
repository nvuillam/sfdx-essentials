<!-- This file has been generated with command 'sfdx hardis:doc:plugin:generate'. Please do not update it manually or it may be overwritten -->

# sfdx-essentials

## Description

Toolbox for Salesforce DX to provide some very helpful additional features to base sfdx commands.

## Commands

### essentials:metadata

|Command|Title|
|:------|:----------|
|[**essentials:metadata:filter-from-packagexml**](essentials/metadata/filter-from-packagexml.md)|Filter metadatas generated from a SFDX Project in order to be able to deploy only part of them on an org|
|[**essentials:metadata:filter-xml-content**](essentials/metadata/filter-xml-content.md)|Filter content of metadatas (XML) in order to be able to deploy only part of them on an org (See [Example configuration](https://github.com/nvuillam/sfdx-essentials/blob/master/examples/filter-xml-content-config.json))|
|[**essentials:metadata:uncomment**](essentials/metadata/uncomment.md)|Uncomment lines in sfdx/md files (useful to manage @Deprecated annotations with managed packages)|

### essentials:mig

|Command|Title|
|:------|:----------|
|[**essentials:mig:add-namespace**](essentials/mig/add-namespace.md)|Migrate sources from an object model to a new object model (See [Example configuration](https://github.com/nvuillam/sfdx-essentials/blob/master/examples/migrate-object-model-config.json))|
|[**essentials:mig:fix-aura-attributes-names**](essentials/mig/fix-aura-attributes-names.md)|Replace reserved lightning attribute names in lightning components and apex classes|
|[**essentials:mig:migrate-object-model**](essentials/mig/migrate-object-model.md)|Migrate sources from an object model to a new object model (See [Example configuration](https://github.com/nvuillam/sfdx-essentials/blob/master/examples/migrate-object-model-config.json))|

### essentials:packagexml

|Command|Title|
|:------|:----------|
|[**essentials:packagexml:append**](essentials/packagexml/append.md)|Append content of a package.xml files into a single one|
|[**essentials:packagexml:remove**](essentials/packagexml/remove.md)|Removes the content of a package.xml file matching another package.xml file|
|[**essentials:packagexml:sort**](essentials/packagexml/sort.md)|Developers have the bad habit to input package.xml files in a non-alphabetical order. Use this command to reorder alphabetically your package.xml files !|

### essentials:permissionset

|Command|Title|
|:------|:----------|
|[**essentials:permissionset:generate**](essentials/permissionset/generate.md)|Generate permission sets in XML format used for SFDX project from package.xml file depending on JSON configuration file (See [Example configuration](https://github.com/nvuillam/sfdx-essentials/blob/master/examples/generate-permission-sets-config.json) and [Example log](https://github.com/nvuillam/sfdx-essentials/blob/master/examples/generate-permission-sets.log)) ![Generate permission sets log image](https://github.com/nvuillam/sfdx-essentials/raw/master/examples/generate-permission-sets-log.png "Generate permission sets log image")|

### essentials:project

|Command|Title|
|:------|:----------|
|[**essentials:project:change-dependency-version**](essentials/project/change-dependency-version.md)|Allows to change an external package dependency version, or update api version|
|[**essentials:project:check-consistency-with-packagexml**](essentials/project/check-consistency-with-packagexml.md)|Allows to compare the content of a SFDX and the content of one or several (concatenated) package.xml files ( See [Example log](https://github.com/nvuillam/sfdx-essentials/blob/master/examples/check-sfdx-project-consistency.log)) ![Check SFDX project consistency log image](https://github.com/nvuillam/sfdx-essentials/raw/master/examples/check-sfdx-project-consistency-log.png "Check SFDX project consistency log image")|
|[**essentials:project:count-apex-lines**](essentials/project/count-apex-lines.md)|Allows to count lines of apex executable code related to filtered items|
