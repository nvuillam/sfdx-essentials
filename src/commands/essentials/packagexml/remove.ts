import { Command, flags } from '@oclif/command';
import { EssentialsUtils } from '../../../common/essentials-utils';

export default class PackageXmlRemove extends Command {
  public static description = 'Removes the content of a package.xml file matching another package.xml file';

  public static examples = [
    'sfdx essentials:packagexml:remove -p "package.xml" -r "destructiveChanges.xml" -o "my-reduced-package.xml"'
  ];

  public static flags = {
    // flag with a value (-n, --name=VALUE)
    packagexml: flags.string({
      char: 'p',
      description: 'package.xml file to reduce'
    }),
    removepackagexml: flags.string({
      char: 'r',
      description: 'package.xml file to use to filter input package.xml'
    }),
    removedonly: flags.boolean({
      char: 'z',
      description: 'Use this flag to generate a package.xml with only removed items',
      default: false
    }),
    outputfile: flags.string({
      char: 'o',
      description: 'package.xml output file'
    }),
    verbose: (flags.boolean({
      char: 'v',
      description: 'Verbose',
      default: false
    }) as unknown) as flags.IOptionFlag<boolean>,
    noinsight: (flags.boolean({
      description: 'Do not send anonymous usage stats'
    }) as unknown) as flags.IOptionFlag<boolean>
  };

  public static args = [];

  // Input params properties
  public packageXmlFile: string;
  public removePackageXmlFile: string;
  public removedOnly: boolean = false;
  public outputFile: string;
  public verbose: boolean = false;

  // Internal properties

  // Runtime methods
  public async run() {
    // tslint:disable-next-line:no-shadowed-variable
    const { flags } = this.parse(PackageXmlRemove);

    this.packageXmlFile = flags.packagexml || 'package.xml';
    this.removePackageXmlFile = flags.removepackagexml || 'destructiveChanges.xml';
    this.removedOnly = flags.removedonly || false;
    this.outputFile = flags.outputfile;
    this.verbose = flags.verbose;

    await EssentialsUtils.removePackageXmlFilesContent(
      this.packageXmlFile,
      this.removePackageXmlFile,
      { logFlag: this.verbose, outputXmlFile: this.outputFile, removedOnly: this.removedOnly }
    );
    await this.config.runHook('essentials-analytics', this);
  }
}
