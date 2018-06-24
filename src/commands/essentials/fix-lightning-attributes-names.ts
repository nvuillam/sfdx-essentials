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
  reservedAttributeNamesUsed = {}
  folder = '.'
  totalReplacements = 0



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
    console.log('Custom apex class names :' + JSON.stringify(customApexClassList, null, 2))
    customApexClassList.forEach(customApexClass => {
      this.reservedAttributeNames[customApexClass] = {
        type: 'apexClass',
        numberReplacements: 0,
        numberReplacementsCmp: 0,
        numberReplacementsJs: 0,
        numberReplacementsApex: 0
      }
    })

    // Add list of objects names in reserved variables
    var fetchObjectsExpression = this.folder + '/objects/*'
    console.log('Fetching objects with expression : ' + fetchObjectsExpression)
    var objectsFolderNameList = this.glob.sync(fetchObjectsExpression)
    var objectNameList = []
    objectsFolderNameList.forEach(objectFolderName => {
      objectNameList.push(this.cint.after(objectFolderName, '/objects/'))
    })
    console.log('objects names :' + JSON.stringify(objectNameList, null, 2))
    objectNameList.forEach(objectName => {
      this.reservedAttributeNames[objectName] = {
        type: 'object',
        numberReplacements: 0,
        numberReplacementsCmp: 0,
        numberReplacementsJs: 0,
        numberReplacementsApex: 0
      }
    })

    // Build replacement names for each reserved attribute name
    var self = this
    Object.keys(this.reservedAttributeNames).forEach(reservedAttributeName => {
      var reservedAttributeNameReplacement = this.camelCase(reservedAttributeName)
      self.reservedAttributeNames[reservedAttributeName].replacement = reservedAttributeNameReplacement
    })
    console.log('Attributes replacements :\n' + JSON.stringify(self.reservedAttributeNames, null, 2))

    ////////// Process replacements

    // Process replacements on components
    var fetchCmpExpression = this.folder + '/aura/*'
    console.log('Fetching components with expression : ' + fetchCmpExpression)
    var customComponentFolderList = this.glob.sync(fetchCmpExpression)
    console.log('Component files: ' + JSON.stringify(customComponentFolderList, null, 2))
    var replacementPromisesCmp = []
    customComponentFolderList.forEach(customComponentFolder => {
      replacementPromisesCmp.push(new Promise(function (resolve, reject) {
        // Get file name
        var tokenLs = customComponentFolder.split('/')
        var filePart = tokenLs[tokenLs.length - 1]
        // Replace in .cmp, .app & .evt files (send function as parameter)
        self.processFile(customComponentFolder, filePart, ['.cmp', '.app', '.evt'], self.replaceAttributeNamesInCmp).then(function () {
          // Replace in component controller (send function as parameter)
          return self.processFile(customComponentFolder, filePart, ['Controller.js'], self.replaceAttributeNamesInJs)
        }).then(function () {
          // Replace in component helper javascript (send function as parameter)
          return self.processFile(customComponentFolder, filePart, ['Helper.js'], self.replaceAttributeNamesInJs)
        }).then(function () {
          resolve()
        }).catch(function (err) {
          console.log('Replacement promise error: ' + err)
          resolve()
        })
      }))
    })

    Promise.all(replacementPromisesCmp).then(function () {
      // Process replacements on apex classes
      var replacementPromisesApex = []
      Object.keys(self.reservedAttributeNames).forEach(reservedAttributeName => {
        // Check if there has been replacements in lightning components
        if (self.reservedAttributeNames[reservedAttributeName].type === 'apexClass') {
          replacementPromisesApex.push(new Promise(function (resolve, reject) {
            // Replace in apex class files (.cls) (send function as parameter)
            self.processFile(self.folder + '/classes', reservedAttributeName, ['.cls'], self.replaceAttributeNamesInApex)
              .then(function () {
                resolve()
              }).catch(function (err) {
                console.log('Replacement promise error: ' + err)
                reject()
              })
          }))
        }
      })

      // Log summary
      Promise.all(replacementPromisesApex).then(function () {
        Object.keys(self.reservedAttributeNames).forEach(reservedAttributeName => {
          if (self.reservedAttributeNames[reservedAttributeName].numberReplacements > 0) {
            self.reservedAttributeNamesUsed[reservedAttributeName] = self.reservedAttributeNames[reservedAttributeName]
          }
        });
        console.log('Attributes replacements results :\n' + JSON.stringify(self.reservedAttributeNamesUsed, null, 2))
        console.log('Total replacements :' + self.totalReplacements)
      }).catch(function (err) {
        console.log('Promises error: ' + err)
      })
    })
  }

  // Process component file
  processFile(customComponentFolder, filePart, extensions, replaceFunction) {
    var self = this
    return new Promise(function (resolve, reject) {
      // Find file
      var filePath = null
      extensions.forEach(extension => {
        var filePathTest = customComponentFolder + '/' + filePart + extension
        if (filePath == null && self.fs.existsSync(filePathTest))
          filePath = filePathTest
      });
      if (filePath == null) {
        resolve()
        return
      }
      // Read file line by line & process them
      var updated = false
      var updatedFileContent = ''
      var readEachLineSync = require('read-each-line-sync');
      readEachLineSync(filePath, function (line) {
        var newLine = replaceFunction.call(self, line.substr(0), filePart) // (clone line var to be able to compare later)
        updatedFileContent += newLine + '\n'
        if (updated === false && newLine !== line)
          updated = true
      })
      if (updated) {
        self.fs.writeFileSync(filePath, updatedFileContent)
        console.log('Updated ' + filePath)//+ ' with content :\n' + updatedFileContent)
      }
      resolve() // Resolve promise so then is called
    })
  }

  // Replace attribute names in comonent ( xml )
  replaceAttributeNamesInCmp(xmlLine, _itemName) {
    var self = this
    Object.keys(this.reservedAttributeNames).forEach(reservedAttributeName => {
      // aura:attribute name
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `name="${reservedAttributeName}"`, `name="${self.reservedAttributeNames[reservedAttributeName].replacement}"`, 'cmp')
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `name= "${reservedAttributeName}"`, `name="${self.reservedAttributeNames[reservedAttributeName].replacement}"`, 'cmp')
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `name ="${reservedAttributeName}"`, `name="${self.reservedAttributeNames[reservedAttributeName].replacement}"`, 'cmp')
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `name = "${reservedAttributeName}"`, `name="${self.reservedAttributeNames[reservedAttributeName].replacement}"`, 'cmp')
      // calling attribute ( in another component )
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, ` ${reservedAttributeName}="`, ` ${self.reservedAttributeNames[reservedAttributeName].replacement}="`, 'cmp')
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, ` ${reservedAttributeName} ="`, ` ${self.reservedAttributeNames[reservedAttributeName].replacement}="`, 'cmp')
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, ` ${reservedAttributeName}= "`, ` ${self.reservedAttributeNames[reservedAttributeName].replacement}="`, 'cmp')
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, ` ${reservedAttributeName} = "`, ` ${self.reservedAttributeNames[reservedAttributeName].replacement}="`, 'cmp')
      // reference in aura expression
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `v.${reservedAttributeName}.`, `v.${self.reservedAttributeNames[reservedAttributeName].replacement}.`, 'cmp')
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `v.${reservedAttributeName}}`, `v.${self.reservedAttributeNames[reservedAttributeName].replacement}}`, 'cmp')
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `v.${reservedAttributeName} }`, `v.${self.reservedAttributeNames[reservedAttributeName].replacement}}`, 'cmp')
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `v.${reservedAttributeName}} `, `v.${self.reservedAttributeNames[reservedAttributeName].replacement}}`, 'cmp')
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `v.${reservedAttributeName} } `, `v.${self.reservedAttributeNames[reservedAttributeName].replacement}}`, 'cmp')
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `v.${reservedAttributeName})`, `v.${self.reservedAttributeNames[reservedAttributeName].replacement})`, 'cmp')
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `v.${reservedAttributeName} )`, `v.${self.reservedAttributeNames[reservedAttributeName].replacement})`, 'cmp')
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `v.${reservedAttributeName}) `, `v.${self.reservedAttributeNames[reservedAttributeName].replacement})`, 'cmp')
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `v.${reservedAttributeName} ) `, `v.${self.reservedAttributeNames[reservedAttributeName].replacement})`, 'cmp')

    })
    return xmlLine
  }


  // Replace attribute names in javascript file
  replaceAttributeNamesInJs(jsLine, _itemName) {
    var self = this
    Object.keys(this.reservedAttributeNames).forEach(reservedAttributeName => {
      // Attribute name
      jsLine = self.replaceExpression(jsLine, reservedAttributeName, `'v.${reservedAttributeName}'`, `'v.${self.reservedAttributeNames[reservedAttributeName].replacement}'`, 'js')
      jsLine = self.replaceExpression(jsLine, reservedAttributeName, `"v.${reservedAttributeName}"`, `"v.${self.reservedAttributeNames[reservedAttributeName].replacement}"`, 'js')
      jsLine = self.replaceExpression(jsLine, reservedAttributeName, `v.${reservedAttributeName}.`, `v.${self.reservedAttributeNames[reservedAttributeName].replacement}.`, 'js')
    })
    return jsLine
  }

  // Replace attribute names in javascript file
  replaceAttributeNamesInApex(apexLine, itemName) {
    var self = this
    Object.keys(this.reservedAttributeNames).forEach(reservedAttributeName => {
      if (!apexLine.includes(`getGlobalDescribe().get('${reservedAttributeName}'`) &&
        !apexLine.includes(`objectReference.get('${reservedAttributeName}'`)) {
        // Attribute name ( with ugly JSON.deserialize)
        if (itemName.endsWith('_m') || ['CaseTestQuoteContractRPINDMock','WsAiaContractParsing'].includes(itemName)) {
          // skip deserialize cleaning if we are in these cases: too dangerous ^^
        }
        else if (itemName.startsWith('Case')) {
          apexLine = self.replaceExpression(apexLine, reservedAttributeName, `JSON.deserialize(JSON.serialize(InputData.get('${reservedAttributeName}')),`, `RequestM.getCaseInputData('${self.reservedAttributeNames[reservedAttributeName].replacement}',`, 'apex') // Take advantage of this script to replace dirty code ^^
          apexLine = self.replaceExpression(apexLine, reservedAttributeName, `JSON.deserialize(UtilsApex.serializeObject(InputData.get('${reservedAttributeName}')),`, `RequestM.getCaseInputData('${self.reservedAttributeNames[reservedAttributeName].replacement}',`, 'apex') // Take advantage of this script to replace dirty code ^^
        }
        else {
          apexLine = self.replaceExpression(apexLine, reservedAttributeName, `JSON.deserialize(JSON.serialize(InputData.get('${reservedAttributeName}')),`, `BackEndRequestM.getCaseInputData('${self.reservedAttributeNames[reservedAttributeName].replacement}',`, 'apex') // Take advantage of this script to replace dirty code ^^
          apexLine = self.replaceExpression(apexLine, reservedAttributeName, `JSON.deserialize(UtilsApex.serializeObject(InputData.get('${reservedAttributeName}')),`, `BackEndRequestM.getCaseInputData('${self.reservedAttributeNames[reservedAttributeName].replacement}',`, 'apex') // Take advantage of this script to replace dirty code ^^
        }
        // Attribute name .get() 
        apexLine = self.replaceExpression(apexLine, reservedAttributeName, `.get('${reservedAttributeName}'`, `.get('${self.reservedAttributeNames[reservedAttributeName].replacement}'`, 'apex')
        // Attribute name .setCaseInputData() 
        apexLine = self.replaceExpression(apexLine, reservedAttributeName, `setCaseInputData('${reservedAttributeName}'`, `setCaseInputData('${self.reservedAttributeNames[reservedAttributeName].replacement}'`, 'apex')
      }
    })
    return apexLine
  }

  // Replace expression in given line
  replaceExpression(line, reservedAttributeName, expressionToReplace, replacement, type) {
    if (line.includes(expressionToReplace)) {
      console.log('- found: ' + expressionToReplace + ' in ' + line)
      line = line.replace(expressionToReplace, replacement)
      console.log('-- replaced by: ' + line)
      this.reservedAttributeNames[reservedAttributeName].numberReplacements = this.reservedAttributeNames[reservedAttributeName].numberReplacements + 1
      this.totalReplacements = this.totalReplacements + 1
      if (type === 'cmp')
        this.reservedAttributeNames[reservedAttributeName].numberReplacementsCmp = this.reservedAttributeNames[reservedAttributeName].numberReplacementsCmp + 1
      else if (type === 'js')
        this.reservedAttributeNames[reservedAttributeName].numberReplacementsJs = this.reservedAttributeNames[reservedAttributeName].numberReplacementsJs + 1
      else if (type === 'apex')
        this.reservedAttributeNames[reservedAttributeName].numberReplacementsApex = this.reservedAttributeNames[reservedAttributeName].numberReplacementsApex + 1

    }
    return line
  }

}

