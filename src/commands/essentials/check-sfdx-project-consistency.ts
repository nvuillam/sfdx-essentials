import { Command, flags } from '@oclif/command';
import { FILE } from 'dns';

export default class ExecuteCheckProjectConsistency extends Command {
  public static description = '';

  public static examples = [];

  public static args = [];

  // @ts-ignore
  public static flags = {
    // flag with a value (-n, --name=VALUE)
    packageXmlList: flags.string({ char: 'p', description: 'List of package.xml files path' }),
    inputfolder: flags.string({ char: 'i', description: 'SFDX Project folder (default: "." )' }),
    chatty: flags.boolean({ char: 'c', description: 'Chatty logs' }) as unknown as flags.IOptionFlag<boolean>,
    jsonLogging: flags.boolean({ char: 'j', description: 'JSON logs' }) as unknown as flags.IOptionFlag<boolean>
  };

  // Input params properties
  public packageXmlFileList;
  public inputFolder;
  public outputFolder;

  // Internal properties
  public fs = require('fs');
  public fse = require('fs-extra');
  public xml2js = require('xml2js');
  public util = require('util');
  public path = require('path');
  public arrayCompare = require('array-compare');
  public metadataUtils = require('../../common/metadata-utils');
  public allPackageXmlFilesTypes = {};
  public allSfdxFilesTypes = {};

  public jsonLogs = false;
  public chattyLogs = false;
  public sobjectCollectedInfo = {};
  public translatedLanguageList = [];
  public summaryResult = { metadataTypes: {}, objects: [], objectsTranslations: [] };
  public cmdLog = { compareResult: {} };

  // Runtime methods
  public async run() {
    // tslint:disable-next-line:no-shadowed-variable
    const { args, flags } = this.parse(ExecuteCheckProjectConsistency);

    // Get input arguments or default values
    this.packageXmlFileList = flags.packageXmlList.split(',');
    this.inputFolder = flags.inputfolder || '.';
    this.jsonLogs = flags.jsonLogging || false;
    this.chattyLogs = flags.chatty || false;
    if (this.jsonLogs === false && this.chattyLogs === false) {
      this.chattyLogs = true;
    }
    this.log(`Initialize consistency check of SFDX project ${this.inputFolder} ,using ${flags.packageXmlList}`);

    // gather elements defined in package.xml files
    this.log(`\n\nAppending ${flags.packageXmlList} ...\n`);
    this.appendPackageXmlFilesContent();

    // gather elements defined in SFDX project
    this.log(`\n\nBrowsing ${flags.packageXmlList} ...\n`);
    this.listSfdxProjectItems();

    // compare append of packageXmls and sfdx content
    this.log(`\n\nComparing ${flags.packageXmlList} ...\n`);
    this.compareResults();

    if (this.jsonLogs) {
      console.log(JSON.stringify(this.cmdLog));
    }

  }
  // Read package.xml files and build concatenated list of items
  public appendPackageXmlFilesContent() {
    const self = this;
    // loop on packageXml files
    this.packageXmlFileList.forEach(function (packageXmlFile) {
      const parser = new self.xml2js.Parser();
      // read file content
      const data = self.fs.readFileSync(packageXmlFile);
      // parse xml content
      parser.parseString(data, function (err2, result) {
        if (self.chattyLogs) {
          console.log(`Parsed ${packageXmlFile} :\n` + self.util.inspect(result, false, null));
        }
        let packageXmlMetadatasTypeLs;
        // get metadata types in parse result
        try { packageXmlMetadatasTypeLs = result.Package.types; } catch { throw new Error('Unable to parse package Xml file ' + packageXmlFile); }
        // Add metadata members in concatenation list of items
        packageXmlMetadatasTypeLs.forEach(function (typePkg) {
          const nameKey = typePkg.name[0];
          if (self.allPackageXmlFilesTypes[nameKey] != null && typePkg.members != null) {
            self.allPackageXmlFilesTypes[nameKey] = self.allPackageXmlFilesTypes[nameKey].concat(typePkg.members);
          } else if (typePkg.members != null) {
            self.allPackageXmlFilesTypes[nameKey] = typePkg.members;
          }
        });
      });
    });
    this.allPackageXmlFilesTypes = self.sortObject(this.allPackageXmlFilesTypes);
    if (self.chattyLogs) {
      console.log('Package.xml files concatenation results :\n' + self.util.inspect(this.allPackageXmlFilesTypes, false, null));
    }
  }

  // List all SFDX project items
  public listSfdxProjectItems() {
    const self = this;

    // List sub folders
    console.log('Analyzing SFDX project ...');
    const { readdirSync, statSync } = require('fs');
    const { join } = require('path');
    const listFoldersFunc = (p) => readdirSync(p).filter((f) => statSync(join(p, f)).isDirectory());
    const sfdxProjectFolders = listFoldersFunc(this.inputFolder);
    console.log('SFDX Project subFolders :' + sfdxProjectFolders.join(','));

    // collect elements and build allSfdxFilesTypes
    sfdxProjectFolders.forEach((folder) => {
      const sfdxTypeDesc = self.getSfdxTypeDescription(folder);
      if (sfdxTypeDesc == null) {
        console.log('Skipped ' + folder + ' (no description found)');
        return;
      }
      // list items in folder
      const itemList = [];

      const folderFiles = readdirSync(this.inputFolder + '/' + folder);
      folderFiles.forEach((element) => {
        // Build item name
        const fpath = element.replace(/\\/g, '/');
        let fileName = fpath.substring(fpath.lastIndexOf('/') + 1);
        sfdxTypeDesc.sfdxNameSuffixList.forEach((suffix) => {
          if (suffix !== '') {
            fileName = fileName.replace(suffix, '');
          }
        });
        // add item name if not already in the list
        if (!(itemList.indexOf(fileName) > -1) && !fileName.endsWith('-meta')) {
          itemList.push(fileName);
        }
      });

      // Add items in allSfdxFilesTypes
      const nameKey = sfdxTypeDesc.metadataType;
      self.allSfdxFilesTypes[nameKey] = itemList;

    });

    // Special case of objects folder
    const sfdxObjectFolders = listFoldersFunc(this.inputFolder + '/objects');
    sfdxObjectFolders.forEach((objectFolder) => {
      if (self.chattyLogs) {
        console.log('Browsing object folder ' + objectFolder + ' ...');
      }
      // If custom, add in CustomObject
      if (objectFolder.endsWith('__c') || objectFolder.endsWith('__mdt')) {
        if (self.allSfdxFilesTypes['CustomObject'] == null) {
          self.allSfdxFilesTypes['CustomObject'] = [objectFolder];
        } else {
          self.allSfdxFilesTypes['CustomObject'] = self.allSfdxFilesTypes['CustomObject'].concat([objectFolder]);
        }
      }
      // Manage object sub-attributes
      const sfdxObjectSubFolders = listFoldersFunc(this.inputFolder + '/objects/' + objectFolder);
      sfdxObjectSubFolders.forEach((sfdxObjectSubFolder) => {
        if (self.chattyLogs) {
          console.log('  Browsing object subfolder ' + sfdxObjectSubFolder + ' ...');
        }
        // Get SubFolder description
        const objectPropertyDesc = self.getSfdxObjectPropertyDescription(sfdxObjectSubFolder);
        if (objectPropertyDesc == null) {
          if (self.chattyLogs) {
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
          objectPropertyDesc.sfdxNameSuffixList.forEach((suffix) => {
            if (suffix !== '') {
              fileName = fileName.replace(suffix, '');
            }
          });
          // add sub item name if not already in the list
          const fullSubItemName = objectFolder + '.' + fileName;
          if (!(subItemList.indexOf(fullSubItemName) > -1) && !fullSubItemName.endsWith('-meta')) {
            subItemList.push(fullSubItemName);
          }
        });

        // Add items in allSfdxFilesTypes
        const nameKey = objectPropertyDesc.packageXmlPropName;
        if (self.allSfdxFilesTypes[nameKey] == null) {
          self.allSfdxFilesTypes[nameKey] = subItemList;
        } else {
          self.allSfdxFilesTypes[nameKey] = self.allSfdxFilesTypes[nameKey].concat(subItemList);
        }

      });

    });
    this.allSfdxFilesTypes = self.sortObject(this.allSfdxFilesTypes);
    if (self.chattyLogs) {
      console.log('SFDX Project browsing results :\n' + self.util.inspect(this.allSfdxFilesTypes, false, null));
    }
  }

  // get Metadatype description
  public getSfdxTypeDescription(sfdxTypeFolder) {
    const descAll = this.metadataUtils.describeMetadataTypes();
    let typeDesc = null;
    for (const key in descAll) {
      if (descAll[key].folder === sfdxTypeFolder) {
        descAll[key].metadataType = key;
        typeDesc = descAll[key];
      }
    }
    return typeDesc;
  }

  // get Metadatype description
  public getSfdxObjectPropertyDescription(sfdxObjectPropertyFolder) {
    const descAllObjectProperties = this.metadataUtils.describeObjectProperties();
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
    // tslint:disable-next-line:forin
    for (const mdType in this.allSfdxFilesTypes) {
      if (this.chattyLogs) {
        console.log('\n' + mdType + ':');
      }
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
      const packageXmlTypeItems = this.allPackageXmlFilesTypes[mdType] || [];

      const compareResult = this.arrayCompare(sfdxProjectTypeItems, packageXmlTypeItems);
      const compareResultDisp = JSON.parse(JSON.stringify(compareResult));

      if (packageXmlTypeItems.length === 1 && packageXmlTypeItems[0] === '*') {
        if (this.chattyLogs) {
          console.log('  - wildcard (*) used in packageXmls, comparison is not necessary');
        }
      } else {
        typeLog.identical_nb = compareResultDisp['found'].length;
        if (this.chattyLogs) {
          console.log('  - ' + typeLog.identical_nb + ' identical item(s)');
        }
        if (compareResultDisp['missing'].length > 0) {
          typeLog.in_sfdx_but_not_in_pckg_xml = this.getListObjValues(compareResultDisp['missing']);
          typeLog.in_sfdx_but_not_in_pckg_xml_nb = typeLog.in_sfdx_but_not_in_pckg_xml.length;
          if (this.chattyLogs) {
            console.log('  - ' + typeLog.in_sfdx_but_not_in_pckg_xml_nb + ' items in SFDX project but not in packageXmls : \n    - ' + typeLog.in_sfdx_but_not_in_pckg_xml);
          }
          typeLog.status = 'warning';
        }
        if (compareResultDisp['added'].length > 0) {
          typeLog.in_pckg_xml_but_not_in_sfdx = this.getListObjValues(compareResultDisp['added']);
          typeLog.in_pckg_xml_but_not_in_sfdx_nb = typeLog.in_pckg_xml_but_not_in_sfdx.length;
          if (this.chattyLogs) {
            console.log('  - ' + typeLog.in_pckg_xml_but_not_in_sfdx_nb + ' items in packageXmls but not in SFDX project : \n    - ' + typeLog.in_pckg_xml_but_not_in_sfdx);
          }
          typeLog.status = 'error';
        }
      }
      allTypesLog.push(typeLog);
    }
    this.cmdLog.compareResult = allTypesLog;

  }

}
