import { Command, flags } from '@oclif/command';
import * as cliProgress from 'cli-progress';
import * as fse from 'fs-extra';
import * as glob from 'glob';
import * as path from 'path';
import * as sloc from 'sloc';
import { EssentialsUtils } from '../../../common/essentials-utils';

export default class ProjectCountLines extends Command {
  public static aliases = ['essentials:count-apex-lines'];

  public static description = 'Allows to count lines of apex executable code related to filtered items';

  public static examples = [
    '$ sfdx essentials:project:count-apex-lines -f "./force-app/main/default"',
    '$ sfdx essentials:project:count-apex-lines -f "./force-app/main/default" -b "**/WsMockV*.cls"',
    '$ sfdx essentials:project:count-apex-lines -f "./force-app/main/default" -p "./packagexml/package1.xml"',
    '$ sfdx essentials:project:count-apex-lines -f "./force-app/main/default" -p "./packagexml/package1.xml" -e "(WsBlabla|POC_)"'
  ];

  // @ts-ignore
  public static flags = {
    // flag with a value (-n, --name=VALUE)
    folder: flags.string({ char: 'f', description: 'SFDX project folder containing files' }),
    packagexmls: flags.string({ char: 'p', description: 'package.xml files path (separated by commas)' }),
    browsingpattern: flags.string({ char: 'b', description: 'Files browsing pattern. Default **/*.cls' }),
    excludepattern: flags.string({ char: 'e', description: 'Regex to exclude patterns' }),
    verbose: flags.boolean({ char: 'v', description: 'Verbose' }) as unknown as flags.IOptionFlag<boolean>,
    noinsight: flags.boolean({ description: 'Do not send anonymous usage stats' }) as unknown as flags.IOptionFlag<boolean>
  };

  public static args = [];

  // Input params properties
  public folder: string;
  public packageXmlFiles: string[];
  public browsingPattern: string;
  public excludePattern: RegExp = null;
  public verbose: boolean = false;

  // Internal properties
  public progressBar: any;

  // Runtime methods
  public async run() {
    const elapseStart = Date.now();

    // tslint:disable-next-line:no-shadowed-variable
    const { flags } = this.parse(ProjectCountLines);

    // Get input arguments or default values
    this.folder = flags.folder || '.';
    this.packageXmlFiles = (flags.packagexmls || '').split(',');
    this.browsingPattern = flags.browsingpattern || '**/*.cls';
    if (flags.excludepattern) {
      this.excludePattern = new RegExp(flags.excludepattern);
    }
    if (flags.verbose) {
      this.verbose = true;
    }

    // Gather filters from package.xml files
    let pckgXmlApexClasses = [];
    if (this.packageXmlFiles.length > 0 && this.packageXmlFiles[0] !== '') {
      let allPackageXmlFilesTypes: any = await EssentialsUtils.appendPackageXmlFilesContent(this.packageXmlFiles, {
        ignoreDuplicateTypes: ['ApexClass']
      });
      console.assert(allPackageXmlFilesTypes.ApexClass && allPackageXmlFilesTypes.ApexClass.length > 0,
        'There is no Apex classes defined in sent package.xml files');
      pckgXmlApexClasses = allPackageXmlFilesTypes.ApexClass;
    }

    // Read files
    const fileList = glob.sync(this.folder + '/' + this.browsingPattern);

    // Progress bar
    // @ts-ignore
    this.progressBar = new cliProgress.SingleBar({
      format: '{name} [{bar}] {percentage}% | {value}/{total} | {file} ',
      stopOnComplete: true
    });
    if (!this.verbose && this.progressBar.terminal.isTTY()) {
      this.progressBar.start(fileList.length, 0, { name: 'Progress', file: 'N/A' });
    }

    // Count lines in files
    const stats = [];
    let sourceNb = 0;
    let fileNb = 0;
    for (const file of fileList) {
      if (!this.verbose && this.progressBar.terminal.isTTY()) {
        this.progressBar.increment();
        this.progressBar.update(null, { file });
      }
      const fileName = path.parse(file).name;
      if ((pckgXmlApexClasses.length > 0 && !pckgXmlApexClasses.includes(fileName))
        || fileName.toLowerCase().endsWith('test')
        || (this.excludePattern && this.excludePattern.test(fileName))) {
        if (this.verbose) {
          console.log(`Skipped file ${file}`);
        }
        continue;
      }
      const code = await fse.readFile(file, 'utf8');
      const fileSstats = sloc(code, 'java');
      fileSstats.file = file;
      fileNb++;
      sourceNb += fileSstats.source;
      stats.push(fileSstats);
    }

    if (this.verbose) {
      console.log(JSON.stringify(stats));
    }

    console.log('Processed files: \n' + stats.map(s => s.file + ' (' + s.source + ')').join('\n'));

    // Finalize
    if (!this.verbose && this.progressBar.terminal.isTTY()) {
      // @ts-ignore
      this.progressBar.update(null, { file: 'Completed in ' + EssentialsUtils.formatSecs(Math.round((Date.now() - elapseStart) / 1000)) });
      this.progressBar.stop();
    }
    console.log(`Number of files: ${fileNb}`);
    console.log(`Number of source lines (excluding comments): ${sourceNb}`);
    await this.config.runHook('essentials-analytics', this);
  }

}
