import { Command, flags } from '@oclif/command';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as xml2js from 'xml2js';
import * as util from 'util';
import * as cliProgress from 'cli-progress';
import EssentialsUtils = require('../../common/essentials-utils');
import metadataUtils = require('../../common/metadata-utils');

export default class ExecuteFilterMetadatas extends Command {
  public static description = '';

  public static examples = [];

  public static flags = {
    // flag with a value (-n, --name=VALUE)
    packagexml: flags.string({ char: 'p', description: 'package.xml file path' }),
    inputfolder: flags.string({ char: 'i', description: 'Input folder (default: "." )' }),
    outputfolder: flags.string({ char: 'o', description: 'Output folder (default: filteredMetadatas)' }),
    verbose: flags.boolean({ char: 'v', description: 'Verbose' }) as unknown as flags.IOptionFlag<boolean>
  };

  public static args = [];

  // Input params properties
  public packageXmlFile: string;
  public inputFolder: string;
  public outputFolder: string;
  public verbose: boolean = false;

  // Internal properties
  public packageXmlMetadatasTypeLs = [];
  public sobjectCollectedInfo = {};
  public translatedLanguageList = [];
  public summaryResult = { metadataTypes: {}, objects: [], objectsTranslations: [] };
  public multibar: any;
  public multibars: any = {};

  // Runtime methods
  public async run() {
    const elapseStart = Date.now();
    // tslint:disable-next-line:no-shadowed-variable
    const { args, flags } = this.parse(ExecuteFilterMetadatas);

    // Get input arguments or default values
    this.packageXmlFile = flags.packagexml;
    this.inputFolder = flags.inputfolder || '.';
    this.outputFolder = flags.outputfolder || 'filteredMetadatas';
    if (flags.verbose) {
      this.verbose = true;
    }
    this.log(`Initialize filtering of ${this.inputFolder} ,using ${this.packageXmlFile} , into ${this.outputFolder}`);
    if (!this.verbose) {
      // @ts-ignore
      this.multibar = new cliProgress.MultiBar({
        clearOnComplete: false,
        fps: 500,
        format: '{name} [{bar}] {percentage}% | {value}/{total} | {file} '
      }, cliProgress.Presets.shades_grey);
      this.multibars.total = this.multibar.create(3, 0, { name: 'Total'.padEnd(30, ' '), file: 'N/A' });
      this.multibars.initialize = this.multibar.create(1, 0, { name: 'Initialize'.padEnd(30, ' '), file: 'N/A' });
      this.multibars.filterMetadatasByType = this.multibar.create(1, 0, { name: 'Filter metadatas by type'.padEnd(30, ' '), file: 'N/A' });
      this.multibars.copyImpactedObjects = this.multibar.create(1, 0, { name: 'Copy impacted objects'.padEnd(30, ' '), file: 'N/A' });
    }

    // Read package.xml file
    // @ts-ignore
    const interval = EssentialsUtils.multibarStartProgress(this.multibars, 'initialize', this.multibar, 'Initializing');
    const processPromise = new Promise((resolve, reject) => {
      const parser = new xml2js.Parser();
      fs.readFile(this.packageXmlFile, async (err, data) => {
        parser.parseString(data, async (err2, result) => {
          this.logIfVerbose('Parsed package.xml \n' + util.inspect(result, false, null));

          // get metadata types in parse result
          try { this.packageXmlMetadatasTypeLs = result.Package.types; } catch { throw new Error('Unable to parse packageXml file ' + this.packageXmlFile); }

          // Create output folder/empty it if existing
          if (fs.existsSync(this.outputFolder)) {
            this.logIfVerbose('Empty target directory');
            fse.emptyDirSync(this.outputFolder);
          } else {
            fs.mkdirSync(this.outputFolder);
          }

          // Copy package.xml file in output folder
          fse.copySync(this.packageXmlFile, this.outputFolder + '/package.xml');

          if (!this.verbose) {
            // @ts-ignore
            this.multibars.initialize.update(null, { file: 'Completed in ' + EssentialsUtils.formatSecs(Math.round((Date.now() - elapseStart) / 1000)) });
            // @ts-ignore
            EssentialsUtils.multibarStopProgress(interval);
            this.multibars.initialize.increment();
            this.multibars.total.increment();
            this.multibar.update();
          }

          // Process source folder filtering and copy files into target folder
          await this.filterMetadatasByType();
          await this.copyImpactedObjects();
          resolve();
        });
      });

    });
    await processPromise;
    if (!this.verbose) {
      // @ts-ignore
      this.multibars.total.update(null, { file: 'Completed in ' + EssentialsUtils.formatSecs(Math.round((Date.now() - elapseStart) / 1000)) });
      this.multibar.update();
      this.multibar.stop();
    }
    this.displayResults();
  }

  // Filter metadatas by type
  public async filterMetadatasByType() {
    const elapseStart = Date.now();
    if (!this.verbose) {
      this.multibars.total.update(null, { file: 'Filter metadatas by type' });
      this.multibars.filterMetadatasByType.setTotal(this.packageXmlMetadatasTypeLs.length);
      this.multibar.update();
    }
    for (const metadataDefinition of this.packageXmlMetadatasTypeLs) {
      if (!this.verbose) {
        this.multibars.filterMetadatasByType.update(null, { file: metadataDefinition.name });
        this.multibar.update();
      }
      const metadataType = metadataDefinition.name;
      const members = metadataDefinition.members;

      this.summaryResult.metadataTypes[metadataType] = { nbCopied: 0 };
      // Get metadata description
      const metadataDesc = this.getMetadataTypeDescription(metadataType);
      if (metadataDesc == null) {
        if (!this.verbose) {
          this.multibars.filterMetadatasByType.increment();
          this.multibar.update();
        }
        continue;
      }
      // Simply copy files
      if (metadataDesc.folder != null) {
        await this.copyMetadataFiles(metadataDesc, metadataType, members);
      }

      // Collect for .object & .objectTranslation filtering
      if (metadataDesc.sobjectRelated === true) {
        this.collectObjectDescription(metadataType, members);
      }

      // Collect for translation filtering
      if (metadataDesc.translationRelated === true) {
        this.collectTranslationDescription(metadataType, members);
      }

      // Collect custom labels
      if (metadataType === 'CustomLabel') {
        this.collectAndFilterCustomLabels(metadataDesc, metadataType, members);
      }

      if (!this.verbose) {
        this.multibars.filterMetadatasByType.increment();
        this.multibar.update();
      }
    }
    if (!this.verbose) {
      this.multibars.total.increment();
      // @ts-ignore
      this.multibars.filterMetadatasByType.update(null, { file: 'Completed in ' + EssentialsUtils.formatSecs(Math.round((Date.now() - elapseStart) / 1000)) });
      this.multibar.update();
    }
  }

  public async copyMetadataFiles(metadataDesc, metadataType, members) {
    // Browse folder for matching files and copy them into target folder
    const typeInputFolder = this.inputFolder + '/' + metadataDesc.folder;
    this.logIfVerbose(`- processing ${metadataType}`);
    if (fs.existsSync(typeInputFolder)) {
      const typeOutputFolder = this.outputFolder + '/' + metadataDesc.folder;
      if (members != null && members[0] === '*') {
        // Wildcard: copy whole folder
        fse.copySync(typeInputFolder, typeOutputFolder);
      } else {
        // Create member folder in output folder
        fs.mkdirSync(typeOutputFolder);
        // Iterate all metadata types members (ApexClass,ApexComponent,etc...)
        members.forEach((member) => {
          // Iterate all possible extensions ( '' for same file/folder name, '.cls' for ApexClass, etc ...)
          metadataDesc.nameSuffixList.forEach((nameSuffix) => {
            // If input file/folder exists, copy it in output folder
            const sourceFile = typeInputFolder + '/' + member + nameSuffix;
            if (fs.existsSync(sourceFile)) {
              const copyTargetFile = typeOutputFolder + '/' + member + nameSuffix;
              fse.copySync(sourceFile, copyTargetFile);
              // Increment counter only when file is not meta-xml
              if (!sourceFile.endsWith('meta-xml')) {
                this.summaryResult.metadataTypes[metadataType]['nbCopied']++;
              }
            }
          });
        });

      }
    }
  }

  // Special case of SObjects: collect references to them in MetadataTypes
  public collectObjectDescription(metadataType, members) {
    this.logIfVerbose(`- collecting ${metadataType}`);
    if (members == null) {
      this.logIfVerbose(`-- Warning: no ${metadataType} in package.xml`);
      return;
    }
    members.forEach((member) => {
      const sobjectName = member.split('.')[0];
      const sobjectInfo = this.sobjectCollectedInfo[sobjectName] || {};
      if (metadataType !== 'CustomObject' && member.split('.')[1] != null) {
        const sobjectInfoMetadataTypeList = sobjectInfo[metadataType] || [];
        sobjectInfoMetadataTypeList.push(member.split('.')[1]);
        sobjectInfo[metadataType] = sobjectInfoMetadataTypeList;
      }
      this.sobjectCollectedInfo[sobjectName] = sobjectInfo;
    });
  }

  // Special case of SObjects: collect references to them in MetadataTypes
  public collectTranslationDescription(metadataType, members) {
    this.logIfVerbose(`- collecting ${metadataType}`);
    if (members == null) {
      this.logIfVerbose(`-- Warning: no ${metadataType} in package.xml`);
      return;
    }
    members.forEach((member) => {
      this.translatedLanguageList.push(member);
    });
    this.logIfVerbose('- collected language list:' + this.translatedLanguageList.toString());
  }

  // special case for custom labels
  public collectAndFilterCustomLabels(metadataDesc, metadataType, members) {
    this.logIfVerbose('- processing custom labels:');
    const typeInputFolder = this.inputFolder + '/' + metadataDesc.folder;
    if (fs.existsSync(typeInputFolder)) {
      const typeOutputFolder = this.outputFolder + '/' + metadataDesc.folder;
      const allLabels = typeInputFolder + '/CustomLabels.labels';
      const copyTargetFile = typeOutputFolder + '/CustomLabels.labels';
      fse.copySync(allLabels, copyTargetFile);
      const parser = new xml2js.Parser();
      const data = fs.readFileSync(copyTargetFile);
      parser.parseString(data, function (err2, parsedObjectFile) {

        if (members != null && members[0] === '*') {
          this.logIfVerbose('-- including all labels ');
        } else {
          let pos = 0;
          parsedObjectFile['CustomLabels']['labels'].forEach(function (itemDscrptn) {
            let itemName = itemDscrptn['fullName'];
            if (Array.isArray(itemName)) {
              itemName = itemName[0];
            }
            if (members.includes(itemName)) {
              this.logIfVerbose(`---- removed ${itemName} `);
              delete parsedObjectFile['CustomLabels']['labels'][pos];
            } else {
              this.logIfVerbose(`-- kept ${itemName} `);
            }
            pos++;
          });
        }

        // Write output .labels file
        const builder = new xml2js.Builder();
        const updatedObjectXml = builder.buildObject(parsedObjectFile);
        const outputObjectFileName = typeOutputFolder + '/CustomLabels.labels';
        fs.writeFileSync(outputObjectFileName, updatedObjectXml);
      });
    }
  }

  // get Metadatype description
  public getMetadataTypeDescription(mdType) {
    // @ts-ignore
    const desc = metadataUtils.describeMetadataTypes()[mdType];
    return desc;
  }

  // Copy objects based on information gathered with 'sobjectRelated' metadatas
  public async copyImpactedObjects() {
    const elapseStart = Date.now();
    if (!this.verbose) {
      this.multibars.total.update(null, { file: 'Copy impacted objects' });
      this.multibar.update();
      this.multibars.copyImpactedObjects.setTotal(Object.keys(this.sobjectCollectedInfo).length);
    }
    // Create objects folder
    fs.mkdirSync(this.outputFolder + '/objects/');
    // Create objectTranslations folder if necessary
    if (this.translatedLanguageList.length > 0) {
      fs.mkdirSync(this.outputFolder + '/objectTranslations/');
    }

    // Process all SObjects
    const objectPromises = [];

    Object.keys(this.sobjectCollectedInfo).forEach((objectName) => {
      const objectPromise = new Promise((resolve, reject) => {
        if (!this.verbose) {
          this.multibars.copyImpactedObjects.update(null, { file: objectName });
          this.multibar.update();
        }
        this.logIfVerbose('- processing SObject ' + objectName);
        const objectContentToKeep = this.sobjectCollectedInfo[objectName];

        // Read .object file
        const inputObjectFileName = this.inputFolder + '/objects/' + objectName + '.object';
        if (!fs.existsSync(inputObjectFileName)) {
          if (!this.verbose) {
            this.multibars.copyImpactedObjects.increment();
            this.multibar.update();
          }
          resolve();
          return;
        }
        const parser = new xml2js.Parser();
        const data = fs.readFileSync(inputObjectFileName);
        parser.parseString(data, (err2, parsedObjectFile) => {
          // Filter .object file to keep only items referenced in package.xml ( and collected during filterMetadatasByType)
          if (objectContentToKeep == null) {
            this.logIfVerbose('-- no filtering for ' + objectName);
          } else {
            parsedObjectFile = this.filterSObjectFile(parsedObjectFile, objectName, objectContentToKeep);
          }

          // Write output .object file
          const builder = new xml2js.Builder();
          const updatedObjectXml = builder.buildObject(parsedObjectFile);
          const outputObjectFileName = this.outputFolder + '/objects/' + objectName + '.object';
          fs.writeFileSync(outputObjectFileName, updatedObjectXml);
        });
        this.summaryResult.objects.push(objectName);

        // Manage objectTranslations
        if (this.translatedLanguageList.length > 0) {
          this.logIfVerbose('- processing SObject translation for ' + objectName);
          this.translatedLanguageList.forEach((translationCode) => {
            const inputObjectTranslationFileName = this.inputFolder + '/objectTranslations/' + objectName + '-' + translationCode + '.objectTranslation';
            // Check objectTranslation file exists for this language
            if (!fs.existsSync(inputObjectTranslationFileName)) {
              return;
            }
            // Read .objectTranslation file
            const parserTr = new xml2js.Parser();
            const dataTr = fs.readFileSync(inputObjectTranslationFileName);
            parserTr.parseString(dataTr, (err2, parsedObjectFileTr) => {
              // Filter .objectTranslation file to keep only items referenced in package.xml ( and collected during filterMetadatasByType)
              if (objectContentToKeep == null) {
                this.logIfVerbose('-- no filtering for ' + objectName);
              } else {
                parsedObjectFileTr = this.filterSObjectTranslationFile(parsedObjectFileTr, objectName, objectContentToKeep);
              }

              // Write output .objectTranslation file
              const builderTrx = new xml2js.Builder();
              const updatedObjectXmlTr = builderTrx.buildObject(parsedObjectFileTr);
              const outputObjectFileNameTr = this.outputFolder + '/objectTranslations/' + objectName + '-' + translationCode + '.objectTranslation';
              fs.writeFileSync(outputObjectFileNameTr, updatedObjectXmlTr);
            });
            this.summaryResult.objectsTranslations.push(objectName + '-' + translationCode);
          });

        }
        if (!this.verbose) {
          this.multibars.copyImpactedObjects.increment();
          this.multibar.update();
        }
        resolve();
      });
      objectPromises.push(objectPromise);
    });
    await Promise.all(objectPromises);
    if (!this.verbose) {
      this.multibars.total.increment();
      // @ts-ignore
      this.multibars.copyImpactedObjects.update(null, { file: 'Completed in ' + EssentialsUtils.formatSecs(Math.round((Date.now() - elapseStart) / 1000)) });
      this.multibar.update();
    }
    this.summaryResult.objects.sort();
  }

  // Filter output XML of .object file
  public filterSObjectFile(parsedObjectFile, objectName, objectContentToKeep) {
    // @ts-ignore
    const objectFilteringProperties = metadataUtils.describeObjectProperties();
    objectFilteringProperties.forEach((objectFilterProp) => {
      // Filter fields
      const objectXmlPropName = objectFilterProp['objectXmlPropName'];
      const packageXmlPropName = objectFilterProp['packageXmlPropName'];
      const nameProperty = objectFilterProp['nameProperty'];
      if (parsedObjectFile['CustomObject'][objectXmlPropName] != null) {

        const compareList: string[] = objectContentToKeep[packageXmlPropName] || [];
        if (parsedObjectFile['CustomObject'][objectXmlPropName] == null) {
          this.logIfVerbose('/!\ WARNING: can not filter ' + objectXmlPropName + ' : not found');
        } else {
          let pos = 0;
          parsedObjectFile['CustomObject'][objectXmlPropName].forEach((itemDscrptn) => {
            const itemName = itemDscrptn[nameProperty];
            if (itemName.filter((element: string) => compareList.includes(element)).length === 0) {
              this.logIfVerbose(`---- removed ${packageXmlPropName} ` + itemDscrptn[nameProperty]);
              delete parsedObjectFile['CustomObject'][objectXmlPropName][pos];
            } else {
              this.logIfVerbose(`-- kept ${packageXmlPropName} ` + itemDscrptn[nameProperty]);
            }
            pos++;
          });
        }
      }
    });

    return parsedObjectFile;
  }

  // Filter output XML of .object file
  public filterSObjectTranslationFile(parsedObjectFile, objectName, objectContentToKeep) {
    // @ts-ignore
    const objectFilteringProperties = metadataUtils.describeObjectProperties();
    objectFilteringProperties.forEach((objectFilterProp) => {
      // Filter fields,layouts,businessProcesses, listView,WebLink
      const objectXmlPropName = objectFilterProp['objectXmlPropName'];
      const packageXmlPropName = objectFilterProp['packageXmlPropName'];
      const nameProperty = objectFilterProp['translationNameProperty'];
      if (parsedObjectFile['CustomObjectTranslation'][objectXmlPropName] != null) {

        const compareList: string[] = objectContentToKeep[packageXmlPropName] || [];
        if (parsedObjectFile['CustomObjectTranslation'][objectXmlPropName] == null) {
          this.logIfVerbose('/!\ can not filter translation ' + objectXmlPropName + ' : not found');
        } else {
          let pos = 0;
          parsedObjectFile['CustomObjectTranslation'][objectXmlPropName].forEach((itemDscrptn) => {
            const itemName = itemDscrptn[nameProperty];
            if (itemName.filter((element: string) => compareList.includes(element)).length === 0) {
              this.logIfVerbose(`---- removed translation ${packageXmlPropName} ` + itemDscrptn[nameProperty]);
              delete parsedObjectFile['CustomObjectTranslation'][objectXmlPropName][pos];
            } else {
              this.logIfVerbose(`-- kept translation ${packageXmlPropName} ` + itemDscrptn[nameProperty]);
            }
            pos++;
          });
        }
      }
    });

    return parsedObjectFile;
  }

  // Display results as JSON
  public displayResults() {
    console.log('\n' + JSON.stringify(this.summaryResult));
  }

  public logIfVerbose(content: string) {
    if (this.verbose) {
      console.log(content);
    }
  }

}
