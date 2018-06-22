import { Command, flags } from '@oclif/command'
import { FILE } from 'dns';

export default class ExecuteFilter extends Command {
  static description = ``

  static examples = []

  static flags = {
    folder: flags.string({ char: 'f', description: 'SFDX project folder containing files' })
    // flag with a value (-n, --name=VALUE)
  }

  static args = []
  // global variables
  reservedAttributeNames = {}
  folder = '.'

  // Internal properties
  fs = require('fs')
  //fse = require('fs-extra')
  //xml2js = require('xml2js')
  glob = require('glob')
  cint = require('cint')
  camelCase = require('camelcase');

  // Runtime methods
  async run() {

    // args
    const { args, flags } = this.parse(ExecuteFilter)

    this.folder = flags.folder || '.'

    // Add list of custom class names in reserved variables
    var fetchClassesExpression = this.folder + '/classes/*.cls'
    console.log('Fetching classes with expression : ' + fetchClassesExpression)
    var customApexClassFileNameList = this.glob.sync(fetchClassesExpression)
    var customApexClassList = []
    customApexClassFileNameList.forEach(customApexClassFileName => {
      customApexClassList.push(this.cint.after(customApexClassFileName, '/classes/').replace('.cls', ''))
    })
    console.log('Custom apex class names :' + JSON.stringify(customApexClassList))
    Object.keys(customApexClassList).forEach(customApexClass => {
      this.reservedAttributeNames[customApexClass] = { type: 'apexClass' }
    })

    // Build replacement names for each reserved attribute name
    var self = this
    Object.keys(this.reservedAttributeNames).forEach(reservedAttributeName => {
      var reservedAttributeNameReplacement = this.camelCase(reservedAttributeName)
      self.reservedAttributeNames[reservedAttributeName].replacement = reservedAttributeNameReplacement
    })

    // Process replacements
    var fetchCmpExpression = this.folder + '/aura/*'
    console.log('Fetching components with expression : ' + fetchCmpExpression)
    var customComponentFolderList = this.glob.sync(fetchCmpExpression)
    console.log('Component files: ' + JSON.stringify(customComponentFolderList))
    customComponentFolderList.forEach(customComponentFolder => {
      self.processComponentXml(customComponentFolder).then(function() {

      }).then(function() {
        this.processComponentController(customComponentFolder)
      } ).then(function() {
        this.processComponentHelper(customComponentFolder)
      })
    })

  }

  // Process component file
  processComponentXml(customComponentFolder) {
    var self = this
    return new Promise(function (resolve, reject) {
      // Define file name ( can be .cmp ,.app or .evt )
      var tokenLs = customComponentFolder.split('/')
      var filePath = customComponentFolder + '/' + tokenLs[tokenLs.length - 1] + '.cmp'
      if (!self.fs.existsSync(filePath))
        filePath = customComponentFolder + '/' + tokenLs[tokenLs.length - 1] + '.app'
      if (!self.fs.existsSync(filePath)) {
        filePath = customComponentFolder + '/' + tokenLs[tokenLs.length - 1] + '.evt'
      }
      if (!self.fs.existsSync(filePath)) {
        console.warn('Warning: aura folder not taken in account: ' + customComponentFolder)
      }

      // Read file
      var lineReader = require('readline').createInterface({
        input: self.fs.createReadStream(filePath)
      });
      console.log(JSON.stringify(lineReader, null, 2))
      var updatedFileContent = ''
      var updated = false
      lineReader.on('line', function (xmlLine) {
        var newLine = self.replaceAttributeNames(xmlLine.substr(0)) // (clone xmlLine object to be able to compare later)
        updatedFileContent += newLine
        console.log('Before: ' + xmlLine)
        console.log('After : ' + newLine)
        if (updated === false && newLine !== xmlLine)
          updated = true
      });
      lineReader.on('end',function () {
        // Close file reader
        lineReader.close()
        // Update file if it has been modified   
        if (updated) {
          self.fs.writeFileSync(filePath, updatedFileContent)
          console.log('Updated ' + filePath + ' with content :\n' + updatedFileContent)
          resolve() // Resolve promise so then is called
        }
      })
    })
  }

  replaceAttributeNames(xmlLine) {
    Object.keys(this.reservedAttributeNames).forEach(reservedAttributeName => {
      // Attribute name
      xmlLine = xmlLine.replace(`name="${reservedAttributeName}"`, `name="${this.reservedAttributeNames[reservedAttributeName].replacement}"`)
      xmlLine = xmlLine.replace(`name= "${reservedAttributeName}"`, `name="${this.reservedAttributeNames[reservedAttributeName].replacement}"`)
      xmlLine = xmlLine.replace(`name ="${reservedAttributeName}"`, `name="${this.reservedAttributeNames[reservedAttributeName].replacement}"`)
      xmlLine = xmlLine.replace(`name = "${reservedAttributeName}"`, `name="${this.reservedAttributeNames[reservedAttributeName].replacement}"`)
    })
    return xmlLine
  }

  processComponentController(xmlLine) {
    return new Promise(function (resolve, reject) {
      resolve()
    })
  }
  processComponentHelper(xmlLine) {
    return new Promise(function (resolve, reject) {
      resolve()
    })    
  }

}

