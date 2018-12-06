import { Command, flags } from '@oclif/command'
import { FILE } from 'dns';

export default class ExecuteFilter extends Command {
  static description = ``

  static examples = []

  static flags = {
    // flag with a value (-n, --name=VALUE)
    packageXmlList: flags.string({ char: 'p', description: 'List of package.xml files path' }),
    inputfolder: flags.string({ char: 'i', description: 'SFDX Project folder (default: "." )' })
  }

  static args = []

  // Input params properties
  packageXmlFileList
  inputFolder
  outputFolder

  // Internal properties
  fs = require('fs')
  fse = require('fs-extra')
  xml2js = require('xml2js')
  util = require('util')
  path = require('path')
  arrayCompare = require('array-compare')
  MetadataUtils = require('../../common/metadata-utils');
  allPackageXmlFilesTypes = {}
  allSfdxFilesTypes = {}

  sobjectCollectedInfo = {}
  translatedLanguageList = []
  summaryResult = { metadataTypes: {}, objects: [], objectsTranslations: [] }

  // Runtime methods
  async run() {

    const { args, flags } = this.parse(ExecuteFilter)

    // Get input arguments or default values
    this.packageXmlFileList = flags.packageXmlList.split(',')
    this.inputFolder = flags.inputfolder || '.'
    this.log(`Initialize consistency check of SFDX project ${this.inputFolder} ,using ${flags.packageXmlList}`)

    // gather elements defined in package.xml files
    this.log(`\n\nAppending ${flags.packageXmlList} ...\n`)
    this.appendPackageXmlFilesContent()

    // gather elements defined in SFDX project
    this.log(`\n\nBrowsing ${flags.packageXmlList} ...\n`)
    this.listSfdxProjectItems()

    // compare append of packageXmls and sfdx content
    this.log(`\n\nComparing ${flags.packageXmlList} ...\n`)
    this.compareResults()

  }
  // Read package.xml files and build concatenated list of items
  appendPackageXmlFilesContent() {
    var self = this
    // loop on packageXml files
    this.packageXmlFileList.forEach(function (packageXmlFile) {
      var parser = new self.xml2js.Parser();
      // read file content
      var data = self.fs.readFileSync(packageXmlFile)
      // parse xml content
      parser.parseString(data, function (err2, result) {
        console.log(`Parsed ${packageXmlFile} :\n` + self.util.inspect(result, false, null))
        var packageXmlMetadatasTypeLs
        // get metadata types in parse result
        try { packageXmlMetadatasTypeLs = result.Package.types }
        catch { throw 'Unable to parse package Xml file ' + packageXmlFile }
        // Add metadata members in concatenation list of items
        packageXmlMetadatasTypeLs.forEach(function (typePkg) {
          var nameKey = typePkg.name[0]
          if (self.allPackageXmlFilesTypes[nameKey] != null && typePkg.members != null) {
            self.allPackageXmlFilesTypes[nameKey] = self.allPackageXmlFilesTypes[nameKey].concat(typePkg.members)
          }
          else if (typePkg.members != null) {
            self.allPackageXmlFilesTypes[nameKey] = typePkg.members
          }
        })
      });
    })
    this.allPackageXmlFilesTypes = self.sortObject(this.allPackageXmlFilesTypes)
    console.log(`Package.xml files concatenation results :\n` + self.util.inspect(this.allPackageXmlFilesTypes, false, null))
  }

  // List all SFDX project items
  listSfdxProjectItems() {
    var self = this

    // List sub folders
    console.log('Analyzing SFDX project ...')
    const { readdirSync, statSync } = require('fs')
    const { join } = require('path')
    const listFoldersFunc = p => readdirSync(p).filter(f => statSync(join(p, f)).isDirectory())
    var sfdxProjectFolders = listFoldersFunc(this.inputFolder)
    console.log('SFDX Project subFolders :\n' + sfdxProjectFolders.join('\n'))

    // collect elements and build allSfdxFilesTypes
    sfdxProjectFolders.forEach(folder => {
        var sfdxTypeDesc = self.getSfdxTypeDescription(folder)
        if (sfdxTypeDesc == null) {
          console.log('Skipped '+folder+' (no description found)')
          return
        }
        // list items in folder
        var itemList = []

        var folderFiles = readdirSync(this.inputFolder+'/'+folder)
        folderFiles.forEach(element => {
          // Build item name
          var fpath = element.replace(/\\/g, '/');
          var fileName = fpath.substring(fpath.lastIndexOf('/')+1);
          sfdxTypeDesc.sfdxNameSuffixList.forEach(suffix => {
            if (suffix !== '')
              fileName = fileName.replace(suffix,'')
          }); 
          // add item name if not already in the list
          if (!(itemList.indexOf(fileName) > -1) && !fileName.endsWith('-meta') )
            itemList.push(fileName)
        });

        // Add items in allSfdxFilesTypes
        var nameKey = sfdxTypeDesc.metadataType
        self.allSfdxFilesTypes[nameKey] = itemList

    });

    // Special case of objects folder
    var sfdxObjectFolders = listFoldersFunc(this.inputFolder+'/objects')
    sfdxObjectFolders.forEach(objectFolder => {
        console.log('Browsing object folder '+objectFolder+' ...')
        // If custom, add in CustomObject
        if (objectFolder.endsWith('__c') || objectFolder.endsWith('__mdt')) {
          if (self.allSfdxFilesTypes['CustomObject'] == null)
            self.allSfdxFilesTypes['CustomObject'] = [objectFolder]
          else 
            self.allSfdxFilesTypes['CustomObject'] = self.allSfdxFilesTypes['CustomObject'].concat([objectFolder])
        }
        // Manage object sub-attributes
        var sfdxObjectSubFolders = listFoldersFunc(this.inputFolder+'/objects/'+objectFolder)
        sfdxObjectSubFolders.forEach(sfdxObjectSubFolder => {
            console.log('  Browsing object subfolder '+sfdxObjectSubFolder+' ...')
            // Get SubFolder description
            var objectPropertyDesc = self.getSfdxObjectPropertyDescription(sfdxObjectSubFolder)
            if (objectPropertyDesc == null) {
              console.log('Skipped '+objectFolder+'/'+sfdxObjectSubFolder+' (no description found)')
              return
            }     

            // list items in folder
            var subItemList = []

            var subfolderFiles = readdirSync(this.inputFolder+'/objects/'+objectFolder+'/'+sfdxObjectSubFolder)
            subfolderFiles.forEach(element => {
              // Build item name
              var fpath = element.replace(/\\/g, '/');
              var fileName = fpath.substring(fpath.lastIndexOf('/')+1);
              objectPropertyDesc.sfdxNameSuffixList.forEach(suffix => {
                if (suffix !== '')
                  fileName = fileName.replace(suffix,'')
              }); 
              // add sub item name if not already in the list
              var fullSubItemName = objectFolder+'.'+fileName
              if (!(subItemList.indexOf(fullSubItemName) > -1) && !fullSubItemName.endsWith('-meta') )
                  subItemList.push(fullSubItemName)
            }); 
            
            // Add items in allSfdxFilesTypes
            var nameKey = objectPropertyDesc.packageXmlPropName
            if (self.allSfdxFilesTypes[nameKey] == null)
                self.allSfdxFilesTypes[nameKey] = subItemList    
            else 
                self.allSfdxFilesTypes[nameKey] = self.allSfdxFilesTypes[nameKey].concat(subItemList)

        })


    })
    this.allSfdxFilesTypes = self.sortObject(this.allSfdxFilesTypes)
    console.log(`SFDX Project browsing results :\n` + self.util.inspect(this.allSfdxFilesTypes, false, null))
  }

  // get Metadatype description
  getSfdxTypeDescription(sfdxTypeFolder) {
    var descAll = this.MetadataUtils.describeMetadataTypes()
    var typeDesc = null
    for (var key in descAll) {
      if (descAll[key].folder === sfdxTypeFolder) {
        descAll[key].metadataType = key
        typeDesc = descAll[key]
      }    
    };
    return typeDesc
  }

  // get Metadatype description
  getSfdxObjectPropertyDescription(sfdxObjectPropertyFolder) {
    var descAllObjectProperties = this.MetadataUtils.describeObjectProperties()
    var objectPropDesc = null
    descAllObjectProperties.forEach(element => {
      if (element.objectXmlPropName === sfdxObjectPropertyFolder || element.sfdxFolderName === sfdxObjectPropertyFolder) {
         objectPropDesc = element
      }          
    });
    return objectPropDesc
  }

  // Sort object for debug ( yeah yeah I know objects are not sortable , blah blah blah ^^ )
  sortObject(o) {
    return Object.keys(o).sort().reduce((r, k) => (r[k] = o[k], r), {});
  }

  getListObjValues(listObj) {
    var res = []
    listObj.forEach(element => {
      res.push(Object.values(element))
    });
    return res
  }

  // Compare results
  compareResults() {
    console.log('a is SFDX project content, b is packageXml content')
    for (var mdType in this.allSfdxFilesTypes) {
      console.log('\n' + mdType + ':')
      var sfdxProjectTypeItems = this.allSfdxFilesTypes[mdType] || []
      var packageXmlTypeItems = this.allPackageXmlFilesTypes[mdType] || []
          
      var compareResult = this.arrayCompare(sfdxProjectTypeItems, packageXmlTypeItems)
      var compareResultDisp = JSON.parse(JSON.stringify(compareResult))

      if (packageXmlTypeItems.length === 1 && packageXmlTypeItems[0] === '*')
        console.log('  - wildcard (*) used in packageXmls, comparison is not necessary')
      else {
        console.log('  - ' + compareResultDisp['found'].length + ' identical item(s)')
        if (compareResultDisp['missing'].length > 0 )
          console.log('  - '+compareResultDisp['missing'].length+ ' items in SFDX project but not in packageXmls : \n    - '+this.getListObjValues(compareResultDisp['missing']))
        if (compareResultDisp['added'].length > 0)
          console.log('  - '+compareResultDisp['added'].length+ ' items in packageXmls but not in SFDX project : \n    - '+this.getListObjValues(compareResultDisp['added']))
      }
    }
  }

}