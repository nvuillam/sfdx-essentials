import Command, { flags } from '@oclif/command';
import * as cliProgress from 'cli-progress';
import * as fs from 'fs';
import * as glob from 'glob';
import EssentialsUtils = require('../../common/essentials-utils');

export default class ExecuteUncomment extends Command {
  public static description = '';

  public static examples = [];

  public static flags = {
    folder: flags.string({ char: 'f', description: 'SFDX project folder containing files' }),
    uncommentKey: flags.string({ char: 'k', description: 'Uncomment key (default: SFDX_ESSENTIALS_UNCOMMENT)' }),
    verbose: flags.boolean({ char: 'v', description: 'Verbose' }) as unknown as flags.IOptionFlag<boolean>
  };

  public static args = [];

  // Input param properties
  public folder = '.';
  public uncommentKey = 'SFDX_ESSENTIALS_UNCOMMENT';
  public verbose: boolean = false;

  // Internal properties
  public totalUncomments = 0;
  public progressBar: any;

  // Runtime methods
  public async run() {
    const elapseStart = Date.now();

    // args
    // tslint:disable-next-line:no-shadowed-variable
    const { flags } = this.parse(ExecuteUncomment);

    this.folder = flags.folder || '.';
    this.uncommentKey = flags.uncommentKey || 'SFDX_ESSENTIALS_UNCOMMENT';
    if (flags.verbose) {
      this.verbose = true;
    }

    console.log('Starting sfdx essentials:uncomment with uncomment key "' + this.uncommentKey + '"');

    // List apex classes
    const fetchClassesExpression = this.folder + '/classes/*.cls';
    const customApexClassFileNameList = glob.sync(fetchClassesExpression);

    // List aura items
    const fetchAuraExpression = this.folder + '/aura/**/*.js';
    const customAuraFileNameList = glob.sync(fetchAuraExpression);

    // Progress bar
    // @ts-ignore
    this.progressBar = new cliProgress.SingleBar({
      format: '{name} [{bar}] {percentage}% | {value}/{total} | {file} ',
      stopOnComplete: true
    });
    if (this.progressBar.terminal.isTTY()) {
      this.progressBar.start(customApexClassFileNameList.length + customAuraFileNameList.length, 0, { name: 'Progress', file: 'N/A' });
    }

    // Replace commented lines in each class
    customApexClassFileNameList.forEach(customApexClassFileName => {
      this.processFile(customApexClassFileName);
      if (!this.verbose && this.progressBar.terminal.isTTY()) {
        this.progressBar.increment();
      }
    });

    // Replace commented lines in each aura item
    customAuraFileNameList.forEach(customAuraFileName => {
      this.processFile(customAuraFileName);
      if (!this.verbose && this.progressBar.terminal.isTTY()) {
        this.progressBar.increment();
      }
    });

    if (!this.verbose && this.progressBar.terminal.isTTY()) {
      // @ts-ignore
      this.progressBar.update(null, { file: 'Completed in ' + EssentialsUtils.formatSecs(Math.round((Date.now() - elapseStart) / 1000)) });
      this.progressBar.stop();
    }

    console.log('Total uncomments: ' + this.totalUncomments);

  }

  // Process component file
  public processFile(fileName) {
    // Read file
    const fileContent = fs.readFileSync(fileName);
    if (fileContent == null) {
      if (this.verbose) {
        console.log('Warning: empty file -> ' + fileName);
      }
      return;
    }
    const arrayFileLines = fileContent.toString().split('\n');

    // Process file lines one by one
    let updated = false;
    let updatedFileContent = '';
    arrayFileLines.forEach(line => {
      // Uncomment if SFDX_ESSENTIALS_UNCOMMENT is contained in a commented line (can be overriden sending uncommentKey argument)
      if (line.includes(this.uncommentKey)) {
        line = line.replace('//', '').replace(this.uncommentKey, '// ' + this.uncommentKey + ' uncommented by sfdx essentials:uncomment (https://github.com/nvuillam/sfdx-essentials)');
        if (this.verbose) {
          console.log('- uncommented: ' + line);
        }
        this.totalUncomments++;
        updated = true;
      }
      updatedFileContent += line + '\n';
    });
    // Update file if content has been updated
    if (updated) {
      fs.writeFileSync(fileName, updatedFileContent);
      if (this.verbose) {
        console.log('Updated ' + fileName); // + ' with content :\n' + updatedFileContent)
      } else {
        this.progressBar.update(null, { file: fileName });
      }
    }
  }

}
