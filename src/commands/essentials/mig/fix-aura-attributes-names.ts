import { Command, flags } from '@oclif/command';

export default class FixAuraAttributeNames extends Command {
  public static aliases = ['essentials:fix-lightning-attribute-names'];

  public static description = '';

  public static examples = [];

  public static flags = {
    folder: flags.string({ char: 'f', description: 'SFDX project folder containing files' })
    // flag with a value (-n, --name=VALUE)
  };

  public static args = [];

  // global variables
  public reservedAttributeNames = {};
  public reservedAttributeNamesUsed = {};
  public folder = '.';
  public totalReplacements = 0;

  // Internal properties
  public fs = require('fs');
  // fse = require('fs-extra')
  // xml2js = require('xml2js')
  public glob = require('glob');
  public cint = require('cint');
  public camelCase = require('camelcase');

  // Runtime methods
  public async run() {

    // tslint:disable-next-line:no-shadowed-variable
    const { flags } = this.parse(FixAuraAttributeNames);

    this.folder = flags.folder || '.';

    // Add list of custom class names in reserved variables
    const fetchClassesExpression = this.folder + '/classes/*.cls';
    console.log('Fetching classes with expression : ' + fetchClassesExpression);
    const customApexClassFileNameList = this.glob.sync(fetchClassesExpression);
    const customApexClassList = [];
    customApexClassFileNameList.forEach(customApexClassFileName => {
      customApexClassList.push(this.cint.after(customApexClassFileName, '/classes/').replace('.cls', ''));
    });
    console.log('Custom apex class names :' + JSON.stringify(customApexClassList, null, 2));
    customApexClassList.forEach(customApexClass => {
      this.reservedAttributeNames[customApexClass] = {
        type: 'apexClass',
        numberReplacements: 0,
        numberReplacementsCmp: 0,
        numberReplacementsJs: 0,
        numberReplacementsApex: 0
      };
    });

    // Add list of objects names in reserved variables
    const fetchObjectsExpression = this.folder + '/objects/*';
    console.log('Fetching objects with expression : ' + fetchObjectsExpression);
    const objectsFolderNameList = this.glob.sync(fetchObjectsExpression);
    const objectNameList = [];
    objectsFolderNameList.forEach(objectFolderName => {
      objectNameList.push(this.cint.after(objectFolderName, '/objects/'));
    });
    console.log('objects names :' + JSON.stringify(objectNameList, null, 2));
    objectNameList.forEach(objectName => {
      this.reservedAttributeNames[objectName] = {
        type: 'object',
        numberReplacements: 0,
        numberReplacementsCmp: 0,
        numberReplacementsJs: 0,
        numberReplacementsApex: 0
      };
    });

    // Build replacement names for each reserved attribute name
    const self = this;
    Object.keys(this.reservedAttributeNames).forEach(reservedAttributeName => {
      const reservedAttributeNameReplacement = this.camelCase(reservedAttributeName);
      self.reservedAttributeNames[reservedAttributeName].replacement = reservedAttributeNameReplacement;
    });
    console.log('Attributes replacements :\n' + JSON.stringify(self.reservedAttributeNames, null, 2));

    ////////// Process replacements

    // Process replacements on components
    const fetchCmpExpression = this.folder + '/aura/*';
    console.log('Fetching components with expression : ' + fetchCmpExpression);
    const customComponentFolderList = this.glob.sync(fetchCmpExpression);
    console.log('Component files: ' + JSON.stringify(customComponentFolderList, null, 2));
    const replacementPromisesCmp = [];
    customComponentFolderList.forEach(customComponentFolder => {
      replacementPromisesCmp.push(new Promise((resolve, reject) => {
        // Get file name
        const tokenLs = customComponentFolder.split('/');
        const filePart = tokenLs[tokenLs.length - 1];
        // Replace in .cmp, .app & .evt files (send function as parameter)
        self.processFile(customComponentFolder, filePart, ['.cmp', '.app', '.evt'], self.replaceAttributeNamesInCmp).then(() => {
          // Replace in component controller (send function as parameter)
          return self.processFile(customComponentFolder, filePart, ['Controller.js'], self.replaceAttributeNamesInJs);
        }).then(() => {
          // Replace in component helper javascript (send function as parameter)
          return self.processFile(customComponentFolder, filePart, ['Helper.js'], self.replaceAttributeNamesInJs);
        }).then(() => {
          resolve();
        }).catch(err => {
          console.log('Replacement promise error: ' + err);
          resolve();
        });
      }));
    });

    Promise.all(replacementPromisesCmp).then(() => {
      // Process replacements on apex classes
      const replacementPromisesApex = [];
      Object.keys(self.reservedAttributeNames).forEach(reservedAttributeName => {
        // Check if there has been replacements in lightning components
        if (self.reservedAttributeNames[reservedAttributeName].type === 'apexClass') {
          replacementPromisesApex.push(new Promise((resolve, reject) => {
            // Replace in apex class files (.cls) (send function as parameter)
            self.processFile(self.folder + '/classes', reservedAttributeName, ['.cls'], self.replaceAttributeNamesInApex)
              .then(() => {
                resolve();
              }).catch(err => {
                console.log('Replacement promise error: ' + err);
                reject();
              });
          }));
        }
      });

      // Log summary
      Promise.all(replacementPromisesApex).then(() => {
        Object.keys(self.reservedAttributeNames).forEach(reservedAttributeName => {
          if (self.reservedAttributeNames[reservedAttributeName].numberReplacements > 0) {
            self.reservedAttributeNamesUsed[reservedAttributeName] = self.reservedAttributeNames[reservedAttributeName];
          }
        });
        console.log('Attributes replacements results :\n' + JSON.stringify(self.reservedAttributeNamesUsed, null, 2));
        console.log('Total replacements :' + self.totalReplacements);
      }).catch(err => {
        console.log('Promises error: ' + err);
      });
    });
  }

  // Process component file
  public processFile(customComponentFolder, filePart, extensions, replaceFunction) {
    const self = this;
    return new Promise((resolve, reject) => {
      // Find file
      let filePath = null;
      extensions.forEach(extension => {
        const filePathTest = customComponentFolder + '/' + filePart + extension;
        if (filePath == null && self.fs.existsSync(filePathTest)) {
          filePath = filePathTest;
        }
      });
      if (filePath == null) {
        resolve();
        return;
      }

      // Read file
      const fileContent = self.fs.readFileSync(filePath);
      if (fileContent == null) {
        console.log('Warning: empty file -> ' + filePath);
        resolve();
        return;
      }
      const arrayFileLines = fileContent.toString().split('\n');

      // Process file lines one by one
      let updated = false;
      let updatedFileContent = '';
      arrayFileLines.forEach(line => {
        const newLine = replaceFunction.call(self, line, filePart); // (clone line var to be able to compare later)
        updatedFileContent += newLine + '\n';
        if (updated === false && newLine !== line) {
          updated = true;
        }
      });
      if (updated) {
        self.fs.writeFileSync(filePath, updatedFileContent);
        console.log('Updated ' + filePath); // + ' with content :\n' + updatedFileContent)
      }
      resolve(); // Resolve promise so then is called
    });
  }

  // Replace attribute names in component ( xml )
  public replaceAttributeNamesInCmp(xmlLine, _itemName) {
    const self = this;
    Object.keys(this.reservedAttributeNames).forEach(reservedAttributeName => {
      // aura:attribute name
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `name="${reservedAttributeName}"`, `name="${self.reservedAttributeNames[reservedAttributeName].replacement}"`, 'cmp');
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `name= "${reservedAttributeName}"`, `name="${self.reservedAttributeNames[reservedAttributeName].replacement}"`, 'cmp');
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `name ="${reservedAttributeName}"`, `name="${self.reservedAttributeNames[reservedAttributeName].replacement}"`, 'cmp');
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `name = "${reservedAttributeName}"`, `name="${self.reservedAttributeNames[reservedAttributeName].replacement}"`, 'cmp');
      // calling attribute ( in another component )
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, ` ${reservedAttributeName}="`, ` ${self.reservedAttributeNames[reservedAttributeName].replacement}="`, 'cmp');
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, ` ${reservedAttributeName} ="`, ` ${self.reservedAttributeNames[reservedAttributeName].replacement}="`, 'cmp');
      // reference in aura expression
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `v.${reservedAttributeName} `, `v.${self.reservedAttributeNames[reservedAttributeName].replacement} `, 'cmp');
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `v.${reservedAttributeName}.`, `v.${self.reservedAttributeNames[reservedAttributeName].replacement}.`, 'cmp');
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `v.${reservedAttributeName}=`, `v.${self.reservedAttributeNames[reservedAttributeName].replacement}=`, 'cmp');
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `v.${reservedAttributeName}.`, `v.${self.reservedAttributeNames[reservedAttributeName].replacement}.`, 'cmp');
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `v.${reservedAttributeName}}`, `v.${self.reservedAttributeNames[reservedAttributeName].replacement}}`, 'cmp');
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `v.${reservedAttributeName})`, `v.${self.reservedAttributeNames[reservedAttributeName].replacement})`, 'cmp');
      // special cases
      if (xmlLine.includes('<aura:set attribute="caseInputDataAttributes"')) {
        xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `"${reservedAttributeName},`, `"${self.reservedAttributeNames[reservedAttributeName].replacement},`, 'cmp');
        xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `"${reservedAttributeName}"`, `"${self.reservedAttributeNames[reservedAttributeName].replacement}"`, 'cmp');
        xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `,${reservedAttributeName}"`, `,${self.reservedAttributeNames[reservedAttributeName].replacement}"`, 'cmp');
        xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `,${reservedAttributeName},`, `,${self.reservedAttributeNames[reservedAttributeName].replacement},`, 'cmp');
      }
      xmlLine = self.replaceExpression(xmlLine, reservedAttributeName, `v._attributeContainingPackages == '${reservedAttributeName}'`, `v._attributeContainingPackages == '${self.reservedAttributeNames[reservedAttributeName].replacement}'`, 'cmp');

    });
    return xmlLine;
  }

  // Replace attribute names in javascript file
  public replaceAttributeNamesInJs(jsLine, _itemName) {
    const self = this;
    Object.keys(this.reservedAttributeNames).forEach(reservedAttributeName => {
      // Attribute name
      jsLine = self.replaceExpression(jsLine, reservedAttributeName, `'v.${reservedAttributeName}'`, `'v.${self.reservedAttributeNames[reservedAttributeName].replacement}'`, 'js');
      jsLine = self.replaceExpression(jsLine, reservedAttributeName, `"v.${reservedAttributeName}"`, `"v.${self.reservedAttributeNames[reservedAttributeName].replacement}"`, 'js');
      jsLine = self.replaceExpression(jsLine, reservedAttributeName, `v.${reservedAttributeName}.`, `v.${self.reservedAttributeNames[reservedAttributeName].replacement}.`, 'js');
      jsLine = self.replaceExpression(jsLine, reservedAttributeName, `'${reservedAttributeName}' :`, `'${self.reservedAttributeNames[reservedAttributeName].replacement}' :`, 'js');

      // special cases
      jsLine = self.replaceExpression(jsLine, reservedAttributeName, `InputData.${reservedAttributeName}`, `InputData.${self.reservedAttributeNames[reservedAttributeName].replacement}`, 'js');
      jsLine = self.replaceExpression(jsLine, reservedAttributeName, `attributeContainingPackages = '${reservedAttributeName}'`, `attributeContainingPackages = '${self.reservedAttributeNames[reservedAttributeName].replacement}'`, 'js');
      jsLine = self.replaceExpression(jsLine, reservedAttributeName, `attributeContainingPackages = '${reservedAttributeName}'`, `attributeContainingPackages = '${self.reservedAttributeNames[reservedAttributeName].replacement}'`, 'js');
      jsLine = self.replaceExpression(jsLine, reservedAttributeName, `v._attributeContainingPackages') == '${reservedAttributeName}'`, `v._attributeContainingPackages') == '${self.reservedAttributeNames[reservedAttributeName].replacement}'`, 'js');
      jsLine = self.replaceExpression(jsLine, reservedAttributeName, `getOutputData('${reservedAttributeName}'`, `getOutputData('${self.reservedAttributeNames[reservedAttributeName].replacement}'`, 'js');
      jsLine = self.replaceExpression(jsLine, reservedAttributeName, `ComponentParams.${reservedAttributeName}`, `ComponentParams.${self.reservedAttributeNames[reservedAttributeName].replacement}`, 'js');
      jsLine = self.replaceExpression(jsLine, reservedAttributeName, `ContextComponentReturnParams.${reservedAttributeName}`, `ContextComponentReturnParams.${self.reservedAttributeNames[reservedAttributeName].replacement}`, 'js');

    });
    return jsLine;
  }

  // Replace attribute names in javascript file
  public replaceAttributeNamesInApex(apexLine, itemName) {
    const self = this;
    Object.keys(this.reservedAttributeNames).forEach(reservedAttributeName => {
      if (!apexLine.includes(`getGlobalDescribe().get('${reservedAttributeName}'`) &&
        !apexLine.includes(`objectReference.get('${reservedAttributeName}'`)) {
        // get & put in maps
        apexLine = self.replaceExpression(apexLine, reservedAttributeName, `.get('${reservedAttributeName}'`, `.get('${self.reservedAttributeNames[reservedAttributeName].replacement}'`, 'apex');
        apexLine = self.replaceExpression(apexLine, reservedAttributeName, `.put('${reservedAttributeName}'`, `.put('${self.reservedAttributeNames[reservedAttributeName].replacement}'`, 'apex');

        // Special cases

        // Attribute name ( with ugly JSON.deserialize)
        if (itemName.endsWith('_m') || ['CaseTestQuoteContractRPINDMock', 'WsAiaContractParsing'].includes(itemName)) {
          // skip deserialize cleaning if we are in these cases: too dangerous ^^
        } else if (itemName.startsWith('CaseProcess')) {
          apexLine = self.replaceExpression(apexLine, reservedAttributeName, `JSON.deserialize(JSON.serialize(InputData.get('${reservedAttributeName}')),`, `this.getCaseInputData('${self.reservedAttributeNames[reservedAttributeName].replacement}',`, 'apex'); // Take advantage of this script to replace dirty code ^^
          apexLine = self.replaceExpression(apexLine, reservedAttributeName, `JSON.deserialize(UtilsApex.serializeObject(InputData.get('${reservedAttributeName}')),`, `this.getCaseInputData('${self.reservedAttributeNames[reservedAttributeName].replacement}',`, 'apex'); // Take advantage of this script to replace dirty code ^^
        } else {
          apexLine = self.replaceExpression(apexLine, reservedAttributeName, `JSON.deserialize(JSON.serialize(InputData.get('${reservedAttributeName}')),`, `BackEndRequestM.getCaseInputData('${self.reservedAttributeNames[reservedAttributeName].replacement}',`, 'apex'); // Take advantage of this script to replace dirty code ^^
          apexLine = self.replaceExpression(apexLine, reservedAttributeName, `JSON.deserialize(UtilsApex.serializeObject(InputData.get('${reservedAttributeName}')),`, `BackEndRequestM.getCaseInputData('${self.reservedAttributeNames[reservedAttributeName].replacement}',`, 'apex'); // Take advantage of this script to replace dirty code ^^
        }

        apexLine = self.replaceExpression(apexLine, reservedAttributeName, `getCaseInputData('${reservedAttributeName}'`, `getCaseInputData('${self.reservedAttributeNames[reservedAttributeName].replacement}'`, 'apex');
        apexLine = self.replaceExpression(apexLine, reservedAttributeName, `setCaseInputData('${reservedAttributeName}'`, `setCaseInputData('${self.reservedAttributeNames[reservedAttributeName].replacement}'`, 'apex');
        apexLine = self.replaceExpression(apexLine, reservedAttributeName, `getCaseOutputData('${reservedAttributeName}'`, `getCaseOutputData('${self.reservedAttributeNames[reservedAttributeName].replacement}'`, 'apex');
        apexLine = self.replaceExpression(apexLine, reservedAttributeName, `setCaseOutputData('${reservedAttributeName}'`, `setCaseOutputData('${self.reservedAttributeNames[reservedAttributeName].replacement}'`, 'apex');
        apexLine = self.replaceExpression(apexLine, reservedAttributeName, `getInputData('${reservedAttributeName}'`, `getInputData('${self.reservedAttributeNames[reservedAttributeName].replacement}'`, 'apex');
        apexLine = self.replaceExpression(apexLine, reservedAttributeName, `setInputData('${reservedAttributeName}'`, `setInputData('${self.reservedAttributeNames[reservedAttributeName].replacement}'`, 'apex');
        apexLine = self.replaceExpression(apexLine, reservedAttributeName, `getOutputData('${reservedAttributeName}'`, `getOutputData('${self.reservedAttributeNames[reservedAttributeName].replacement}'`, 'apex');
        apexLine = self.replaceExpression(apexLine, reservedAttributeName, `setOutputData('${reservedAttributeName}'`, `setOutputData('${self.reservedAttributeNames[reservedAttributeName].replacement}'`, 'apex');

      }
    });
    return apexLine;
  }

  // Replace expression in given line
  public replaceExpression(line, reservedAttributeName, expressionToReplace, replacement, typeX) {
    if (line.includes(expressionToReplace)) {
      console.log('- found: ' + expressionToReplace + ' in ' + line);
      line = line.replace(expressionToReplace, replacement);
      console.log('-- replaced by: ' + line);
      this.reservedAttributeNames[reservedAttributeName].numberReplacements = this.reservedAttributeNames[reservedAttributeName].numberReplacements + 1;
      this.totalReplacements = this.totalReplacements + 1;
      if (typeX === 'cmp') {
        this.reservedAttributeNames[reservedAttributeName].numberReplacementsCmp = this.reservedAttributeNames[reservedAttributeName].numberReplacementsCmp + 1;
      } else if (typeX === 'js') {
        this.reservedAttributeNames[reservedAttributeName].numberReplacementsJs = this.reservedAttributeNames[reservedAttributeName].numberReplacementsJs + 1;
      } else if (typeX === 'apex') {
        this.reservedAttributeNames[reservedAttributeName].numberReplacementsApex = this.reservedAttributeNames[reservedAttributeName].numberReplacementsApex + 1;
      }

    }
    return line;
  }

}
