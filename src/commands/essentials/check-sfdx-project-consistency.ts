import { Command, flags } from '@oclif/command'
import { FILE } from 'dns';
import { describeMetadataTypes, describeObjectFilteringProperties } from '../../common/metadata_utils';

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
  allPackageXmlFilesTypes = {}
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
    console.log('Analyzing SFDX project ...')
    const { readdirSync, statSync } = require('fs')
    const { join } = require('path')
    const listFoldersFunc = p => readdirSync(p).filter(f => statSync(join(p, f)).isDirectory())
    var sfdxProjectFolders = listFoldersFunc(this.inputFolder)
    console.log('SFDX Project subFolders :\n'+sfdxProjectFolders)

  }

  

}