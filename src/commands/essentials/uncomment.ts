import { Command, flags } from '@oclif/command';
import { FILE } from 'dns';

export default class ExecuteFilter extends Command {
  public static description = '';

  public static examples = [];

  public static flags = {
    folder: flags.string({ char: 'f', description: 'SFDX project folder containing files' }),
    uncommentKey: flags.string({ char: 'k', description: 'Uncomment key (default: SFDX_ESSENTIALS_UNCOMMENT)' })
    // flag with a value (-n, --name=VALUE)
  };

  public static args = [];

  // global variables
  public folder = '.';
  public uncommentKey = 'SFDX_ESSENTIALS_UNCOMMENT';
  public totalUncomments = 0;

  // Internal properties
  public fs = require('fs');
  public glob = require('glob');
  public cint = require('cint');

  // Runtime methods
  public async run() {

    // args
    // tslint:disable-next-line:no-shadowed-variable
    const { args, flags } = this.parse(ExecuteFilter);

    this.folder = flags.folder || '.';
    this.uncommentKey = flags.uncommentKey || 'SFDX_ESSENTIALS_UNCOMMENT';

    console.log('Starting sfdx essentials:uncomment with uncomment key "' + this.uncommentKey + '"');

    // List apex classes
    const fetchClassesExpression = this.folder + '/classes/*.cls';
    console.log('Fetching classes with expression : ' + fetchClassesExpression);
    const customApexClassFileNameList = this.glob.sync(fetchClassesExpression);

    // Replace commented lines in each class
    customApexClassFileNameList.forEach((customApexClassFileName) => {
      this.processFile(customApexClassFileName);
    });
    console.log('Completed uncomment in : ' + fetchClassesExpression);

    // List aura items
    const fetchAuraExpression = this.folder + '/aura/**/*.js';
    console.log('Fetching aura with expression : ' + fetchAuraExpression);
    const customAuraFileNameList = this.glob.sync(fetchAuraExpression);

    // Replace commented lines in each aura item
    customAuraFileNameList.forEach((customAuraFileName) => {
      this.processFile(customAuraFileName);
    });
    console.log('Completed uncomment in : ' + fetchAuraExpression);

  }

  // Process component file
  public processFile(fileName) {
    // Read file
    const fileContent = this.fs.readFileSync(fileName);
    if (fileContent == null) {
      console.log('Warning: empty file -> ' + fileName);
      return;
    }
    const arrayFileLines = fileContent.toString().split('\n');

    // Process file lines one by one
    let updated = false;
    let updatedFileContent = '';
    arrayFileLines.forEach((line) => {
      // Uncomment if SFDX_ESSENTIALS_UNCOMMENT is contained in a commented line (can be overriden sending uncommentKey argument)
      if (line.includes(this.uncommentKey)) {
        line = line.replace('//', '').replace(this.uncommentKey, '// ' + this.uncommentKey + ' uncommented by sfdx essentials:uncomment (https://github.com/nvuillam/sfdx-essentials)');
        console.log('- uncommented: ' + line);
        updated = true;
      }
      updatedFileContent += line + '\n';
    });
    // Update file if content has been updated
    if (updated) {
      this.fs.writeFileSync(fileName, updatedFileContent);
      console.log('Updated ' + fileName); // + ' with content :\n' + updatedFileContent)
    }

  }

}
