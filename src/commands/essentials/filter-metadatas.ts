import { Command, flags } from '@oclif/command'
import { FILE } from 'dns';

export default class ExecuteFilter extends Command {
  static description = ``

  static examples = []

  static flags = {
    // flag with a value (-n, --name=VALUE)
    packagexml: flags.string({ char: 'p', description: 'package.xml file path' }),
    inputfolder: flags.string({ char: 'i', description: 'Input folder (default: "." )' }),
    outputfolder: flags.string({ char: 'o', description: 'Output folder (default: filteredMetadatas)' })
  }

  static args = []

  // Input params properties
  packageXmlFile
  inputFolder
  outputFolder

  // Internal properties
  fs = require('fs')
  fse = require('fs-extra')
  xml2js = require('xml2js')
  util = require('util')
  path = require('path')
  MetadataUtils = require('../../common/metadata-utils');
  packageXmlMetadatasTypeLs = []
  sobjectCollectedInfo = {}
  translatedLanguageList = []
  summaryResult = { metadataTypes: {}, objects: [], objectsTranslations: [] }

  // Runtime methods
  async run() {

    const { args, flags } = this.parse(ExecuteFilter)

    // Get input arguments or default values
    this.packageXmlFile = flags.packagexml
    this.inputFolder = flags.inputfolder || '.'
    this.outputFolder = flags.outputfolder || 'filteredMetadatas'
    this.log(`Initialize filtering of ${this.inputFolder} ,using ${this.packageXmlFile} , into ${this.outputFolder}`)

    
    // Read package.xml file
    var parser = new this.xml2js.Parser();
    var self = this
    this.fs.readFile(this.packageXmlFile, function (err, data) {
      parser.parseString(data, function (err2, result) {
        console.log(`Parsed package.xml \n` + self.util.inspect(result, false, null))

        // get metadata types in parse result
        try { self.packageXmlMetadatasTypeLs = result.Package.types }
        catch { throw 'Unable to parse packageXml file ' + self.packageXmlFile }

        // Create output folder/empty it if existing
        if (self.fs.existsSync(self.outputFolder)) {
          console.log('Empty target directory')
          self.fse.emptyDirSync(self.outputFolder);
        }
        else {
          self.fs.mkdirSync(self.outputFolder)
        }

        // Copy package.xml file in output folder
        self.fse.copySync(self.packageXmlFile, self.outputFolder + '/package.xml')

        // Process source folder filtering and copy files into target folder
        self.filterMetadatasByType()
        self.copyImpactedObjects()
        self.displayResults()
      });
    });

  }

  // Filter metadatas by type
  filterMetadatasByType() {
    var self = this
    this.packageXmlMetadatasTypeLs.forEach(function (metadataDefinition) {
      var metadataType = metadataDefinition.name
      var members = metadataDefinition.members

      self.summaryResult.metadataTypes[metadataType] = { 'nbCopied': 0 }
      // Get metadata description
      var metadataDesc = self.getMetadataTypeDescription(metadataType)
      if (metadataDesc == null) {
        return
      }
      // Simply copy files
      if (metadataDesc.folder != null)
        self.copyMetadataFiles(metadataDesc, metadataType, members)

      // Collect for .object & .objectTranslation filtering
      if (metadataDesc.sobjectRelated === true)
        self.collectObjectDescription(metadataType, members)

      // Collect for translation filtering
      if (metadataDesc.translationRelated === true)
        self.collectTranslationDescription(metadataType, members)

    });
  }

  copyMetadataFiles(metadataDesc, metadataType, members) {
    // Browse folder for matching files and copy them into target folder
    var typeInputFolder = this.inputFolder + '/' + metadataDesc.folder
    console.log(`- processing ${metadataType}`)
    if (this.fs.existsSync(typeInputFolder)) {
      var typeOutputFolder = this.outputFolder + '/' + metadataDesc.folder
      if (members != null && members[0] === '*') {
        // Wildcard: copy whole folder
        this.fse.copySync(typeInputFolder, typeOutputFolder)
      }
      else {
        // Create member folder in output folder
        this.fs.mkdirSync(typeOutputFolder)
        var self = this
        // Iterate all metadata types members (ApexClass,ApexComponent,etc...)
        members.forEach(function (member) {
          // Iterate all possible extensions ( '' for same file/folder name, '.cls' for ApexClass, etc ...)
          metadataDesc.nameSuffixList.forEach(function (nameSuffix) {
            // If input file/folder exists, copy it in output folder
            var sourceFile = typeInputFolder + '/' + member + nameSuffix
            if (self.fs.existsSync(sourceFile)) {
              var copyTargetFile = typeOutputFolder + '/' + member + nameSuffix
              self.fse.copySync(sourceFile, copyTargetFile)
              // Increment counter only when file is not meta-xml
              if (!sourceFile.endsWith('meta-xml')) {
                self.summaryResult.metadataTypes[metadataType]['nbCopied']++
              }
            }
          })
        })

      }
    }
  }

  // Special case of SObjects: collect references to them in MetadataTypes
  collectObjectDescription(metadataType, members) {
    var self = this
    console.log(`- collecting ${metadataType}`)
    if (members == null) {
      console.log(`-- Warning: no ${metadataType} in package.xml`)
      return
    }
    members.forEach(function (member) {
      var sobjectName = member.split('.')[0]
      var sobjectInfo = self.sobjectCollectedInfo[sobjectName] || {}
      if (metadataType != 'CustomObject' && member.split('.')[1] != null) {
        var sobjectInfoMetadataTypeList = sobjectInfo[metadataType] || []
        sobjectInfoMetadataTypeList.push(member.split('.')[1])
        sobjectInfo[metadataType] = sobjectInfoMetadataTypeList
      }
      self.sobjectCollectedInfo[sobjectName] = sobjectInfo
    })
  }

  // Special case of SObjects: collect references to them in MetadataTypes
  collectTranslationDescription(metadataType, members) {
    var self = this
    console.log(`- collecting ${metadataType}`)
    if (members == null) {
      console.log(`-- Warning: no ${metadataType} in package.xml`)
      return
    }
    members.forEach(function (member) {
      self.translatedLanguageList.push(member)
    })
    console.log('- collected language list:' + self.translatedLanguageList.toString())
  }

  // get Metadatype description
  getMetadataTypeDescription(md_type) {
    var desc = this.MetadataUtils.describeMetadataTypes()[md_type]
    return desc
  }

  // Copy objects based on information gathered with 'sobjectRelated' metadatas
  copyImpactedObjects() {
    var self = this
    // Create objects folder
    this.fs.mkdirSync(self.outputFolder + '/objects/')
    // Create objectTranslations folder if necessary
    if (self.translatedLanguageList.length > 0)
      this.fs.mkdirSync(self.outputFolder + '/objectTranslations/')

    // Process all SObjects
    Object.keys(this.sobjectCollectedInfo).forEach(function (objectName) {
      console.log('- processing SObject ' + objectName)
      var objectContentToKeep = self.sobjectCollectedInfo[objectName]

      // Read .object file
      var inputObjectFileName = self.inputFolder + '/objects/' + objectName + '.object'
      var parser = new self.xml2js.Parser();
      var data = self.fs.readFileSync(inputObjectFileName)
      parser.parseString(data, function (err2, parsedObjectFile) {
        // Filter .object file to keep only items referenced in package.xml ( and collected during filterMetadatasByType) 
        if (objectContentToKeep == null)
          console.log('-- no filtering for ' + objectName)
        else
          parsedObjectFile = self.filterSObjectFile(parsedObjectFile, objectName, objectContentToKeep)

        // Write output .object file
        var builder = new self.xml2js.Builder();
        var updatedObjectXml = builder.buildObject(parsedObjectFile);
        var outputObjectFileName = self.outputFolder + '/objects/' + objectName + '.object'
        self.fs.writeFileSync(outputObjectFileName, updatedObjectXml)
      });
      self.summaryResult.objects.push(objectName)

      // Manage objectTranslations
      if (self.translatedLanguageList.length > 0) {
        console.log('- processing SObject translation for ' + objectName)
        self.translatedLanguageList.forEach(translationCode => {
          var inputObjectTranslationFileName = self.inputFolder + '/objectTranslations/' + objectName + '-' + translationCode + '.objectTranslation'
          // Check objectTranslation file exists for this language
          if (!self.fs.existsSync(inputObjectTranslationFileName))
            return
          // Read .objectTranslation file
          var parserTr = new self.xml2js.Parser();
          var dataTr = self.fs.readFileSync(inputObjectTranslationFileName)
          parserTr.parseString(dataTr, function (err2, parsedObjectFileTr) {
            // Filter .objectTranslation file to keep only items referenced in package.xml ( and collected during filterMetadatasByType) 
            if (objectContentToKeep == null)
              console.log('-- no filtering for ' + objectName)
            else
              parsedObjectFileTr = self.filterSObjectTranslationFile(parsedObjectFileTr, objectName, objectContentToKeep)

            // Write output .objectTranslation file
            var builderTrx = new self.xml2js.Builder();
            var updatedObjectXmlTr = builderTrx.buildObject(parsedObjectFileTr);
            var outputObjectFileNameTr = self.outputFolder + '/objectTranslations/' + objectName + '-' + translationCode + '.objectTranslation'
            self.fs.writeFileSync(outputObjectFileNameTr, updatedObjectXmlTr)
          });
          self.summaryResult.objectsTranslations.push(objectName + '-' + translationCode)
        })

      }

    });
    self.summaryResult.objects.sort()
  }

  // Filter output XML of .object file
  filterSObjectFile(parsedObjectFile, objectName, objectContentToKeep) {
    const objectFilteringProperties = this.MetadataUtils.describeObjectProperties()
    var self = this
    objectFilteringProperties.forEach(function (objectFilterProp) {
      // Filter fields
      var objectXmlPropName = objectFilterProp['objectXmlPropName']
      var packageXmlPropName = objectFilterProp['packageXmlPropName']
      var nameProperty = objectFilterProp['nameProperty']
      if (parsedObjectFile['CustomObject'][objectXmlPropName] != null) {

        var compareList = objectContentToKeep[packageXmlPropName] || []
        if (parsedObjectFile['CustomObject'][objectXmlPropName] == null) {
          console.warn('/!\ can not filter ' + objectXmlPropName + ' : not found')
        } else {
          var pos = 0
          parsedObjectFile['CustomObject'][objectXmlPropName].forEach(function (itemDscrptn) {
            var itemName = itemDscrptn[nameProperty]
            if (!self.arrayIncludes(compareList, itemName)) {
              console.log(`---- removed ${packageXmlPropName} ` + itemDscrptn[nameProperty])
              delete parsedObjectFile['CustomObject'][objectXmlPropName][pos]
            }
            else {
              console.log(`-- kept ${packageXmlPropName} ` + itemDscrptn[nameProperty])
            }
            pos++
          })
        }
      }
    });

    return parsedObjectFile
  }

  // Filter output XML of .object file
  filterSObjectTranslationFile(parsedObjectFile, objectName, objectContentToKeep) {
    const objectFilteringProperties = this.MetadataUtils.describeObjectProperties()
    var self = this
    objectFilteringProperties.forEach(function (objectFilterProp) {
      // Filter fields,layouts,businessProcesses, listView,WebLink
      var objectXmlPropName = objectFilterProp['objectXmlPropName']
      var packageXmlPropName = objectFilterProp['packageXmlPropName']
      var nameProperty = objectFilterProp['translationNameProperty']
      if (parsedObjectFile['CustomObjectTranslation'][objectXmlPropName] != null) {

        var compareList = objectContentToKeep[packageXmlPropName] || []
        if (parsedObjectFile['CustomObjectTranslation'][objectXmlPropName] == null) {
          console.warn('/!\ can not filter translation ' + objectXmlPropName + ' : not found')
        } else {
          var pos = 0
          parsedObjectFile['CustomObjectTranslation'][objectXmlPropName].forEach(function (itemDscrptn) {
            var itemName = itemDscrptn[nameProperty]
            if (!self.arrayIncludes(compareList, itemName)) {
              console.log(`---- removed translation ${packageXmlPropName} ` + itemDscrptn[nameProperty])
              delete parsedObjectFile['CustomObjectTranslation'][objectXmlPropName][pos]
            }
            else {
              console.log(`-- kept translation ${packageXmlPropName} ` + itemDscrptn[nameProperty])
            }
            pos++
          })
        }
      }
    });

    return parsedObjectFile
  }

  arrayIncludes(zeArray, zeItem) {
    var result = false
    zeArray.forEach(function (elt) {
      if (elt == zeItem)
        result = true
    })
    return result
  }

  // Display results as JSON
  displayResults() {
    console.log(JSON.stringify(this.summaryResult))
  }

}