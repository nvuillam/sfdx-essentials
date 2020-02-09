import { Command, flags } from '@oclif/command';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as glob from 'glob';
import * as xmlFormatter from 'xml-formatter';
import * as xml2js from 'xml2js';
import * as builder from 'xmlbuilder';
import { MetadataUtils } from '../../../common/metadata-utils';

export default class PermissionSetGenerate extends Command {
    public static aliases = ['essentials:generate-permission-sets'];

    public static description = 'Generate permission sets in XML format used for SFDX project from package.xml file depending on JSON configuration file (See [Example configuration](https://github.com/nvuillam/sfdx-essentials/blob/master/examples/generate-permission-sets-config.json) and [Example log](https://github.com/nvuillam/sfdx-essentials/blob/master/examples/generate-permission-sets.log)) ![Generate permission sets log image](https://github.com/nvuillam/sfdx-essentials/raw/master/examples/generate-permission-sets-log.png "Generate permission sets log image")';

    public static examples = [
        '$ sfdx essentials:permissionset:generate -c "./Config/generate-permission-sets.json" -p "./Config/packageXml/package_DevRoot_Managed.xml" -f "./Projects/DevRootSource/force-app/main/default" -o "./Projects/DevRootSource/force-app/main/default/permissionsets"',
        '$ sfdx essentials:permissionset:generate -c "./Config/generate-permission-sets.json" -p "./Config/packageXml/package_DevRoot_xDemo.xml" -f "./Projects/DevRootSource/force-app/main/default" --nameSuffix Custom -o "./Projects/DevRootSource/force-app/main/default/permissionsets"'
    ];

    public static args = [];

    public static flags = {
        // Flag with a value (-n, --name=VALUE)
        configfile: flags.string({ char: 'c', description: 'config.json file' }),
        packagexml: flags.string({ char: 'p', description: 'package.xml file path' }),
        sfdxSourcesFolder: flags.string({ char: 'f', description: 'SFDX Sources folder (used to filter required and masterDetail fields)' }),
        nameSuffix: flags.string({ char: 's', description: 'Name suffix for generated permission sets' }),
        outputfolder: flags.string({ char: 'o', description: 'Output folder (default: "." )', default: '.' }),
        verbose: flags.boolean({ char: 'v', description: 'Verbose', default: false }) as unknown as flags.IOptionFlag<boolean>
    };

    // Input params properties
    public configFile: string;
    public packageXmlFile: string;
    public sfdxSourcesFolder: string;
    public nameSuffix: string;
    public outputFolder: string;
    public verbose: boolean = false;

    // Internal properties
    public packageXmlMetadatasTypeLs = [];
    public sobjectCollectedInfo = {};
    public translatedLanguageList = [];
    public summaryResult = { metadataTypes: {}, objects: [], objectsTranslations: [] };

    // @ts-ignore
    public describeMetadataAll = MetadataUtils.describeMetadataTypes();

    // Runtime methods
    public async run() {

        // tslint:disable-next-line:no-shadowed-variable
        const { flags } = this.parse(PermissionSetGenerate);

        // Get input arguments or default values
        this.configFile = flags.configfile;
        this.packageXmlFile = flags.packagexml;
        this.sfdxSourcesFolder = flags.sfdxSourcesFolder;
        this.nameSuffix = flags.nameSuffix;
        this.outputFolder = flags.outputfolder;
        this.verbose = flags.verbose;

        // Read config.json file
        const filterConfig: JSON = fse.readJsonSync(this.configFile);

        // Build log header
        this.buildDescriptionHeader(filterConfig);

        // Read package.xml file
        const parser = new xml2js.Parser();

        const promises = [];

        const packageXml = await parser.parseStringPromise(fs.readFileSync(this.packageXmlFile));
        const packageXmlTypes = this.separateCustomMetadatas(packageXml.Package.types);

        // Build permission set file for each item described in config file (use parallel promises for perfs)
        console.log(' Output files: ');
        for (let configName in filterConfig) {
            if (filterConfig.hasOwnProperty(configName) && !filterConfig[configName].isTemplate === true) {
                const itemPromise = new Promise(async (resolve, reject) => {

                    // Complete definition
                    let filterConfigItem = filterConfig[configName];
                    filterConfigItem = this.mergeExtendDependencies(filterConfigItem, filterConfig, configName);
                    if (filterConfigItem.packageXMLTypeList.findIndex((item: any) => (item.typeName === 'CustomField')) > -1) {
                        filterConfigItem = await this.excludeCustomFields(filterConfigItem);
                    }

                    let packageXMLTypeJSONArray = filterConfigItem.packageXMLTypeList;
                    let packageXMLTypesConfigArray = [];
                    for (const packageXMLTypeJSON of packageXMLTypeJSONArray) {
                        packageXMLTypesConfigArray.push(packageXMLTypeJSON.typeName);
                    }

                    if (this.verbose) {
                        console.log(`Generating ${configName} with computed config: \n` + JSON.stringify(filterConfigItem, null, 2));
                    }

                    // Build permission sets for each types (multiple) from packageXMLTypeList (JSON configuration file)
                    let permissionSetsXmlElements = '<PermissionSet xmlns="http://soap.sforce.com/2006/04/metadata">';
                    let permissionSetsMultipleXmlElement = '';
                    let permissionSetsSingleXmlElement = '';
                    permissionSetsMultipleXmlElement = this.filterPackageXmlTypes(packageXmlTypes, packageXMLTypesConfigArray, filterConfigItem);

                    // Build permission sets for each types (single)
                    permissionSetsSingleXmlElement = this.buildSinglePermissionSetXML(filterConfigItem);

                    // Build permission sets (extended, multiple & single)
                    permissionSetsXmlElements += permissionSetsMultipleXmlElement;
                    permissionSetsXmlElements += permissionSetsSingleXmlElement;
                    permissionSetsXmlElements += '</PermissionSet>';

                    // Write permission sets in XML format
                    if (this.nameSuffix) { // Manage name suffix if provided
                        configName += this.nameSuffix;
                    }
                    const outputFilename = this.outputFolder + '/' + configName + '.permissionset-meta.xml';
                    const formattedPsXml = xmlFormatter(permissionSetsXmlElements, { collapseContent: true });
                    fs.writeFile(outputFilename, formattedPsXml, err3 => {
                        if (!err3) {
                            console.log('      - ' + outputFilename);
                            resolve();
                        } else {
                            console.error(err3.message);
                            reject();
                        }
                    });
                });

                promises.push(itemPromise);
            }
        }

        // Wait all files to be processed
        await Promise.all(promises);
    }

    // Complete description with extend description
    public mergeExtendDependencies(filterConfigItem: any, filterConfig: any, configName: string) {
        if (filterConfig[configName].extends) {
            let filterConfigItemExtend = filterConfig[filterConfig[configName].extends];

            // Append objects of low-level packageXml in template config
            const packageXmlListItemExtend = filterConfigItemExtend.packageXMLTypeList;
            const packageXmlListItem = filterConfigItem.packageXMLTypeList || [];
            for (const packageItemExtend of packageXmlListItemExtend) {
                const match = packageXmlListItem.filter((item: any) => (item.typeName === packageItemExtend.typeName));
                // If packageXml item defined on template level and not on current level, add it
                if (match.length === 0) {
                    packageXmlListItem.push(packageItemExtend);
                }
            }
            filterConfigItem.packageXMLTypeList = packageXmlListItem.sort((a: any, b: any) => a.typeName.localeCompare(b.typeName)); // Sort by typeName value;

            // Add upper extends if here
            filterConfigItem = this.mergeExtendDependencies(filterConfigItem, filterConfig, filterConfig[configName].extends);
        }
        return filterConfigItem;
    }

    // Build header description
    public buildDescriptionHeader(filterConfig: JSON) {

        const configFilename = this.configFile.substring(this.configFile.lastIndexOf('/') + 1);

        console.log('Directory: ' + this.configFile);

        let order = 0;
        const tableLog = [];
        let hasTemplate = false;
        for (const configName in filterConfig) {
            if (filterConfig.hasOwnProperty(configName)) {
                const configItem = filterConfig[configName];
                const configNameExt = (this.nameSuffix) ? configName + this.nameSuffix : configName;
                const descriptionExt = (this.nameSuffix) ? configItem.description + '(' + this.nameSuffix + ')' : configItem.description;
                tableLog.push({
                    Order: order,
                    Name: configNameExt,
                    'Extended from': (configItem.extends) ? configItem.extends : '',
                    Description: descriptionExt
                });
                order++;
                if (filterConfig[configName].isTemplate) {
                    hasTemplate = true;
                }
            }
        }
        console.table(tableLog);

        if (hasTemplate === false) {
            console.warn(`WARNING: There is no "isTemplate: true" permission set defined in ${configFilename}. The basic permission set can be an easy way to generate permission sets and to avoid copy/paste if there are common permissions sets. The "extends" parameter is used in order to indicate the permission sets name that will be extended. In case there is no value for "extends",  only description in packageXMLTypeList parameter will be taken into account.`);
        }
    }

    // Exclude CustomFields which are of type MasterDetail or are required
    public async excludeCustomFields(filterConfigData: any) {
        if (!fs.existsSync(this.sfdxSourcesFolder)) {
            console.warn('Please provide a valid SFDX folder (-f) to filter required & masterDetail CustomFields');
            return filterConfigData;
        }
        // List all fields files
        const fetchCustomFieldsExpression = this.sfdxSourcesFolder + '/objects/*/fields/*.field-meta.xml';
        const customFieldsFileList = glob.sync(fetchCustomFieldsExpression);
        const promises = [];
        const excludedCustomFieldList = [];
        for (const customFieldFile of customFieldsFileList) {
            const itemPromise = new Promise((resolve, reject) => {
                // Read field file XML
                const parser = new xml2js.Parser();
                parser.parseString(fs.readFileSync(customFieldFile), (err: any, fieldXml: any) => {
                    if (err) {
                        console.error(`Error in : ${customFieldFile}` + err.message);
                        resolve();
                    }
                    // Add in exclude list if it must be removed from Permission Sets
                    let excludeIt = false;
                    if (fieldXml.CustomField.required && fieldXml.CustomField.required[0] === 'true') {
                        excludeIt = true;
                    } else if (fieldXml.CustomField.type && fieldXml.CustomField.type[0] === 'MasterDetail') {
                        excludeIt = true;
                    }
                    if (excludeIt === true) {
                        const objectName = customFieldFile.match(new RegExp('/objects/(.*)/fields'))[1];
                        const fieldName = customFieldFile.match(new RegExp('/fields/(.*).field-meta.xml'))[1];
                        const eltName = objectName + '.' + fieldName;
                        excludedCustomFieldList.push(eltName);
                    }
                    resolve();
                });
            });
            promises.push(itemPromise);
        }
        // Await all fields to be processed and update excludedFilterList to add custom fields to filter
        await Promise.all(promises);
        const customFieldDefPos = filterConfigData.packageXMLTypeList.findIndex((item: any) => (item.typeName === 'CustomField'));
        const customFieldDef = filterConfigData.packageXMLTypeList[customFieldDefPos];
        const permissionSetExcludedFilterArray: any[] = customFieldDef.excludedFilterList || [];
        customFieldDef.excludedFilterList = permissionSetExcludedFilterArray.concat(excludedCustomFieldList);
        filterConfigData.packageXMLTypeList[customFieldDefPos] = customFieldDef;
        return filterConfigData;
    }

    // Build permission set information by type for single element
    public buildSinglePermissionSetXML(filterConfigData: any) {

        let permissionSetsXmlElement = '';
        for (let filterConfigDataField in filterConfigData) {
            if (filterConfigDataField !== 'extends' && filterConfigDataField !== 'packageXMLTypeList') {
                if (this.nameSuffix && (filterConfigDataField === 'label' || filterConfigDataField === 'description')) {
                    filterConfigData[filterConfigDataField] += ' (' + this.nameSuffix + ')';
                }
                permissionSetsXmlElement += '<' + filterConfigDataField + '>' + filterConfigData[filterConfigDataField] + '</' + filterConfigDataField + '>';
            }
        }
        return permissionSetsXmlElement;
    }

    // Build permission set information by type for multiple element
    public buildMultiplePermissionSetXML({ packageXMLTypeConfig, typeMember }: { packageXMLTypeConfig: any; typeMember: string; }) {

        let typeName = packageXMLTypeConfig.typeName;
        let permissionSetElementJSONArray = packageXMLTypeConfig.permissionSetsElementList;
        let permissionSetsXmlElement: any;
        let permissionSetsXMLElmementName: any;
        let permissionSetXMLMemberName: any;

        permissionSetsXMLElmementName = this.describeMetadataAll[typeName].permissionSetTypeName;
        permissionSetXMLMemberName = this.describeMetadataAll[typeName].permissionSetMemberName;

        permissionSetsXmlElement = builder.create(permissionSetsXMLElmementName);
        permissionSetsXmlElement.ele(permissionSetXMLMemberName, typeMember).end({ pretty: true });

        for (const permissionSetElementJSON of permissionSetElementJSONArray) {
            const elementName = permissionSetElementJSON.elementName;
            const elementValue = permissionSetElementJSON.value;

            if (elementValue != undefined) {
                permissionSetsXmlElement.ele(elementName, elementValue).end({ pretty: true });
            }
        }

        return permissionSetsXmlElement;
    }

    // Process filtering and additional elements
    public filterPackageXmlTypes(packageXmlTypes: any, packageXMLTypesAll: any, permissionSetDefinition: any) {
        let permissionSetsXmlElement = '';
        for (const packageXmlType of packageXmlTypes) {

            const packageXmlTypesName = packageXmlType.name[0];

            if (packageXMLTypesAll.includes(packageXmlTypesName) && permissionSetDefinition.packageXMLTypeList.length > 0) {

                const indexOfType = packageXMLTypesAll.indexOf(packageXmlTypesName);
                const packageXMLTypeConfig = permissionSetDefinition.packageXMLTypeList[indexOfType];
                let packageXmlMembers = packageXmlType.members;
                // Add additional elements if defined
                if (packageXMLTypeConfig.additionalElements) {
                    packageXmlMembers = packageXmlMembers.concat(packageXMLTypeConfig.additionalElements).sort();
                }
                const permissionSetIncludedFilterArray = packageXMLTypeConfig.includedFilterList || ['(.*)']; // Default is regex "all"
                const permissionSetExcludedFilterArray = packageXMLTypeConfig.excludedFilterList || []; // Default is no exclusion

                for (let packageXmlMember of packageXmlMembers) {

                    let isIncludedFilterActivated = false;
                    let isExcludedFilterActivated = false;
                    let isIncludedMatch = false;
                    let isExcludedMatch = false;

                    // Check included filters
                    if (permissionSetIncludedFilterArray.length > 0) {
                        isIncludedFilterActivated = true;
                    }

                    for (let permissionSetIncludedFilter of permissionSetIncludedFilterArray) {
                        const isRegexIncluded = permissionSetIncludedFilter.startsWith('(');

                        if ((isRegexIncluded && packageXmlMember.match(permissionSetIncludedFilter)) || (!isRegexIncluded && packageXmlMember === permissionSetIncludedFilter)) {
                            isIncludedMatch = true;
                        }
                    }

                    // Check excluded filters
                    if (permissionSetExcludedFilterArray.length > 0) {
                        isExcludedFilterActivated = true;
                    }

                    for (let permissionSetExcludedFilter of permissionSetExcludedFilterArray) {
                        const isRegexExcluded = permissionSetExcludedFilter.startsWith('(');

                        if ((isRegexExcluded && packageXmlMember.match(permissionSetExcludedFilter)) || (!isRegexExcluded && packageXmlMember === permissionSetExcludedFilter)) {
                            isExcludedMatch = true;
                        }
                    }

                    if ((isIncludedFilterActivated && !isExcludedFilterActivated && isIncludedMatch) ||
                        (!isIncludedFilterActivated && isExcludedFilterActivated && !isExcludedMatch) ||
                        (isIncludedFilterActivated && isExcludedFilterActivated && isIncludedMatch && !isExcludedMatch) ||
                        (!isIncludedFilterActivated && !isExcludedFilterActivated)) {

                        const permissionSetsXMLElmementName = this.describeMetadataAll[packageXmlTypesName].permissionSetTypeName;

                        // Test classes are excluded and also type name that are not described in describeMetadata (metadata-utils/index.ts)
                        if (permissionSetsXMLElmementName !== undefined) {
                            permissionSetsXmlElement += this.buildMultiplePermissionSetXML({ packageXMLTypeConfig, typeMember: packageXmlMember });
                        }
                    }
                }
            }
        }

        return permissionSetsXmlElement;
    }

    // Separate custom metadatas from custom objects and custom fields
    public separateCustomMetadatas(packageXmlTypes: any[]) {
        for (let i = 0; i < packageXmlTypes.length; i++) {
            const packageXmlType = packageXmlTypes[i];

            // Custom Objects
            if (packageXmlType.name[0] === 'CustomObject') {
                // Filter CustomObjects member list to remove Metadata objects
                const packageXmlTypeMmbrObj = packageXmlType.members.filter((member: string) => !(member.includes('__mdt') || member.includes('__e')));
                const packageXmlTypeMmbrMdt = packageXmlType.members.filter((member: string) => member.includes('__mdt'));
                const packageXmlTypeMmbrEvt = packageXmlType.members.filter((member: string) => member.includes('__e'));
                packageXmlType.members = packageXmlTypeMmbrObj;
                packageXmlTypes[i] = packageXmlType;

                // Add new 'virtual' packageXml item CustomMetadata
                if (packageXmlTypeMmbrMdt.length > 0) {
                    const packageXmlTypeMdt = {
                        members: packageXmlTypeMmbrMdt,
                        name: ['CustomMetadataType']
                    };
                    packageXmlTypes.push(packageXmlTypeMdt);
                }

                // Add new 'virtual' packageXml item CustomMetadata
                if (packageXmlTypeMmbrEvt.length > 0) {
                    const packageXmlTypeEvt = {
                        members: packageXmlTypeMmbrEvt,
                        name: ['CustomPlatformEvent']
                    };
                    packageXmlTypes.push(packageXmlTypeEvt);
                }
            }

            // Custom Fields
            if (packageXmlType.name[0] === 'CustomField') {
                // Filter CustomField members list to remove Metadata fields
                const packageXmlTypeMmbrObj = packageXmlType.members.filter((member: string) => !(member.includes('__mdt') || member.includes('__e')));
                packageXmlType.members = packageXmlTypeMmbrObj.sort((a: any, b: any) => a.localeCompare(b)); // Sort
                packageXmlTypes[i] = packageXmlType;

            }
        }

        return packageXmlTypes.sort((a: any, b: any) => a.name[0].localeCompare(b.name[0])); // Sort by name value;
    }
}
