import { Command, flags } from '@oclif/command';
import * as cliProgress from 'cli-progress';
import * as fs from 'fs';
import * as glob from 'glob';
import * as xml2js from 'xml2js';
import { EssentialsUtils, writeXmlFile } from '../../../common/essentials-utils';

export default class ProjectChangeDependencyVersion extends Command {
  public static aliases = ['essentials:change-dependency-version', 'essentials:change-api-version', 'essentials:project:change-api-version'];

  public static description = `Allows to change an external package dependency version, or update api version

  Can also :

  - remove package dependencies if --namespace and --remove arguments are sent
  - update API version
   `;

  public static examples = [
    '$ sfdx essentials:project:change-dependency-version -n FinServ -j 214 -m 7',
    '$ sfdx essentials:project:change-dependency-version -n FinServ -r',
    '$ sfdx essentials:project:change-dependency-version -a 47.0'
  ];

  // @ts-ignore
  public static flags = {
    // flag with a value (-n, --name=VALUE)
    namespace: flags.string({ char: 'n', description: 'Namespace of the managed package' }),
    majorversion: flags.string({ char: 'j', description: 'Major version' }),
    minorversion: flags.string({ char: 'm', description: 'Minor version' }),
    apiversion: flags.string({ char: 'a', description: 'If sent, updates api version' }),
    remove: flags.boolean({ char: 'r', description: 'Verbose', default: false }) as unknown as flags.IOptionFlag<boolean>,
    folder: flags.string({ char: 'f', description: 'SFDX project folder containing files' }),
    verbose: flags.boolean({ char: 'v', description: 'Verbose' }) as unknown as flags.IOptionFlag<boolean>,
    noinsight: flags.boolean({ description: 'Do not send anonymous usage stats' }) as unknown as flags.IOptionFlag<boolean>
  };

  public static args = [];

  // Input params properties
  public namespace: string;
  public majorversion: string;
  public minorversion: string;
  public apiVersion: string;
  public remove: boolean = false;
  public folder: string;
  public verbose: boolean = false;

  // Internal properties
  public progressBar: any;

  // Runtime methods
  public async run() {
    const elapseStart = Date.now();

    // tslint:disable-next-line:no-shadowed-variable
    const { flags } = this.parse(ProjectChangeDependencyVersion);

    // Get input arguments or default values
    this.namespace = flags.namespace;
    this.majorversion = flags.majorversion;
    this.minorversion = flags.minorversion;
    this.apiVersion = flags.apiversion;
    this.remove = flags.remove;
    this.folder = flags.folder || '.';
    if (flags.verbose) {
      this.verbose = true;
    }
    if (this.remove === true) {
      console.log(`Initialize removal of dependencies with ${this.namespace} in ${this.folder}`);
    } else if (this.apiVersion != null) {
      console.log(`Initialize update of apiVersion in ${this.folder} with ${this.apiVersion}`);
    } else {
      console.log(`Initialize update of dependencies in ${this.folder} with ${this.namespace} ${this.majorversion}.${this.minorversion}`);
    }

    // Read files
    const fileList = glob.sync(this.folder + '/**/*.xml');

    // Progress bar
    // @ts-ignore
    this.progressBar = new cliProgress.SingleBar({
      format: '{name} [{bar}] {percentage}% | {value}/{total} | {file} ',
      stopOnComplete: true
    });
    if (this.progressBar.terminal.isTTY()) {
      this.progressBar.start(fileList.length, 0, { name: 'Progress', file: 'N/A' });
    }

    // Replace dependencies in files
    let updatedNb = 0;
    const parser = new xml2js.Parser();
    const promises = [];
    for (const sfdxXmlFile of fileList) {
      const filePromise = new Promise((resolve, reject) => {
        fs.readFile(sfdxXmlFile, (err, data) => {
          // Parse XML file
          parser.parseString(data, (err2, parsedXmlFile) => {
            // console.log(`Parsed ${sfdxXmlFile} \n` + self.util.inspect(parsedXmlFile, false, null))
            // Check if packageVersions contains namespace
            const typeX = Object.keys(parsedXmlFile)[0];
            const objDescription = parsedXmlFile[typeX];
            const packageVersions = objDescription.packageVersions;
            if (packageVersions == null && this.apiVersion == null) {
              if (!this.verbose && this.progressBar.terminal.isTTY()) {
                this.progressBar.increment();
              }
              resolve(true);
              return;
            }
            let changed = false;

            // Update apiVersion if requested
            if (this.apiVersion && parsedXmlFile[typeX].apiVersion && parsedXmlFile[typeX].apiVersion[0] !== this.apiVersion) {
              changed = true;
              parsedXmlFile[typeX].apiVersion[0] = this.apiVersion;
            }

            // Remove dependency
            if (this.remove) {
              const filteredPackageVersions = packageVersions.filter(item => item.namespace[0] !== this.namespace);
              if (filteredPackageVersions.length !== packageVersions.length) {
                changed = true;
                // Remove packageVersions from xml if there is no dependency
                if (filteredPackageVersions.length === 0) {
                  delete parsedXmlFile[typeX].packageVersions;
                } else {
                  parsedXmlFile[typeX].packageVersions = filteredPackageVersions;
                }
              }
            } else if (packageVersions) {
              // Update dependency
              for (let i = 0; i < packageVersions.length; i++) {
                const dependency = packageVersions[i];
                // Update dependency in parsed XML object
                if (dependency.namespace[0] === this.namespace) {
                  dependency.majorNumber[0] = this.majorversion;
                  dependency.minorNumber[0] = this.minorversion;
                  parsedXmlFile[typeX].packageVersions[i] = dependency;
                  changed = true;
                }
              }
            }
            // Update file if content updated
            if (changed) {
              writeXmlFile(sfdxXmlFile,parsedXmlFile);
              updatedNb++;
            }
            if (!this.verbose && this.progressBar.terminal.isTTY()) {
              this.progressBar.increment();
              this.progressBar.update(null, { file: sfdxXmlFile });
            }
            resolve(true);
          });
        });
      });
      promises.push(filePromise);
    }
    await Promise.all(promises); // Wait all files to be processed
    if (!this.verbose && this.progressBar.terminal.isTTY()) {
      // @ts-ignore
      this.progressBar.update(null, { file: 'Completed in ' + EssentialsUtils.formatSecs(Math.round((Date.now() - elapseStart) / 1000)) });
      this.progressBar.stop();
    }
    console.log('Updated ' + updatedNb + ' files');
    await this.config.runHook('essentials-analytics', this);
  }

}
