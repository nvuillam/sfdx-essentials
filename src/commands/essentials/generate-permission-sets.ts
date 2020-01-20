import { Command, flags } from '@oclif/command';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as glob from 'glob';
import * as xml2js from 'xml2js';
import * as builder from 'xmlbuilder';
import * as xmlFormatter from 'xml-formatter';
import metadataUtils = require('../../common/metadata-utils');
import { FILE } from 'dns';

export default class ExecuteGeneratePermissionSets extends Command {
    public static description = '';
    public static examples = [];
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
    public describeMetadataAll = metadataUtils.describeMetadataTypes();

    // Runtime methods
    public async run() {

        // tslint:disable-next-line:no-shadowed-variable
        const { args, flags } = this.parse(ExecuteGeneratePermissionSets);

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

        // Build permission set file for each item described in config file (use parallel promises for perfs)
        console.log(' Output files: ');
        for (let configName in filterConfig) {
            if (filterConfig.hasOwnProperty(configName) && !filterConfig[configName].isTemplate === true) {
                const itemPromise = new Promise(async (resolve, reject) => {

                    // Complete definition
                    let filterConfigNameJSONArray = filterConfig[configName];
                    filterConfigNameJSONArray = this.mergeExtendDependencies(filterConfigNameJSONArray, filterConfig, configName);
                    if (filterConfigNameJSONArray.packageXMLTypeList.findIndex((item: any) => (item.typeName === 'CustomField')) > -1) {
                        filterConfigNameJSONArray = await this.excludeCustomFields(filterConfigNameJSONArray);
                    }
                    let packageXMLTypeJSONArray = filterConfigNameJSONArray.packageXMLTypeList;
                    let packageXMLTypesConfigArray = [];
                    for (const packageXMLTypeJSON of packageXMLTypeJSONArray) {
                        packageXMLTypesConfigArray.push(packageXMLTypeJSON.typeName);
                    }

                    if (this.verbose) {
                        console.log(`Generating ${configName} with computed config: \n` + JSON.stringify(filterConfigNameJSONArray, null, 2));
                    }

                    // Build permission sets for each types (multiple) from packageXMLTypeList (JSON configuration file)
                    let permissionSetsXmlElements = '<PermissionSet xmlns="http://soap.sforce.com/2006/04/metadata">';
                    let permissionSetsMultipleXmlElement = '';
                    let permissionSetsSingleXmlElement = '';
                    const packageXmlTypes = packageXml.Package.types;
                    permissionSetsMultipleXmlElement = this.filterPackageXmlTypes(packageXmlTypes, packageXMLTypesConfigArray, filterConfigNameJSONArray);

                    // Build permission sets for each types (single)
                    permissionSetsSingleXmlElement = this.buildSinglePermissionSetXML(filterConfigNameJSONArray);

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
                    fs.writeFile(outputFilename, formattedPsXml, (err3) => {
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
                tableLog.push({
                    'Order': order,
                    'Label': configName,
                    'Extended from': (configItem.extends) ? configItem.extends : '',
                    'Description': configItem.description
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
    public buildMultiplePermissionSetXML({ packageXMLTypeConfigJSON, typeMember }: { packageXMLTypeConfigJSON: any; typeMember: string; }) {

        let typeName = packageXMLTypeConfigJSON.typeName;
        let permissionSetElementJSONArray = packageXMLTypeConfigJSON.permissionSetsElementList;
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

    public filterPackageXmlTypes(packageXmlTypes: any, packageXMLTypesConfigArray: any, filterConfigNameJSONArray: any) {
        let permissionSetsXmlElement = '';
        for (const packageXmlType of packageXmlTypes) {

            const packageXmlTypesName = packageXmlType.name[0];

            if (packageXMLTypesConfigArray.includes(packageXmlTypesName) && filterConfigNameJSONArray.packageXMLTypeList.length > 0) {

                const indexOfType = packageXMLTypesConfigArray.indexOf(packageXmlTypesName);
                const packageXMLTypeConfigJSON = filterConfigNameJSONArray.packageXMLTypeList[indexOfType];
                const packageXmlMembers = packageXmlType.members;
                const permissionSetIncludedFilterArray = packageXMLTypeConfigJSON.includedFilterList || ['(.*)']; // Default is regex "all"
                const permissionSetExcludedFilterArray = packageXMLTypeConfigJSON.excludedFilterList || []; // Default is no exclusion

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
                            permissionSetsXmlElement += this.buildMultiplePermissionSetXML({ packageXMLTypeConfigJSON, typeMember: packageXmlMember });
                        }
                    }
                }
            }
        }

        return permissionSetsXmlElement;
    }
}
