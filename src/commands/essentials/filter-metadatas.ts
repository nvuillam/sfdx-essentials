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
  packageXmlMetadatasTypeLs = []
  sobjectCollectedInfo = {}
  summaryResult = { metadataTypes: {}, objects: [] }

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
        self.fse.copySync(self.packageXmlFile, self.outputFolder+'/package.xml')

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
      if (metadataDesc.folder != null)
        self.copyMetadataFiles(metadataDesc, metadataType, members)
      else if (metadataDesc.sobjectRelated === true)
        self.collectObjectDescription(metadataType, members)

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



  // get Metadatype description
  getMetadataTypeDescription(md_type) {
    var desc = this.describeMetadataTypes()[md_type]
    return desc
  }

  // Copy objects based on information gathered with 'sobjectRelated' metadatas
  copyImpactedObjects() {
    var self = this
    this.fs.mkdirSync(self.outputFolder + '/objects/')
    Object.keys(this.sobjectCollectedInfo).forEach(function (objectName) {
      //NV:  Warning: this tool will be completed when .object file will be filtered to keep only related CustomFields, BusinessProcess, etc ... gathered from package.xml
      console.log('- processing SObject ' + objectName)
      var objectContentToKeep = self.sobjectCollectedInfo[objectName]

      // Read .object file
      var inputObjectFileName = self.inputFolder + '/objects/' + objectName + '.object'
      var parser = new self.xml2js.Parser();

      var data = self.fs.readFileSync(inputObjectFileName)
      parser.parseString(data, function (err2, parsedObjectFile) {
        // Filter .object file to keep only items referenced in package.xml ( and collected during filterMetadatasByType) 
        //console.log(`- parsed .object file \n` + self.util.inspect(parsedObjectFile, false, null) + `\nto filter with ` + self.util.inspect(objectContentToKeep, false, null))

        if (objectContentToKeep == null)
          console.log('-- no filtering for ' + objectName)
        else
          parsedObjectFile = self.filterSObjectFile(parsedObjectFile, objectName, objectContentToKeep)

        var builder = new self.xml2js.Builder();
        var updatedObjectXml = builder.buildObject(parsedObjectFile);

        var outputObjectFileName = self.outputFolder + '/objects/' + objectName + '.object'
        self.fs.writeFileSync(outputObjectFileName, updatedObjectXml)
      });
      self.summaryResult.objects.push(objectName)

    });
    self.summaryResult.objects.sort()
  }

  // Filter output XML of .object file
  filterSObjectFile(parsedObjectFile, objectName, objectContentToKeep) {
    const objectFilteringProperties = this.describeObjectFilteringProperties()
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
            if (!self.arrayIncludes(compareList,itemName)) {
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

  arrayIncludes(zeArray,zeItem) {
    var result = false 
    zeArray.forEach(function (elt) {
      if (elt == zeItem)
        result = true
    })
    return result
  }

  // Display results as JSON
  displayResults() {
    console.log(this.util.inspect(this.summaryResult, false, null))
  }

  // Describe packageXml <=> metadata folder correspondance
  describeMetadataTypes() {

    // folder is the corresponding folder in metadatas folder 
    // nameSuffixList are the files and/or folder names , built from the name of the package.xml item ( in <members> )

    const metadataTypesDescription = {
      // Metadatas to use for copy
      'ApexClass': { folder: 'classes', nameSuffixList: ['.cls', '.cls-meta.xml'] },
      'ApexComponent': { folder: 'components', nameSuffixList: ['.component', '.component-meta.xml'] },
      'ApexPage': { folder: 'pages', nameSuffixList: ['.page', '.page-meta.xml'] },
      'ApexTrigger': { folder: 'triggers', nameSuffixList: ['.trigger', '.trigger-meta.xml'] },
      'AuraDefinitionBundle': { folder: 'aura', nameSuffixList: [''] },
      'ContentAsset': { folder: 'contentassets', nameSuffixList: ['.asset','.asset-meta.xml'] },
      'CustomApplication': { folder: 'applications', nameSuffixList: ['.app'] },
      'CustomLabel': { folder: 'labels', nameSuffixList: [''] },
      'CustomMetadata': { folder: 'customMetadata', nameSuffixList: ['.md'] },
      'CustomObjectTranslation': { folder: 'objectTranslations', nameSuffixList: ['.objectTranslation'] },
      'CustomTab': { folder: 'tabs', nameSuffixList: ['.tab'] },
      'Document': { folder: 'documents', nameSuffixList: ['', '-meta.xml'] },
      'EmailTemplate': { folder: 'email', nameSuffixList: ['.email', '.email-meta.xml'] },
      'EscalationRules': { folder: 'escalationRules', nameSuffixList: ['.escalationRules'] },
      'FlexiPage': { folder: 'flexipages', nameSuffixList: ['.flexipage'] },
      'GlobalValueSet': { folder: 'globalValueSets', nameSuffixList: ['.globalValueSet'] },
      'GlobalValueSetTranslation': { folder: 'globalValueSetTranslations', nameSuffixList: ['.globalValueSetTranslation'] },
      'HomePageLayout': { folder: 'homePageLayouts', nameSuffixList: ['.homePageLayout'] },
      'Layout': { folder: 'layouts', nameSuffixList: ['.layout'] },
      'NamedCredential': { folder: 'namedCredentials', nameSuffixList: ['.namedCredential'] },
      'PermissionSet': { folder: 'permissionsets', nameSuffixList: ['.permissionset'] },
      'Profile': { folder: 'profiles', nameSuffixList: ['.profile'] },
      'QuickAction': { folder: 'quickActions', nameSuffixList: ['.quickAction'] },
      'RemoteSiteSetting': { folder: 'remoteSiteSettings', nameSuffixList: ['.remoteSite'] },
      'Report': { folder: 'reports', nameSuffixList: ['', '-meta.xml'] },
      'StandardValueSet': { folder: 'standardValueSets', nameSuffixList: ['.standardValueSet'] },
      'StaticResource': { folder: 'staticresources', nameSuffixList: ['.resource', '.resource-meta.xml'] },
      'Translations': { folder: 'translations', nameSuffixList: ['.translation'] },
      'Workflow': { folder: 'workflows', nameSuffixList: ['.workflow'] },

      // Metadatas to use for building objects folder ( SObjects )
      'BusinessProcess': { sobjectRelated: true },
      'CustomField': { sobjectRelated: true },
      'CustomObject': { sobjectRelated: true },
      'ListView': { sobjectRelated: true },
      'RecordType': { sobjectRelated: true },
      'WebLink': { sobjectRelated: true }

    }
    return metadataTypesDescription
  }

  // Describe .object file <=> package.xml formats
  describeObjectFilteringProperties() {

    const objectFilteringProperties = [
      { objectXmlPropName: 'businessProcesses', packageXmlPropName: 'BusinessProcess', nameProperty: 'fullName' },
      { objectXmlPropName: 'fields', packageXmlPropName: 'CustomField', nameProperty: 'fullName' },
      { objectXmlPropName: 'listviews', packageXmlPropName: 'ListView', nameProperty: 'fullName' },
      { objectXmlPropName: 'recordTypes', packageXmlPropName: 'RecordType', nameProperty: 'fullName' },
      { objectXmlPropName: 'weblinks', packageXmlPropName: 'WebLink', nameProperty: 'fullName' }
    ]
    return objectFilteringProperties
  }




}