import { Command, flags } from '@oclif/command';
import * as cliProgress from 'cli-progress';
import * as fs from 'fs';
import * as fsExtra from 'fs-extra';
import * as glob from 'glob';
import * as rimraf from 'rimraf';
import * as xml2js from 'xml2js';
import { EssentialsUtils } from '../../../common/essentials-utils';
import { MetadataUtils } from '../../../common/metadata-utils';

export default class MigrateObjectModel extends Command {
  public static aliases = ['essentials:migrate-object-model'];

  public static description = `Migrate sources from an object model to a new object model (See [Example configuration](https://github.com/nvuillam/sfdx-essentials/blob/master/examples/migrate-object-model-config.json))

Use this command if you need to replace a SObject by another one in all your sfdx sources`;

  public static examples = [
    '$ sfdx essentials:mig:migrate-object-model -c "./config/migrate-object-model-config.json"',
    '$ sfdx essentials:mig:migrate-object-model -c migration/config-to-oem.json -i Config/packageXml --fetchExpressionList "./package*.xml" --no-deleteFiles --no-deleteFilesExpr --no-copySfdxProjectFolder'
  ];

  public static flags = {
    // flag with a value (-n, --name=VALUE)
    configFile: flags.string({ char: 'c', description: 'JSON config file' }),
    inputFolder: flags.string({ char: 'i', description: 'Input folder (default: "." )' }),
    fetchExpressionList: flags.string({ char: 'f', description: 'Fetch expression list. Let default if you dont know. ex: /aura/**/*.js,./aura/**/*.cmp,./classes/*.cls,./objects/*/fields/*.xml,./objects/*/recordTypes/*.xml,./triggers/*.trigger,./permissionsets/*.xml,./profiles/*.xml,./staticresources/*.json' }),
    replaceExpressions: flags.boolean({ char: 'r', description: 'Replace expressions using fetchExpressionList', default: true, allowNo: true }) as unknown as flags.IOptionFlag<boolean>,
    deleteFiles: flags.boolean({ char: 'd', description: 'Delete files with deprecated references', default: true, allowNo: true }) as unknown as flags.IOptionFlag<boolean>,
    deleteFilesExpr: flags.boolean({ char: 'k', description: 'Delete files matching expression', default: true, allowNo: true }) as unknown as flags.IOptionFlag<boolean>,
    copySfdxProjectFolder: flags.boolean({ char: 's', description: 'Copy sfdx project files after process', default: true, allowNo: true }) as unknown as flags.IOptionFlag<boolean>,
    verbose: flags.boolean({ char: 'v', description: 'Verbose', default: false }) as unknown as flags.IOptionFlag<boolean>
  };

  public static args = [];

  // Input params properties
  public configFile: string;
  public inputFolder: string;
  public fetchExpressionList: string[] = [
    './aura/**/*.js',
    './aura/**/*.cmp',
    './classes/*.cls',
    './objects/*/fields/*.xml',
    './objects/*/recordTypes/*.xml',
    './objectTranslations/*/*.xml',
    './triggers/*.trigger',
    './permissionsets/*.xml',
    './profiles/*.xml',
    './staticresources/*.json'
  ];
  public replaceExpressions: boolean = true;
  public deleteFiles: boolean = true;
  public deleteFilesExpr: boolean = true;
  public copySfdxProjectFolder: boolean = true;
  public verbose: boolean = false;

  // Internal props
  public configData: any;
  public multibar: any;
  public multibars: any = {};

  // Runtime methods
  public async run() {

    const elapseStart = Date.now();
    // tslint:disable-next-line:no-shadowed-variable
    const { flags } = this.parse(MigrateObjectModel);

    this.inputFolder = flags.inputFolder || '.';
    this.configFile = flags.configFile;
    this.replaceExpressions = flags.replaceExpressions;
    this.deleteFilesExpr = flags.deleteFilesExpr;
    this.deleteFiles = flags.deleteFiles;
    this.copySfdxProjectFolder = flags.copySfdxProjectFolder;
    this.verbose = flags.verbose;

    if (flags.fetchExpressionList) {
      this.fetchExpressionList = flags.fetchExpressionList.split(',');
    } else if (flags.fetchExpressionList === '') {
      this.fetchExpressionList = [];
    }

    // Read config file and store it in class variable
    const jsonDataModelToMigrate = fs.readFileSync(this.configFile);
    this.configData = JSON.parse(jsonDataModelToMigrate.toString());

    //////////////////////////////////////
    /////// Build progress bars //////////
    //////////////////////////////////////
    // @ts-ignore
    this.multibar = new cliProgress.MultiBar({
      clearOnComplete: false,
      hideCursor: true,
      fps: 500,
      format: '{name} [{bar}] {percentage}% | {value}/{total} | {file} '
    }, cliProgress.Presets.shades_grey);
    this.multibars.total = this.multibar.create(0, 0, { name: 'Total'.padEnd(30, ' '), file: 'N/A' });

    if (!this.multibar.terminal.isTTY()) {
      throw new Error('This script is a one-time script so it has been made to run on a local terminal only');
    }

    // Expression list progress bars
    if (this.replaceExpressions) {
      if (this.multibar.terminal.isTTY()) {
        this.multibars.total.setTotal(this.multibars.total.getTotal() + this.fetchExpressionList.length);
      }
      this.fetchExpressionList.forEach((fetchExpression: string) => {
        const customFileNameList = glob.sync(this.inputFolder + '/' + fetchExpression);
        if (this.multibar.terminal.isTTY()) {
          this.multibars[fetchExpression] = this.multibar.create(customFileNameList.length, 0, { name: fetchExpression.padEnd(30, ' '), file: 'N/A' });
        }
      });
    }
    // Delete files progress bar
    if (this.deleteFiles && this.configData.objectToDelete && this.multibar.terminal.isTTY()) {
      this.multibars.deleteFiles = this.multibar.create(1, 0, { name: 'Delete deprecated referencies'.padEnd(30, ' '), file: 'N/A' });
      this.multibars.total.setTotal(this.multibars.total.getTotal() + 1);
    }

    // Delete files expressions bar
    if (this.deleteFilesExpr && this.configData.objectToDelete && this.configData.objectToDelete.fetchExpressionList) {
      this.multibars.deleteFilesExpr = this.multibar.create(1, 0, { name: 'Delete files by expressions'.padEnd(30, ' '), file: 'N/A' });
      this.multibars.total.setTotal(this.multibars.total.getTotal() + 1);
    }

    // Copy sfdx folder progress bar
    if (this.copySfdxProjectFolder && this.configData.sfdxProjectFolder && this.multibar.terminal.isTTY()) {
      this.multibars.sfdxProjectFolder = this.multibar.create(1, 0, { name: 'Copy SFDX Project'.padEnd(30, ' '), file: 'N/A' });
      this.multibars.total.setTotal(this.multibars.total.getTotal() + 1);
    }

    /////////////////////////////////////////
    /////// Execute script actions //////////
    /////////////////////////////////////////

    // Iterate on each expression to browse files
    if (this.replaceExpressions) {
      for (const fetchExpression of this.fetchExpressionList) {
        const fetchExprStartTime = Date.now();
        // Get all files matching expression
        const customFileNameList = glob.sync(this.inputFolder + '/' + fetchExpression);

        // Process file
        for (const customFileName of customFileNameList) {
          if (this.multibar.terminal.isTTY()) {
            this.multibars[fetchExpression].update(null, { file: customFileName });
            this.multibar.update();
          }
          if (fetchExpression.includes('objects') && fetchExpression.includes('fields')) {
            //  dataModel file to read
            const objectsToMigrate = this.configData.objects;
            // create a new lookup fields which match with the new object
            await this.processFileXmlFields(customFileName, objectsToMigrate);
          } else {
            const replaceList = this.getObjectAndFieldToReplace(fetchExpression);

            // Replace in .cmp, .app & .evt files (send function as parameter)
            await this.processFileApexJsCmp(customFileName, replaceList);
          }
          if (this.multibar.terminal.isTTY()) {
            this.multibars[fetchExpression].increment();
            this.multibar.update();
          }
        }
        // progress bar update
        if (this.multibar.terminal.isTTY()) {
          // @ts-ignore
          this.multibars[fetchExpression].update(null, { file: 'Completed in ' + EssentialsUtils.formatSecs(Math.round((Date.now() - fetchExprStartTime) / 1000)) });
          this.multibars.total.increment();
          this.multibar.update();
        }
      }
    }

    // Delete Old data model content
    if (this.deleteFiles) {
      await this.deleteOldDataModelReferency();
    }

    if (this.deleteFilesExpr && this.configData.objectToDelete && this.configData.objectToDelete.fetchExpressionList) {
      await this.deleteFetchExpressionMatchingFiles();
    }
    // If defined, copy manually updated sfdx project ( including new object model )
    if (this.copySfdxProjectFolder) {
      await this.copySfdxProjectManualItems();
    }

    // Complete progress bars if necessary
    if (this.multibar.terminal.isTTY()) {
      // @ts-ignore
      this.multibars.total.update(null, { file: 'Completed in ' + EssentialsUtils.formatSecs(Math.round((Date.now() - elapseStart) / 1000)) });
      this.multibars.total.stop();
      this.multibar.update();
      this.multibar.stop();
    }
  }

  // Process component file
  public async processFileApexJsCmp(customComponentFolder: any, replaceList: any) {
    // Find file
    let filePath = null;

    const filePathTest = customComponentFolder;
    if (filePath == null && fs.existsSync(filePathTest)) {
      filePath = filePathTest;
    }
    if (filePath == null) {
      return;
    }

    // Read file
    const fileContent = fs.readFileSync(filePath);
    if (fileContent == null) {
      console.log('Warning: empty file -> ' + filePath);
      return;
    }
    let arrayFileLines = fileContent.toString().split('\n');
    const initialArrayFileLines = arrayFileLines;

    // Process file lines one by one
    //  dataModel file to read
    const regexEpression: any = [];
    if (this.configData && this.configData.globalConfig) {
      regexEpression.Before = this.configData.globalConfig.regexEpressionBeforeElement;
      regexEpression.After = this.configData.globalConfig.regexEpressionAfterElement;
    }
    if (replaceList) {

      const extensionElement = filePath.split('.')[filePath.split('.').length - 1];
      let className = filePath.split('/')[filePath.split('/').length - 1];
      className = className.substring(0, className.indexOf('.' + extensionElement));

      for (const rep of replaceList) {
        const toReplace = rep[0];
        const replaceBy = rep[1];
        const caseSensitive = rep[2];

        let excludeList: any[];
        let includeList: any[];
        let replace: boolean = true;

        // Create the exclude and include element list for specific object or field
        if (rep[3] && rep[3].exclude && rep[3].exclude[extensionElement] !== undefined) {
          excludeList = rep[3].exclude[extensionElement];
        } else if (rep[3] && rep[3].include && rep[3].include[extensionElement] !== undefined) {
          includeList = rep[3].include[extensionElement];
        }
        if (excludeList) {
          replace = true;
          for (let excludeItem of excludeList) {
            if (excludeItem === className) {
              replace = false;
              break;
            } else if (excludeItem.endsWith('%') && className.toUpperCase().startsWith(excludeItem.substring(0, excludeItem.indexOf('%')).toUpperCase())) {
              replace = false;
              if (rep[3].exceptionExclude) {

                const exceptionExluceList = rep[3].exceptionExclude;
                for (let exceptionExluce of exceptionExluceList) {
                  if (className === exceptionExluce) {
                    replace = true;
                  }
                }
              }
              break;
            }
          }
          if (replace) {
            arrayFileLines = await this.readAndReplace(arrayFileLines, caseSensitive, toReplace, replaceBy, rep[4], regexEpression);
          }
        } else if (includeList) {
          // if includelist exist but empty that means no element should be replace
          if (includeList.length !== 0) {
            for (const includeItem of includeList) {
              if (includeItem === className) {
                replace = true;
              } else if (includeItem.endsWith('%') && className.toUpperCase().startsWith(includeItem.substring(0, includeItem.indexOf('%')).toUpperCase())) {
                replace = true;
              } else {
                replace = false;
              }
              if (replace) {
                arrayFileLines = await this.readAndReplace(arrayFileLines, caseSensitive, toReplace, replaceBy, rep[4], regexEpression);
              }
            }
          }
        } else {
          arrayFileLines = await this.readAndReplace(arrayFileLines, caseSensitive, toReplace, replaceBy, rep[4], regexEpression);
        }
      }
    }
    // Write new version of the file if updated
    if (initialArrayFileLines !== arrayFileLines) {
      await this.createOrUpdatefile(arrayFileLines, filePath);
    }
  }

  public async processFileXmlFields(xmlFile: any, replaceField: any) {
    const parser = new xml2js.Parser();
    const builder = new xml2js.Builder();

    // Create a new file to migrate the lookup field
    const data = fs.readFileSync(xmlFile);
    parser.parseString(data, async (err2, fileXmlContent) => {
      if (fileXmlContent) {
        for (const eltKey of Object.keys(fileXmlContent)) {
          // tslint:disable-next-line:prefer-for-of
          for (let i = 0; i < replaceField.length; i++) {
            if (fileXmlContent[eltKey].referenceTo && fileXmlContent[eltKey].referenceTo[0] && fileXmlContent[eltKey].referenceTo[0] === replaceField[i].previousObject) {
              fileXmlContent[eltKey].referenceTo[0] = replaceField[i].newObject;
              fileXmlContent[eltKey].label[0] = replaceField[i].newLabel;
              fileXmlContent[eltKey].fullName[0] = replaceField[i].newObject;

              fileXmlContent[eltKey].relationshipName[0] = fileXmlContent[eltKey].relationshipName[0].replace('_', '');

              xmlFile = xmlFile.substring(0, xmlFile.indexOf('fields')) + 'fields/' + replaceField[i].newObject + '.field-meta.xml';
              try {
                const updatedObjectXml = builder.buildObject(fileXmlContent);
                fs.writeFileSync(xmlFile, updatedObjectXml);
              } catch (e) {
                // Commented : error must have been manually managed in sfdxProjectFiles
                /*  console.error(e.message);
                  console.error(xmlFile);
                  console.error(fileXmlContent); */
              }
              break;
            }
          }
        }
      }
    });
  }

  // add specific caracter around the field/object we need to replace
  public getObjectAndFieldToReplace(fetchExpression: string) {
    //  dataModel file to read
    const objectsToMigrate = this.configData.objects;

    const replaceList: any[] = [];

    // Default replacement list for object
    let aroundCharReplaceObjectList = MetadataUtils.getAroundCharsObjectReplacementList();

    // Complete aroundCharReplaceList with json config (replae by name value , or append if name not found)
    if (this.configData.globalConfig && this.configData.globalConfig.aroundCharReplaceObjectListOverride) {
      aroundCharReplaceObjectList = this.aroundCharReplaceList(aroundCharReplaceObjectList, this.configData.globalConfig.aroundCharReplaceObjectListOverride, fetchExpression);
    }

    // Default replacement list for object
    let aroundCharReplacefieldList = MetadataUtils.getAroundCharsFieldReplacementList();

    // Complete aroundCharReplaceList with json config (replae by name value , or append if name not found)
    if (this.configData.globalConfig && this.configData.globalConfig.aroundCharReplaceFieldListOverride) {
      aroundCharReplacefieldList = this.aroundCharReplaceList(aroundCharReplacefieldList,
        this.configData.globalConfig.aroundCharReplaceFieldListOverride,
        fetchExpression);
    }

    objectsToMigrate.forEach((object: any) => {

      aroundCharReplaceObjectList.forEach(aroundChars => {
        let oldString: string;
        if (!aroundChars.after.includes('$')) {
          oldString = '\\' + aroundChars.before + object.previousObject + '\\' + aroundChars.after;
        } else {
          oldString = '\\' + aroundChars.before + object.previousObject + aroundChars.after;
        }
        let newString = aroundChars.before + object.newObject;

        if (aroundChars.after !== '$') {
          newString += aroundChars.after;
        }
        if (aroundChars.replacementPrefix) {
          newString = aroundChars.replacementPrefix + newString;
        }
        if (aroundChars.replacementSuffix) {
          newString += aroundChars.replacementSuffix;
        }
        let replaceObject: any;
        replaceObject = [oldString, newString, object.caseSensitive, { exclude: object.exclude, include: object.include }, { oldObject: object.previousObject, newObject: object.newObject }];

        // Add exclude exception if need (exemple : exclude = className% exception = classeNameException)
        if (object.exclude && object.exclude.exceptionList) {
          replaceObject[3].exceptionExclude = object.exclude.exceptionList;
        }
        if (object.include && object.include.exceptionList) {
          replaceObject[3].exceptionInclude = object.include.exceptionList;
        }

        replaceList.push(replaceObject);
      });

      if (object.fieldsMapping) {
        object.fieldsMapping.forEach(fieldToChange => {

          aroundCharReplacefieldList.forEach(aroundChars => {
            let oldString;
            if (!aroundChars.after.includes('$')) {
              oldString = '\\' + aroundChars.before + fieldToChange.previousField + '\\' + aroundChars.after;
            } else {
              oldString = '\\' + aroundChars.before + fieldToChange.previousField + aroundChars.after;
            }
            let newString = aroundChars.before + fieldToChange.newField;

            if (aroundChars.after !== '$') {
              newString += aroundChars.after;
            }
            if (aroundChars.replacementPrefix) {
              newString = aroundChars.replacementPrefix + newString;
            }
            if (aroundChars.replacementSuffix) {
              newString += aroundChars.replacementSuffix;
            }

            let replacefield: any;
            replacefield = [oldString, newString, fieldToChange.caseSensitive, { exclude: fieldToChange.exclude, include: fieldToChange.include }];

            // Add include exception if need (exemple : include = className% exception = classeNameException)
            if (fieldToChange.exclude && fieldToChange.exclude.exceptionList) {
              replacefield[3].exceptionExclude = fieldToChange.exclude.exceptionList;
            }
            if (fieldToChange.include && fieldToChange.include.exceptionList) {
              replacefield[3].exceptionInclude = fieldToChange.include.exceptionList;
            }
            replaceList.push(replacefield);
          });
        });
      }
    });
    return replaceList;
  }

  // add element to the list
  public aroundCharReplaceList(aroundCharReplaceObjectList: any, aroundCharReplaceListOverride: any, fetchExpression: string) {
    aroundCharReplaceListOverride.forEach((aroundCharsOverride: any) => {
      let replaced: boolean = false;
      aroundCharReplaceObjectList.forEach((aroundChars: any, i: number) => {
        if (aroundChars.name === aroundCharsOverride.name) {
          replaced = true;
          if (!aroundCharsOverride.affecteditems || (aroundCharsOverride.affecteditems && fetchExpression.endsWith(aroundCharsOverride.affecteditems))) {
            aroundCharReplaceObjectList[i] = aroundCharsOverride;
          }
        }
      });
      if (!replaced) {
        aroundCharReplaceObjectList.push(aroundCharsOverride);
      }
    });
    return aroundCharReplaceObjectList;
  }

  public async readAndReplace(arrayFileLines: any, caseSensitive: boolean, toReplace: string, replaceBy: string, replaceObject: any, regexEpression: any) {
    // console.log('processing ' + filePath + ' ' + toReplace + ' ' + replaceBy)
    const toReplaceWithRegex: string = toReplace;

    const arrayFileLinesNew: string[] = [];

    arrayFileLines.forEach((line: string) => {
      let regExGlobalRules: string = 'g';
      if (!line.trim().startsWith('//')) { // Do not convert commented lines
        if (!caseSensitive) {
          regExGlobalRules += 'i';
        }
        line = line.replace(new RegExp((regexEpression.Before != null ? regexEpression.Before : '') + toReplaceWithRegex + (regexEpression.After != null ? regexEpression.After : ''), regExGlobalRules), replaceBy);
      }
      arrayFileLinesNew.push(line);
    });
    return arrayFileLinesNew;
  }

  public async createOrUpdatefile(arrayFileLines: any, filePath: any) {
    const updatedFileContent: string = arrayFileLines.join('\n');
    fs.writeFileSync(filePath, updatedFileContent);
    // + ' with content :\n' + updatedFileContent)
    return arrayFileLines;
  }

  // Delete referencies to old data model
  public async deleteOldDataModelReferency() {
    const objectToDelete = this.configData.objectToDelete;

    if (objectToDelete) {
      const elapseStart = Date.now();

      const customFileNameList = glob.sync('./*/*');
      let interval;
      if (this.multibar.terminal.isTTY()) {
        this.multibars.deleteFiles.setTotal(customFileNameList.length);
        // @ts-ignore
        interval = EssentialsUtils.multibarStartProgress(this.multibars, 'deleteFiles', this.multibar, 'Deleting files');
      }
      // Delete old model references
      await this.deleteFileOrFolder(customFileNameList, objectToDelete, true);

      if (this.multibar.terminal.isTTY()) {
        // @ts-ignore
        EssentialsUtils.multibarStopProgress(interval);
        // @ts-ignore
        this.multibars.deleteFiles.update(null, { file: 'Completed in ' + EssentialsUtils.formatSecs(Math.round((Date.now() - elapseStart) / 1000)) });
        this.multibars.total.increment();
      }
    }
  }
  // Delete matching files defined in config file
  public async deleteFetchExpressionMatchingFiles() {
    const objectToDelete = this.configData.objectToDelete;
    const elapseStart = Date.now();

    let interval;
    if (this.multibar.terminal.isTTY()) {
      this.multibars.deleteFilesExpr.setTotal(objectToDelete.fetchExpressionList.length);
      // @ts-ignore
      interval = EssentialsUtils.multibarStartProgress(this.multibars, 'deleteFilesExpr', this.multibar, 'Deleting files');
    }

    for (const fetchExpression of objectToDelete.fetchExpressionList) {
      // Get all files matching expression
      const customFileNameList1 = glob.sync(this.inputFolder + '/' + fetchExpression);
      for (const file of customFileNameList1) {
        fsExtra.remove(file, (err: any) => {
          if (err) { throw err; }
          // if no error, file has been deleted successfully
          // console.log('deleted file :' + file);
        });
        rimraf(file, (err: any) => {
          if (err) { throw err; }
          // if no error, file has been deleted successfully
          // console.log('deleted folder :' + file);
        });
      }
      this.multibars.deleteFilesExpr.increment();
      this.multibar.update();
    }

    if (this.multibar.terminal.isTTY()) {
      // @ts-ignore
      EssentialsUtils.multibarStopProgress(interval);
      // @ts-ignore
      this.multibars.deleteFilesExpr.update(null, { file: 'Completed in ' + EssentialsUtils.formatSecs(Math.round((Date.now() - elapseStart) / 1000)) });
      this.multibars.total.increment();
    }
  }

  public async deleteFileOrFolder(customFileNameList: any, objectToDelete: any, increment = false) {
    for (const file of customFileNameList) {
      if (increment && this.multibar.terminal.isTTY()) {
        this.multibars.deleteFiles.increment();
        this.multibar.update();
      }
      if (file.includes(objectToDelete.prefixe)) {

        fsExtra.remove(file, (err: any) => {
          if (err) { throw err; }
          // if no error, file has been deleted successfully
          // console.log('deleted file :' + file);
        });
        rimraf(file, (err: any) => {
          if (err) { throw err; }
          // if no error, file has been deleted successfully
          // console.log('deleted folder :' + file);
        });

      } else if (!file.match(/\.[0-9a-z]+$/i)) {
        const customFileNameList2 = glob.sync(file + '/*');
        await this.deleteFileOrFolder(customFileNameList2, objectToDelete);
      } else if (file.match(/\.field-meta\.xml+$/i)) {
        // Create a new file to migrate the lookup field
        const data = fs.readFileSync(file);
        const parser = new xml2js.Parser();
        parser.parseString(data, (err2, fileXmlContent) => {
          if (fileXmlContent) {
            // tslint:disable-next-line:prefer-for-of
            for (let i = 0; i < Object.keys(fileXmlContent).length; i++) {
              const eltKey = Object.keys(fileXmlContent)[i];
              if (fileXmlContent[eltKey].referenceTo && fileXmlContent[eltKey].referenceTo[0] && fileXmlContent[eltKey].referenceTo[0].includes(objectToDelete.prefixe)) {
                if (fs.existsSync(file)) {
                  fsExtra.remove(file, (err: any) => {
                    if (err) { throw err; }
                    // if no error, file has been deleted successfully
                    // console.log('deleted file :' + file);
                  });
                  break;
                }
              }

            }
          }
        });

      } else if (file.match(/\.layout-meta\.xml+$/i)) {
        const data = fs.readFileSync(file);
        const parser = new xml2js.Parser();

        parser.parseString(data, (err2, fileXmlContent) => {
          if (fileXmlContent['Layout']['layoutSections']) {
            // tslint:disable-next-line:prefer-for-of
            for (let i = 0; i < fileXmlContent['Layout']['layoutSections'].length; i++) {
              const layoutSections = fileXmlContent['Layout']['layoutSections'][i];
              if (layoutSections['layoutColumns']) {
                // tslint:disable-next-line:prefer-for-of
                for (let j = 0; j < layoutSections['layoutColumns'].length; j++) {
                  if (layoutSections['layoutColumns'][j]['layoutItems']) {
                    // tslint:disable-next-line:prefer-for-of
                    for (let k = 0; k < layoutSections['layoutColumns'][j]['layoutItems'].length; k++) {
                      if (layoutSections['layoutColumns'][j]['layoutItems'][k]['field'] && (layoutSections['layoutColumns'][j]['layoutItems'][k]['field'][0].includes(objectToDelete.prefixe) || layoutSections['layoutColumns'][j]['layoutItems'][k]['field'][0].includes('FinancialAccount__c'))) {
                        if (fs.existsSync(file)) {
                          fsExtra.remove(file, (err: any) => {
                            if (err) { throw err; }
                            // if no error, file has been deleted successfully
                            // console.log('deleted file :' + file);
                          });
                        }
                      }
                    }

                  }
                }

              }
            }
          }
          if (fileXmlContent['Layout']['platformActionList']) {
            // tslint:disable-next-line:prefer-for-of
            for (let i = 0; i < fileXmlContent['Layout']['platformActionList'].length; i++) {
              const platformActionList = fileXmlContent['Layout']['platformActionList'][i];
              if (platformActionList['platformActionListItems']) {
                // tslint:disable-next-line:prefer-for-of
                for (let k = 0; k < platformActionList['platformActionListItems'].length; k++) {
                  if (platformActionList['platformActionListItems'][k]['actionName'] && platformActionList['platformActionListItems'][k]['actionName'][0].includes(objectToDelete.prefixe)) {
                    if (fs.existsSync(file)) {
                      fsExtra.remove(file, (err: any) => {
                        if (err) { throw err; }
                        // if no error, file has been deleted successfully
                        // console.log('deleted file :' + file);
                      });
                    }
                  }
                }
              }
            }
          }
        });
      }
    }
  }

  // Copy Sfdx project items
  public async copySfdxProjectManualItems() {
    const sfdxProjectFolder = this.configData.sfdxProjectFolder;
    if (sfdxProjectFolder) {
      const elapseStart = Date.now();
      let interval;
      if (this.multibar.terminal.isTTY()) {
        // @ts-ignore
        interval = EssentialsUtils.multibarStartProgress(this.multibars, 'sfdxProjectFolder', this.multibar, 'Copying files');
      }
      await fsExtra.copy(this.configData.sfdxProjectFolder, this.inputFolder);
      if (this.multibar.terminal.isTTY()) {
        // @ts-ignore
        EssentialsUtils.multibarStopProgress(interval);
        this.multibars.sfdxProjectFolder.increment();
        // @ts-ignore
        this.multibars.sfdxProjectFolder.update(null, { file: 'Completed in ' + EssentialsUtils.formatSecs(Math.round((Date.now() - elapseStart) / 1000)) });
        this.multibars.total.increment();
        this.multibar.update();
      }
    }
  }

}
