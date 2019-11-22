import { Command, flags } from '@oclif/command';
import * as glob from 'glob';
import * as fs from 'fs';
import * as xml2js from 'xml2js';
import * as cliProgress from 'cli-progress';

export default class ExecuteFilter extends Command {
  public static description = `
   `;

  public static examples = [
  ];

  public static flags: any = {
    // flag with a value (-n, --name=VALUE)
    namespace: flags.string({ char: 'n', description: 'Namespace of the managed package' }),
    majorversion: flags.string({ char: 'j', description: 'Major version' }),
    minorversion: flags.string({ char: 'm', description: 'Minor version' }),
    folder: flags.string({ char: 'f', description: 'SFDX project folder containing files' }),
    verbose: flags.boolean({ char: 'v', description: 'Verbose' })
  };

  public static args = [];

  // Input params properties
  public namespace: string;
  public majorversion: string;
  public minorversion: string;
  public folder: string;
  public verbose: boolean = false;

  // Internal properties
  public progressBar: any;

  // Runtime methods
  public async run() {
    // tslint:disable-next-line:no-shadowed-variable
    const { args, flags } = this.parse(ExecuteFilter);

    // Get input arguments or default values
    this.namespace = flags.namespace;
    this.majorversion = flags.majorversion;
    this.minorversion = flags.minorversion;
    this.folder = flags.folder || '.';
    if (flags.verbose) {
      this.verbose = true;
    }
    console.log(`Initialize update of dependencies in ${this.folder} with ${this.namespace} ${this.majorversion}.${this.minorversion}`);

    // Read files
    const fileList = glob.sync('**/*.xml');

    // Progress bar
    if (!this.verbose) {
      // @ts-ignore
      this.progressBar = new cliProgress.SingleBar({
        format: '{name} [{bar}] {percentage}% | {value}/{total} | {file} ',
        stopOnComplete: true
      });
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
            if (packageVersions == null) {
              if (!this.verbose) {
                this.progressBar.increment();
              }
              resolve();
              return;
            }
            let changed = false;
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
            if (changed) {
              // Update file
              const builder = new xml2js.Builder();
              const updatedObjectXml = builder.buildObject(parsedXmlFile);
              fs.writeFileSync(sfdxXmlFile, updatedObjectXml);
              updatedNb++;
              if (this.verbose) {
                console.log('- updated ' + sfdxXmlFile + ' with ' + updatedObjectXml + '\n');
              }
            }
            if (!this.verbose) {
              this.progressBar.increment();
              this.progressBar.update(null, { file: sfdxXmlFile });
            }
            resolve();
          });
        });
      });
      promises.push(filePromise);
    }
    await Promise.all(promises); // Wait all files to be processed
    if (!this.verbose) {
      this.progressBar.update(null, { file: 'Completed' });
      this.progressBar.stop();
    }
    console.log('Updated ' + updatedNb + ' files');
  }

}
