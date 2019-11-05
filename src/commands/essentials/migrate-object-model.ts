import { Command, flags } from '@oclif/command'
import { FILE } from 'dns';
import { setFlagsFromString } from 'v8';
import { resolve } from 'url';

export default class ExecuteFilter extends Command {
  static description = ``

  static examples = []

  static flags = {
    // flag with a value (-n, --name=VALUE)
    dataModelFolder: flags.string({ char: 'd', description: 'folder where to find the old/new datamodel' }),
    dataModelFiles: flags.string({ char: 'p', description: 'Files containing the name of JSON to parse' }),
    inputFolders: flags.string({ char: 'i', description: 'Input folder (default: "." )' }),
    outputFolder: flags.string({ char: 'o', description: 'Output folder (default: filteredMetadatas)' })
  }

  static args = []

  // Input params properties
  dataModelFolder: any
  dataModelFiles: any
  inputFolders: any
  outputFolder: any

  // Internal properties
  glob = require('glob')
  fs = require('fs')
  util = require('util')
  xml2js = require('xml2js')
  rimraf = require("rimraf");


  // Runtime methods
  async run() {

    const { args, flags } = this.parse(ExecuteFilter)

    this.inputFolders = flags.inputFolders || '.'
    this.dataModelFolder = flags.dataModelFolder
    this.dataModelFiles = flags.dataModelFiles



    // Add list of custom class names in reserved variables
    var fetchExpressionList = this.inputFolders.split(',')
    console.log('Fetching classes with expression : ' + fetchExpressionList)
    const self = this
    fetchExpressionList.forEach(function (fetchExpression) {
      var customFileNameList = self.glob.sync(fetchExpression)
      const self1 = self
      customFileNameList.forEach(function (customFileName) {
        if (fetchExpression.includes('objects') && fetchExpression.includes('fields')) {
          //  dataModel file to read
          let jsonDataModelToMigrate = self1.fs.readFileSync(self.dataModelFolder + '/' + self.dataModelFiles)
          let jsonConfig = JSON.parse(jsonDataModelToMigrate)
          let objectsToMigrate = jsonConfig.objects
          // create a new lookup fields which match with the new object
          self.processFileXmlFields(customFileName, objectsToMigrate).then(function () {
          })
        } else {
          const replaceList = self1.getObjectAndFieldToReplace(fetchExpression);

          // Replace in .cmp, .app & .evt files (send function as parameter)
          self1.processFileApexJsCmp(customFileName, replaceList).then(function () {
          })
        }
      })
    })
    this.deleteOldDataModelReferency()
  }

  // Process component file
  processFileApexJsCmp(customComponentFolder: any, replaceList: any) {
    var self = this
    return new Promise(function (resolveApexJsCmp, reject) {
      // Find file
      var filePath = null

      var filePathTest = customComponentFolder
      if (filePath == null && self.fs.existsSync(filePathTest))
        filePath = filePathTest
      if (filePath == null) {
        resolveApexJsCmp()
        return
      }

      //  dataModel file to read
      let jsonDataModelToMigrate = self.fs.readFileSync(self.dataModelFolder + '/' + self.dataModelFiles)
      let jsonConfig = JSON.parse(jsonDataModelToMigrate)

      // Read file
      var fileContent = self.fs.readFileSync(filePath)
      if (fileContent == null) {
        console.log('Warning: empty file -> ' + filePath)
        resolveApexJsCmp()
        return
      }
      let arrayFileLines = fileContent.toString().split("\n");

      // Process file lines one by one
      //  dataModel file to read
      let regexEpression: any = []
      if (jsonConfig && jsonConfig.globalConfig) {
        regexEpression.Before = jsonConfig.globalConfig.regexEpressionBeforeElement
        regexEpression.After = jsonConfig.globalConfig.regexEpressionAfterElement
      }
      if (replaceList) {
        replaceList.forEach(function (rep) {
          const toReplace = rep[0]
          const replaceBy = rep[1]
          const caseSensitive = rep[2]

          let excludeList: Array<any>
          let includeList: Array<any>
          let replace: boolean = true

          const extensionElement = filePath.split('.')[filePath.split('.').length - 1]
          let className = filePath.split('/')[filePath.split('/').length - 1]
          className = className.substring(0, className.indexOf('.' + extensionElement))


          // Create the exclude and include element list for specific object or field
          if (rep[3] && rep[3].exclude && rep[3].exclude[extensionElement] != undefined) {
            excludeList = rep[3].exclude[extensionElement]
          }
          else if (rep[3] && rep[3].include && rep[3].include[extensionElement] != undefined) {
            includeList = rep[3].include[extensionElement]
          }
          if (excludeList) {
            replace = true
            for (var i = 0; i < excludeList.length; i++) {
              var excludeItem = excludeList[i]
              if (excludeItem === className) {
                replace = false
                break
              }
              else if (excludeItem.endsWith('%') && className.toUpperCase().startsWith(excludeItem.substring(0, excludeItem.indexOf('%')).toUpperCase())) {
                replace = false
                if (rep[3].exceptionExclude) {

                  const exceptionExluceList = rep[3].exceptionExclude
                  for (let i = 0; i < exceptionExluceList.length; i++) {
                    if (className === exceptionExluceList[i]) {
                      replace = true
                    }
                  }
                }
                break
              }
            }
            if (replace) {
              arrayFileLines = self.readAndReplaceFile(arrayFileLines, caseSensitive, toReplace, replaceBy, rep[4], regexEpression, filePath);
            }
          } else if (includeList) {
            // if includelist exist but empty that means no element should be replace
            if (includeList.length != 0) {
              includeList.forEach(function (includeItem) {
                if (includeItem === className)
                  replace = true
                else if (includeItem.endsWith('%') && className.toUpperCase().startsWith(includeItem.substring(0, includeItem.indexOf('%')).toUpperCase()))
                  replace = true
                else
                  replace = false
                if (replace) {
                  arrayFileLines = self.readAndReplaceFile(arrayFileLines, caseSensitive, toReplace, replaceBy, rep[4], regexEpression, filePath);
                }
              });
            }
          } else {
            arrayFileLines = self.readAndReplaceFile(arrayFileLines, caseSensitive, toReplace, replaceBy, rep[4], regexEpression, filePath);
          }

        })
      }
      resolveApexJsCmp() // Resolve promise so then is called
    })
  }

  processFileXmlFields(xmlFile: any, replaceField: any) {
    const self = this
    var processFileXmlFields = new Promise(function (resolve, reject) {

      const parser = new self.xml2js.Parser();
      const builder = new self.xml2js.Builder();


      //Create a new file to migrate the lookup field
      const data = self.fs.readFileSync(xmlFile);
      parser.parseString(data, function (err2, fileXmlContent) {
        if (fileXmlContent) {
          Object.keys(fileXmlContent).forEach(eltKey => {
            for (let i = 0; i < replaceField.length; i++) {
              if (fileXmlContent[eltKey].referenceTo && fileXmlContent[eltKey].referenceTo[0] && fileXmlContent[eltKey].referenceTo[0] == replaceField[i].previousObject) {
                fileXmlContent[eltKey].referenceTo[0] = replaceField[i].newObject
                fileXmlContent[eltKey].label[0] = replaceField[i].newLabel
                fileXmlContent[eltKey].fullName[0] = replaceField[i].newObject

                fileXmlContent[eltKey].relationshipName[0] = fileXmlContent[eltKey].relationshipName[0].replace('_', '')

                xmlFile = xmlFile.substring(0, xmlFile.indexOf('fields')) + 'fields/' + replaceField[i].newObject + '.field-meta.xml'
                var updatedObjectXml = builder.buildObject(fileXmlContent);
                self.fs.writeFileSync(xmlFile, updatedObjectXml)
                break
              }
            }

          });
        }
      })
      resolve()

    })
    return processFileXmlFields
  }


  // add specific caracter around the field/object we need to replace
  getObjectAndFieldToReplace(fetchExpression: string) {
    //  dataModel file to read
    let jsonDataModelToMigrate = this.fs.readFileSync(this.dataModelFolder + '/' + this.dataModelFiles)
    let jsonConfig = JSON.parse(jsonDataModelToMigrate)
    let objectsToMigrate = jsonConfig.objects

    const replaceList: Array<any> = []

    // Default replacement list for object
    let aroundCharReplaceObjectList = [
      { name: 'simpleQuote', before: '\'', after: '\'', replacementPrefix: null, replacementSuffix: null },
      { name: 'tag', before: '<', after: '>' },
      { name: 'xmlFile', before: '>', after: '</' },
      { name: 'stringlist', before: '\'', after: '.' }, //ClassName.MEthodNmae('MyObject.Myfield');
      { name: 'space', before: ' ', after: ' ' },
      { name: 'spacePoint', before: ' ', after: '.' }, //Database.upsert( objectList, fieldobject.Fields.fieldName__c,false) ;
      { name: 'parenthesis', before: '\(', after: '\)' },
      { name: 'loop', before: '\(', after: '\ ' }, //  for (MyObject object : MyObjectList)
      { name: 'newObject', before: '\ ', after: '\(' },      // ex: MyObject myObj = new MyObject()
      { name: 'objectInParenthesis', before: '\ ', after: '\)' },      //  System.assert( object instanceof objectInstance__c);
      { name: 'object', before: '"', after: '.' }, // value="MyObject__c.Field__c"
      { name: 'fieldEndline', before: ' ', after: '$' } // Select Id FROM MyObject__c \n WHERE Field == 'tes''
    ]

    // Complete aroundCharReplaceList with json config (replae by name value , or append if name not found)
    if (jsonConfig.globalConfig && jsonConfig.globalConfig.aroundCharReplaceObjectListOverride) {
      aroundCharReplaceObjectList = this.aroundCharReplaceList(aroundCharReplaceObjectList, jsonConfig.globalConfig.aroundCharReplaceObjectListOverride, fetchExpression)
    }

    // Default replacement list for object
    let aroundCharReplacefieldList = [
      { name: 'simpleQuote', before: '\'', after: '\'', replacementPrefix: null, replacementSuffix: null },
      { name: 'simpleQuoteFields', before: '\'', after: '.', replacementPrefix: null, replacementSuffix: null },
      { name: 'point', before: '.', after: '.' },
      { name: 'pointSpace', before: '.', after: ' ' },
      { name: 'xmlFile', before: '>', after: '</' },
      { name: 'xmlFile', before: '.', after: '</' },
      { name: 'pointQuote', before: '.', after: '\'' },//ClassName.MEthodNmae('MyObject.Myfield');
      { name: 'spacePoint', before: ' ', after: '.' }, //Database.upsert( objectList, fieldobject.Fields.fieldName__c,false) ;
      { name: 'pointEndLine', before: '.', after: ';' }, //Select id FROM MyObject__c WHERE ObjectFields__r.objectField__c 
      { name: 'objectArgument', before: '(', after: '=' }, //   Object myObject = new Object(field1__c=value1, field2__c = value2);
      { name: 'fieldParenthesis', before: '(', after: ')' }, //   toLabel(field1__c)
      { name: 'endOfstring', before: ' ', after: '\'' }, //   database.query('Select id, Fields1__c, Fields__c FROM MyObject__c WHERE ObjectFields__r.objectField__c')
      { name: 'selectfields', before: ' ', after: ',' }, //   Select id, Fields1__c, Fields__c FROM MyObject__c WHERE ObjectFields__r.objectField__c 
      { name: 'pointArgument', before: '.', after: ',' }, //  className.method(myObject.field1__r,myObject.field1__C);
      { name: 'pointEndParenthesis', before: '.', after: ')' },    //field in parenthesis className.method(myObject.field1__r,myObject.field1__C);
      { name: 'SOQLRequest', before: ',', after: '.' }, //lookup fields SELECT Id,Name,lookupField__r.fields
      { name: 'newObjectInitialize', before: ' ', after: '=' }, //l new myObject(field1__c=acc.Id, Field2__c='Owner')
      { name: 'firstSOQLRequest', before: 'SELECT ', after: ' ' },    //in request soql SELECT field FROM
      { name: 'firstSOQLRequestofList', before: 'SELECT ', after: ',' }, //in request soql SELECT field, field2 FROM
      { name: 'SOQLRequestofList', before: ' ', after: ',' }, //in request soql SELECT field, field2 FROM
      { name: 'lastSOQLRequestofList', before: ' ', after: ' FROM' },    //in request soql SELECT field, field2 FROM
      { name: 'lastSOQLRequestofList', before: ',', after: ' FROM' },    //in request soql SELECT field,field2 FROM
      { name: 'equality', before: '.', after: '=' },    //field== 'value'
      { name: 'list', before: '.', after: '}' },    //new List<String>{MyOject.Field__c});
      { name: 'inequality', before: '.', after: '!' },    //field!= 'value'
      { name: 'Concatenation', before: '.', after: '+' },    //String test = SFObject.Field1__c+';'+SFObject.Field2__c;
      { name: 'comaComa', before: ',', after: ',' }, // in select example Select field,field,field FROM Object
      { name: 'pointCalculator', before: '.', after: '*' }, //operation on field Myobject.Field__c*2
      { name: 'componentfield', before: '.', after: '"' }, // value="MyObject__c.Field__c"
      { name: 'DeclarationField', before: '"', after: '"' }, //  <aura:attribute name="Fields__c" type="String" />
      { name: 'fieldEndline', before: '.', after: '$' } // if  MyObject__c.Field == MyObject__c.Field2 \n || etc...
    ]

    // Complete aroundCharReplaceList with json config (replae by name value , or append if name not found)
    if (jsonConfig.globalConfig && jsonConfig.globalConfig.aroundCharReplaceFieldListOverride) {
      aroundCharReplacefieldList = this.aroundCharReplaceList(aroundCharReplacefieldList, jsonConfig.globalConfig.aroundCharReplaceFieldListOverride, fetchExpression)
    }

    objectsToMigrate.forEach(object => {

      aroundCharReplaceObjectList.forEach(function (aroundChars) {
        let oldString
        if (!aroundChars.after.includes('$')) {
          oldString = '\\' + aroundChars.before + object.previousObject + '\\' + aroundChars.after
        } else {
          oldString = '\\' + aroundChars.before + object.previousObject + aroundChars.after
        }
        let newString = aroundChars.before + object.newObject

        if (aroundChars.after != '$') {
          newString += aroundChars.after
        }
        if (aroundChars.replacementPrefix) {
          newString = aroundChars.replacementPrefix + newString
        }
        if (aroundChars.replacementSuffix) {
          newString += aroundChars.replacementSuffix
        }
        let replaceObject: any
        replaceObject = [oldString, newString, object.caseSensitive, { exclude: object.exclude, include: object.include }, { oldObject: object.previousObject, newObject: object.newObject }]

        //Add exclude exception if need (exemple : exclude = className% exception = classeNameException)
        if (object.exclude && object.exclude.exceptionList) {
          replaceObject[3].exceptionExclude = object.exclude.exceptionList
        }
        if (object.include && object.include.exceptionList) {
          replaceObject[3].exceptionInclude = object.include.exceptionList
        }

        replaceList.push(replaceObject)
      })

      if (object.fieldsMapping) {
        object.fieldsMapping.forEach(fieldToChange => {

          aroundCharReplacefieldList.forEach(function (aroundChars) {
            let oldString
            if (!aroundChars.after.includes('$')) {
              oldString = '\\' + aroundChars.before + fieldToChange.previousField + '\\' + aroundChars.after
            } else {
              oldString = '\\' + aroundChars.before + fieldToChange.previousField + aroundChars.after
            }
            let newString = aroundChars.before + fieldToChange.newField

            if (aroundChars.after != '$') {
              newString += aroundChars.after
            }
            if (aroundChars.replacementPrefix) {
              newString = aroundChars.replacementPrefix + newString
            }
            if (aroundChars.replacementSuffix) {
              newString += aroundChars.replacementSuffix
            }

            let replacefield: any
            replacefield = [oldString, newString, fieldToChange.caseSensitive, { exclude: fieldToChange.exclude, include: fieldToChange.include }]

            //Add include exception if need (exemple : include = className% exception = classeNameException)
            if (fieldToChange.exclude && fieldToChange.exclude.exceptionList) {
              replacefield[3].exceptionExclude = fieldToChange.exclude.exceptionList
            }
            if (fieldToChange.include && fieldToChange.include.exceptionList) {
              replacefield[3].exceptionInclude = fieldToChange.include.exceptionList
            }
            replaceList.push(replacefield)
          })
        });
      }
    });
    return replaceList
  }

  //add element to the list
  aroundCharReplaceList(aroundCharReplaceObjectList: any, aroundCharReplaceListOverride: any, fetchExpression: string) {
    aroundCharReplaceListOverride.forEach(function (aroundCharsOverride: any) {
      let replaced: boolean = false
      aroundCharReplaceObjectList.forEach(function (aroundChars: any, i: number) {
        if (aroundChars.name == aroundCharsOverride.name) {
          replaced = true;
          if (!aroundCharsOverride.affecteditems || (aroundCharsOverride.affecteditems && fetchExpression.endsWith(aroundCharsOverride.affecteditems)))
            aroundCharReplaceObjectList[i] = aroundCharsOverride;
        }
      });
      if (!replaced) {
        aroundCharReplaceObjectList.push(aroundCharsOverride)
      }
    })
    return aroundCharReplaceObjectList
  }

  readAndReplaceFile(arrayFileLines: any, caseSensitive: boolean, toReplace: string, replaceBy: string, replaceObject: any, regexEpression: any, filePath: string) {
    // console.log('processing ' + filePath + ' ' + toReplace + ' ' + replaceBy)
    let updated: boolean = false
    let updatedFileContent: string = ''
    let lineUpdated: boolean = false
    let toReplaceWithRegex: string = toReplace

    arrayFileLines.forEach(line => {
      lineUpdated = false
      let newLine: string
      let regExGlobalRules: string = 'g'
      if (!line.trim().startsWith('//')) {
        line = line.replace('\r', '')
        const newLinePrev = line
        if (!caseSensitive) {
          regExGlobalRules += 'i'
        }

        newLine = line.replace(new RegExp((regexEpression.Before != null ? regexEpression.Before : '') + toReplaceWithRegex + (regexEpression.After != null ? regexEpression.After : ''), regExGlobalRules), replaceBy)

        if (newLine != newLinePrev) {
          line = newLine
          lineUpdated = true
          updated = true
        }
      }
      if (lineUpdated)
        updatedFileContent += newLine + "\n"
      if (!lineUpdated)
        updatedFileContent += line + "\n"
    })


    if (updated) {
      arrayFileLines = this.createOrUpdatefile(arrayFileLines, updatedFileContent, filePath, replaceObject)
    }
    return arrayFileLines
  }

  createOrUpdatefile(arrayFileLines: any, updatedFileContent: any, filePath: any, replaceObject: any) {
    arrayFileLines = updatedFileContent.toString().split("\n");
    this.fs.writeFileSync(filePath, updatedFileContent)
    console.log('Updated ' + filePath)//+ ' with content :\n' + updatedFileContent)

    return arrayFileLines


  }

  async deleteOldDataModelReferency() {
    const jsonDataModelToMigrate = this.fs.readFileSync(this.dataModelFolder + '/' + this.dataModelFiles)
    const jsonConfig = JSON.parse(jsonDataModelToMigrate)
    const objectToDelete = jsonConfig.objectToDelete
    const customFileNameList = this.glob.sync('./*/*')

    this.deleteFileeOrFolder(customFileNameList, objectToDelete)


  }
  async deleteFileeOrFolder(customFileNameList: any, objectToDelete: any) {

    await Promise.all(customFileNameList.map(async (file: any) => {

      const self = this
      if (file.includes(objectToDelete.prefixe)) {

        this.fs.unlink(file, function (err: any) {
          if (err) throw err;
          // if no error, file has been deleted successfully
          console.log('deleted file :' + file);
        });
        this.rimraf(file, function (err: any) {
          if (err) throw err;
          // if no error, file has been deleted successfully
          console.log('deleted folder :' + file);
        });

      } else if (!file.match(/\.[0-9a-z]+$/i)) {
        const customFileNameList = this.glob.sync(file + '/*')
        this.deleteFileeOrFolder(customFileNameList, objectToDelete)
      } else if (file.match(/\.field-meta\.xml+$/i)) {
        //Create a new file to migrate the lookup field
        const data = this.fs.readFileSync(file);
        const parser = new this.xml2js.Parser();
        parser.parseString(data, function (err2, fileXmlContent) {
          if (fileXmlContent) {
            for (let i = 0; i < Object.keys(fileXmlContent).length; i++) {
              const eltKey = Object.keys(fileXmlContent)[i]
              if (fileXmlContent[eltKey].referenceTo && fileXmlContent[eltKey].referenceTo[0] && fileXmlContent[eltKey].referenceTo[0].includes(objectToDelete.prefixe)) {
                self.fs.unlink(file, function (err: any) {
                  if (err) throw err;
                  // if no error, file has been deleted successfully
                  console.log('deleted file :' + file);
                });
                break
              }


            };
          }
        })

      }
      else if (file.match(/\.layout-meta\.xml+$/i)) {
        const data = this.fs.readFileSync(file);
        const parser = new this.xml2js.Parser();

        parser.parseString(data, function (err2, fileXmlContent) {
          if (fileXmlContent["Layout"]["layoutSections"]) {
            for (let i = 0; i < fileXmlContent["Layout"]["layoutSections"].length; i++) {
              const layoutSections = fileXmlContent["Layout"]["layoutSections"][i]
              if (layoutSections["layoutColumns"]) {
                for (let j = 0; j < layoutSections["layoutColumns"].length; j++) {
                  if (layoutSections["layoutColumns"][j]["layoutItems"]) {
                    for (let k = 0; k < layoutSections["layoutColumns"][j]["layoutItems"].length; k++) {
                      if (layoutSections["layoutColumns"][j]["layoutItems"][k]["field"] && (layoutSections["layoutColumns"][j]["layoutItems"][k]["field"][0].includes(objectToDelete.prefixe) || layoutSections["layoutColumns"][j]["layoutItems"][k]["field"][0].includes('FinancialAccount__c'))) {
                        self.fs.unlink(file, function (err: any) {
                          if (err) throw err;
                          // if no error, file has been deleted successfully
                          console.log('deleted file :' + file);
                        });
                      }
                    }

                  }
                }

              }
            }
          }
          if (fileXmlContent["Layout"]["platformActionList"]) {
            for (let i = 0; i < fileXmlContent["Layout"]["platformActionList"].length; i++) {
              const platformActionList = fileXmlContent["Layout"]["platformActionList"][i]
              if (platformActionList["platformActionListItems"]) {
                for (let k = 0; k < platformActionList["platformActionListItems"].length; k++) {
                  if (platformActionList["platformActionListItems"][k]["actionName"] && platformActionList["platformActionListItems"][k]["actionName"][0].includes(objectToDelete.prefixe)) {
                    self.fs.unlink(file, function (err: any) {
                      if (err) throw err;
                      // if no error, file has been deleted successfully
                      console.log('deleted file :' + file);
                    });
                  }
                }

              }
            }

          }

        })

      }

    }))
  }

}