import { Command, flags } from '@oclif/command';
import { EssentialsUtils } from '../../../common/essentials-utils';

export default class PackageXmlAppend extends Command {
    public static description = `Append content of a package.xml files into a single one

API version number of the result file will be the same than in the first package.xml file sent as argument`;

    public static examples = [
        'sfdx essentials:packagexml:append -p "./Config/packageXml/package_DevRoot_Managed.xml,./Config/packageXml/package_DevRoot_Demo.xml,./Config/packageXml/package_DevRoot_Scratch.xml" -o "./Config/packageXml/package_for_new_scratch_org.xml"'
    ];

    public static flags = {
        // flag with a value (-n, --name=VALUE)
        packagexmls: flags.string({ char: 'p', description: 'package.xml files path (separated by commas)' }),
        outputfile: flags.string({ char: 'o', description: 'package.xml output file' }),
        verbose: flags.boolean({ char: 'v', description: 'Verbose', default: false }) as unknown as flags.IOptionFlag<boolean>
    };

    public static args = [];

    // Input params properties
    public packageXmlFiles: string[];
    public outputFile: string;
    public verbose: boolean = false;

    // Internal properties

    // Runtime methods
    public async run() {
        // tslint:disable-next-line:no-shadowed-variable
        const { flags } = this.parse(PackageXmlAppend);

        this.packageXmlFiles = flags.packagexmls.split(',');
        this.outputFile = flags.outputfile;
        this.verbose = flags.verbose;

        await EssentialsUtils.appendPackageXmlFilesContent(this.packageXmlFiles, {
            logFlag: this.verbose,
            outputXmlFile: this.outputFile
        });

    }

}
