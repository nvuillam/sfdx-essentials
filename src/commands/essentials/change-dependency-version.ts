import { Command, flags } from '@oclif/command';
import { FILE } from 'dns';

export default class ExecuteFilter extends Command {
  public static description = `
   `;

  public static examples = [
  ];

  public static flags = {
    // flag with a value (-n, --name=VALUE)
    namespace: flags.string({ char: 'n', description: 'Namespace of the managed package' }),
    majorversion: flags.string({ char: 'j', description: 'Major version' }),
    minorversion: flags.string({ char: 'm', description: 'Minor version' }),
    folder: flags.string({ char: 'f', description: 'SFDX project folder containing files' })
  };

  public static args = [];

  // Input params properties
  public namespace;
  public majorversion;
  public minorversion;
  public folder;

  // Internal properties
  public fs = require('fs');
  public xml2js = require('xml2js');
  public util = require('util');
  public glob = require('glob');

  // Runtime methods
  public async run() {
    const self = this;
    // tslint:disable-next-line:no-shadowed-variable
    const { args, flags } = this.parse(ExecuteFilter);

    // Get input arguments or default values
    this.namespace = flags.namespace;
    this.majorversion = flags.majorversion;
    this.minorversion = flags.minorversion;
    this.folder = flags.folder || '.';
    console.log(`Initialize update of dependencies in ${this.folder} with ${this.namespace} ${this.majorversion}.${this.minorversion}`);

    // Read files
    const fileList = this.glob.sync('**/*.xml');

    // Replace dependencies in files
    const parser = new this.xml2js.Parser();
    fileList.forEach((sfdxXmlFile) => {
      this.fs.readFile(sfdxXmlFile, function(err, data) {
        // Parse XML file
        parser.parseString(data, function(err2, parsedXmlFile) {
          // console.log(`Parsed ${sfdxXmlFile} \n` + self.util.inspect(parsedXmlFile, false, null))
          // Check if packageVersions contains namespace
          const typeX = Object.keys(parsedXmlFile)[0];
          const objDescription = parsedXmlFile[typeX];
          const packageVersions = objDescription.packageVersions;
          if (packageVersions == null) {
            return;
          }
          let changed = false;
          for (let i = 0; i < packageVersions.length; i++) {
            const dependency = packageVersions[i];
            // Update dependency in parsed XML object
            if (dependency.namespace[0] === self.namespace) {
              dependency.majorNumber[0] = self.majorversion;
              dependency.minorNumber[0] = self.minorversion;
              parsedXmlFile[typeX].packageVersions[i] = dependency;
              changed = true;
            }
          }
          if (changed) {
            // Update file
            const builder = new self.xml2js.Builder();
            const updatedObjectXml = builder.buildObject(parsedXmlFile);
            self.fs.writeFileSync(sfdxXmlFile, updatedObjectXml);
            console.log('- updated ' + sfdxXmlFile + ' with ' + updatedObjectXml + '\n');
          }
        });
      });
    });
  }

}
