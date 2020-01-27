import { Command, flags } from '@oclif/command';
import * as fs from 'fs';
import * as xml2js from 'xml2js';
import * as util from 'util';
import * as arrayCompare from 'array-compare';
import metadataUtils = require('../../common/metadata-utils');
import { assert } from 'console';

export default class ExecuteCheckProjectConsistency extends Command {
  public static description = '';

  public static examples = [];

  public static args = [];

  // @ts-ignore
  public static flags = {
    // flag with a value (-n, --name=VALUE)
    packageXmlList: flags.string({ char: 'p', description: 'List of package.xml files path' }),
    inputfolder: flags.string({ char: 'i', description: 'SFDX Project folder (default: "." )' }),
    ignoreDuplicateTypes: flags.string({ char: 'd', default: '', description: 'List of types to ignore while checking for duplicates in package.xml files' }),
    failIfError: flags.boolean({ char: 'f', default: false, description: 'Script failing if errors are founds' }) as unknown as flags.IOptionFlag<boolean>,
    chatty: flags.boolean({ char: 'c', default: false, description: 'Chatty logs' }) as unknown as flags.IOptionFlag<boolean>,
    jsonLogging: flags.boolean({ char: 'j', default: false, description: 'JSON logs' }) as unknown as flags.IOptionFlag<boolean>
  };

  // Input params properties
  public packageXmlFileList: string[];
  public inputFolder: string;
  public outputFolder: string;
  public ignoreDuplicateTypes: string[];

  // Internal properties

  public allPackageXmlFilesTypes = {};
  public allSfdxFilesTypes = {};

  public jsonLogs = false;
  public chattyLogs = false;
  public failIfError = false;

  public sobjectCollectedInfo = {};
  public translatedLanguageList = [];
  public summaryResult = { metadataTypes: {}, objects: [], objectsTranslations: [] };
  public cmdLog = { compareResult: {}, scriptSuccess: false };

  // Runtime methods
  public async run() {
    // tslint:disable-next-line:no-shadowed-variable
    const { args, flags } = this.parse(ExecuteCheckProjectConsistency);

    // Get input arguments or default values
    this.packageXmlFileList = flags.packageXmlList.split(',');
    this.ignoreDuplicateTypes = flags.ignoreDuplicateTypes.split(',');
    this.inputFolder = flags.inputfolder || '.';
    this.jsonLogs = flags.jsonLogging || false;
    this.chattyLogs = flags.chatty || false;
    this.failIfError = flags.failIfError || false;

    this.log(`Initialize consistency check of SFDX project ${this.inputFolder} ,using ${flags.packageXmlList}`);

    // gather elements defined in package.xml files
    this.log(`\n\nAppending ${flags.packageXmlList} ...\n`);
    await this.appendPackageXmlFilesContent();

    // gather elements defined in SFDX project
    this.log(`\n\nBrowsing ${flags.packageXmlList} ...\n`);
    this.listSfdxProjectItems();

    // compare append of packageXmls and sfdx content
    this.log(`\n\nComparing ${flags.packageXmlList} ...\n`);
    this.compareResults();

    if (this.jsonLogs) {
      console.log(JSON.stringify(this.cmdLog));
    } else {
      console.table(this.cmdLog.compareResult, ['md_type', 'status', 'identical_nb', 'in_sfdx_but_not_in_pckg_xml_nb', 'in_pckg_xml_but_not_in_sfdx_nb']);
    }

    if (this.failIfError && this.cmdLog.scriptSuccess === false) {
      throw Error('SFDX Project consistency contains errors. Check logs for details');
    }

  }
  // Read package.xml files and build concatenated list of items
  public async appendPackageXmlFilesContent() {

    const doublingItems = [];
    // loop on packageXml files
    for (const packageXmlFile of this.packageXmlFileList) {
      const parser = new xml2js.Parser();
      // read file content
      const data = fs.readFileSync(packageXmlFile);
      // parse xml content
      const result: any = await parser.parseStringPromise(data);
      if (this.chattyLogs) {
        console.log(`Parsed ${packageXmlFile} :\n` + util.inspect(result, false, null));
      }
      let packageXmlMetadatasTypeLs: any[];
      // get metadata types in parse result
      try { packageXmlMetadatasTypeLs = result.Package.types; } catch { throw new Error('Unable to parse package Xml file ' + packageXmlFile); }

      // Add metadata members in concatenation list of items & store doublings
      for (const typePkg of packageXmlMetadatasTypeLs) {
        const nameKey = typePkg.name[0];
        if (this.allPackageXmlFilesTypes[nameKey] != null && typePkg.members != null) {
          const compareRes = arrayCompare(typePkg.members, this.allPackageXmlFilesTypes[nameKey]);
          if (compareRes.found.length > 0) {
            if (!this.ignoreDuplicateTypes.includes(nameKey)) {
              doublingItems.push(compareRes.found);
              console.warn(`ERROR: ${nameKey} items are existing in several package.xml files:` + JSON.stringify(compareRes.found, null, 2));
            } else {
              console.warn(`WARNING: ${nameKey} items are existing in several package.xml files:` + JSON.stringify(compareRes.found, null, 2));
            }
          }
          this.allPackageXmlFilesTypes[nameKey] = Array.from(new Set(this.allPackageXmlFilesTypes[nameKey].concat(typePkg.members)));
        } else if (typePkg.members != null) {
          this.allPackageXmlFilesTypes[nameKey] = Array.from(new Set(typePkg.members));
        }
      }
    }
    // Check doubling items if failIfError = true
    if (this.failIfError === true && doublingItems.length > 0) {
      throw Error('There are doubling items in package.xml files, please make them unique');
    }

    // Sort result & display in logs if requested
    this.allPackageXmlFilesTypes = this.sortObject(this.allPackageXmlFilesTypes);
    if (this.chattyLogs) {
      console.log('Package.xml files concatenation results :\n' + util.inspect(this.allPackageXmlFilesTypes, false, null));
    }

  }

  // List all SFDX project items
  public listSfdxProjectItems() {

    // List sub folders
    console.log('Analyzing SFDX project ...');
    const { readdirSync, statSync } = require('fs');
    const { join } = require('path');
    const listFoldersFunc = (p) => readdirSync(p).filter((f) => statSync(join(p, f)).isDirectory());
    const sfdxProjectFolders = listFoldersFunc(this.inputFolder);
    console.log('SFDX Project subFolders :' + sfdxProjectFolders.join(','));

    // collect elements and build allSfdxFilesTypes
    sfdxProjectFolders.forEach((folder) => {
      const sfdxTypeDesc = this.getSfdxTypeDescription(folder);
      if (sfdxTypeDesc == null) {
        if (folder !== 'objects') {
          console.warn('WARNING: Skipped ' + folder + ' (no description found)');
        }
        return;
      }
      // list items in folder
      const itemList = [];

      const folderFiles = readdirSync(this.inputFolder + '/' + folder);

      for (const element of folderFiles) {
        // Build item name
        const fpath = element.replace(/\\/g, '/');
        let fileName = fpath.substring(fpath.lastIndexOf('/') + 1);
        if (sfdxTypeDesc.sfdxNameSuffixList) {
          for (const suffix of sfdxTypeDesc.sfdxNameSuffixList) {
            if (suffix !== '') {
              fileName = fileName.replace(suffix, '');
            }
          }
        }

        // add item name if not already in the list
        if (!(itemList.indexOf(fileName) > -1) && !fileName.endsWith('-meta') && !fileName.startsWith('.')) {
          itemList.push(fileName);
        }

        // Manage case of sfdx sub-directory metadata types (must be declared as metasInSubFolders = true in metadata-utils)
        if (sfdxTypeDesc.metasInSubFolders === true && fs.lstatSync(this.inputFolder + '/' + folder + '/' + element).isDirectory()) {
          const fpathSub = this.inputFolder + '/' + folder + '/' + element.replace(/\\/g, '/');

          // Browse files of sub folder
          const folderFilesSub = readdirSync(fpathSub);

          for (const elementSub of folderFilesSub) {
            const fileSub = this.inputFolder + '/' + folder + '/' + element.replace(/\\/g, '/') + '/' + elementSub.replace(/\\/g, '/');
            let fileNameSub = fileSub.substring(fileSub.lastIndexOf('/') + 1);
            if (sfdxTypeDesc.sfdxNameSuffixList) {
              for (const suffix of sfdxTypeDesc.sfdxNameSuffixList) {
                if (suffix !== '') {
                  fileNameSub = fileNameSub.replace(suffix, '');
                }
              }
            }
            fileNameSub = element + '/' + fileNameSub;
            // add sub item name if not already in the list
            if (!(itemList.indexOf(fileNameSub) > -1) && !fileNameSub.endsWith('-meta') && !fileNameSub.startsWith('.')) {
              itemList.push(fileNameSub);
            }
          }
        }

      }

      // Add items in allSfdxFilesTypes
      const nameKey = sfdxTypeDesc.metadataType;
      this.allSfdxFilesTypes[nameKey] = itemList;

    });

    // Special case of objects folder
    const sfdxObjectFolders = listFoldersFunc(this.inputFolder + '/objects');
    sfdxObjectFolders.forEach((objectFolder) => {
      if (this.chattyLogs) {
        console.log('Browsing object folder ' + objectFolder + ' ...');
      }
      // If custom, add in CustomObject
      if (objectFolder.endsWith('__c') || objectFolder.endsWith('__mdt')) {
        if (this.allSfdxFilesTypes['CustomObject'] == null) {
          this.allSfdxFilesTypes['CustomObject'] = [objectFolder];
        } else {
          this.allSfdxFilesTypes['CustomObject'] = this.allSfdxFilesTypes['CustomObject'].concat([objectFolder]);
        }
      }
      // Manage object sub-attributes
      const sfdxObjectSubFolders = listFoldersFunc(this.inputFolder + '/objects/' + objectFolder);
      sfdxObjectSubFolders.forEach((sfdxObjectSubFolder) => {
        if (this.chattyLogs) {
          console.log('  Browsing object subfolder ' + sfdxObjectSubFolder + ' ...');
        }
        // Get SubFolder description
        const objectPropertyDesc = this.getSfdxObjectPropertyDescription(sfdxObjectSubFolder);
        if (objectPropertyDesc == null) {
          if (this.chattyLogs) {
            console.log('Skipped ' + objectFolder + '/' + sfdxObjectSubFolder + ' (no description found)');
          }
          return;
        }

        // list items in folder
        const subItemList = [];

        const subfolderFiles = readdirSync(this.inputFolder + '/objects/' + objectFolder + '/' + sfdxObjectSubFolder);
        subfolderFiles.forEach((element) => {
          // Build item name
          const fpath = element.replace(/\\/g, '/');
          let fileName = fpath.substring(fpath.lastIndexOf('/') + 1);
          for (const suffix of objectPropertyDesc.sfdxNameSuffixList) {
            if (suffix !== '') {
              fileName = fileName.replace(suffix, '');
            }
          }
          // add sub item name if not already in the list
          const fullSubItemName = objectFolder + '.' + fileName;
          if (!(subItemList.indexOf(fullSubItemName) > -1) && !fullSubItemName.endsWith('-meta') && !fullSubItemName.startsWith('.')) {
            subItemList.push(fullSubItemName);
          }
        });

        // Add items in allSfdxFilesTypes
        const nameKey = objectPropertyDesc.packageXmlPropName;
        if (this.allSfdxFilesTypes[nameKey] == null) {
          this.allSfdxFilesTypes[nameKey] = subItemList;
        } else {
          this.allSfdxFilesTypes[nameKey] = this.allSfdxFilesTypes[nameKey].concat(subItemList);
        }

      });

    });
    this.allSfdxFilesTypes = this.sortObject(this.allSfdxFilesTypes);
    if (this.chattyLogs) {
      console.log('SFDX Project browsing results :\n' + util.inspect(this.allSfdxFilesTypes, false, null));
    }
  }

  // get Metadatype description
  public getSfdxTypeDescription(sfdxTypeFolder: any) {
    // @ts-ignore
    const descAll = metadataUtils.describeMetadataTypes();
    let typeDesc = null;
    for (const key in descAll) {
      if (descAll[key].folder === sfdxTypeFolder) {
        descAll[key].metadataType = key;
        typeDesc = descAll[key];
        if (typeDesc.sfdxNameSuffixList) {
          typeDesc.sfdxNameSuffixList = typeDesc.sfdxNameSuffixList.sort((a, b) => {
            return b.length - a.length || // sort by length, if equal then
              b.localeCompare(a);    // sort by dictionary order
          });
        }
      }
    }
    return typeDesc;
  }

  // get Metadatype description
  public getSfdxObjectPropertyDescription(sfdxObjectPropertyFolder) {
    // @ts-ignore
    const descAllObjectProperties = metadataUtils.describeObjectProperties();
    let objectPropDesc = null;
    descAllObjectProperties.forEach((element) => {
      if (element.objectXmlPropName === sfdxObjectPropertyFolder || element.sfdxFolderName === sfdxObjectPropertyFolder) {
        objectPropDesc = element;
      }
    });
    return objectPropDesc;
  }

  // Sort object for debug ( yeah yeah I know objects are not sortable , blah blah blah ^^ )
  public sortObject(o) {
    return Object.keys(o).sort().reduce((r, k) => (r[k] = o[k], r), {});
  }

  public getListObjValues(listObj) {
    const res = [];
    listObj.forEach((element) => {
      res.push(Object.values(element)[0]);
    });
    return res;
  }

  // Compare results
  public compareResults() {
    const allTypesLog = [];
    let scriptSuccess = true;
    // tslint:disable-next-line:forin
    for (const mdType in this.allSfdxFilesTypes) {
      let logItem = mdType + ':';
      const typeLog = {
        md_type: mdType,
        status: 'success',
        identical_nb: 0,
        in_sfdx_but_not_in_pckg_xml: [],
        in_sfdx_but_not_in_pckg_xml_nb: 0,
        in_pckg_xml_but_not_in_sfdx: [],
        in_pckg_xml_but_not_in_sfdx_nb: 0,
        comment: ''
      };
      const sfdxProjectTypeItems = this.allSfdxFilesTypes[mdType] || [];
      const packageXmlTypeItems: any[] = this.allPackageXmlFilesTypes[mdType] || [];

      const compareResult = arrayCompare(sfdxProjectTypeItems, packageXmlTypeItems);
      const compareResultDisp = JSON.parse(JSON.stringify(compareResult));

      if (packageXmlTypeItems.includes('*')) {
        typeLog.identical_nb = sfdxProjectTypeItems.length;
        typeLog.in_sfdx_but_not_in_pckg_xml_nb = null;
        typeLog.in_pckg_xml_but_not_in_sfdx_nb = null;

        if (this.chattyLogs) {
          logItem += '\n  - wildcard (*) used in packageXmls, comparison is not necessary';
        }
      } else {
        typeLog.identical_nb = compareResultDisp['found'].length;
        if (this.chattyLogs) {
          logItem += '\n  - ' + typeLog.identical_nb + ' identical item(s)';
        }
        if (compareResultDisp['missing'].length > 0) {
          typeLog.in_sfdx_but_not_in_pckg_xml = this.getListObjValues(compareResultDisp['missing']);
          typeLog.in_sfdx_but_not_in_pckg_xml_nb = typeLog.in_sfdx_but_not_in_pckg_xml.length;
          logItem += '\n  - ' + typeLog.in_sfdx_but_not_in_pckg_xml_nb + ' items in SFDX project but not in packageXmls : \n    - ' + typeLog.in_sfdx_but_not_in_pckg_xml;
          typeLog.status = 'warning';
          scriptSuccess = false;
        }
        if (compareResultDisp['added'].length > 0) {
          typeLog.in_pckg_xml_but_not_in_sfdx = this.getListObjValues(compareResultDisp['added']);
          typeLog.in_pckg_xml_but_not_in_sfdx_nb = typeLog.in_pckg_xml_but_not_in_sfdx.length;
          logItem += '\n  - ' + typeLog.in_pckg_xml_but_not_in_sfdx_nb + ' items in packageXmls but not in SFDX project : \n    - ' + typeLog.in_pckg_xml_but_not_in_sfdx;
          typeLog.status = 'error';
          scriptSuccess = false;
        }
      }
      allTypesLog.push(typeLog);
      console.log(logItem + '\n');
    }
    this.cmdLog.compareResult = allTypesLog;
    this.cmdLog.scriptSuccess = scriptSuccess;
  }

}
