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
    this.appendPackageXmlFilesContent()

    // gather elements defined in SFDX project
    this.listSfdxProjectItems()

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

}