import { Command, flags } from '@oclif/command';
import { promises as fsPromises } from 'fs';
import * as glob from 'glob';
import * as xml2js from 'xml2js';

export default class PackageXmlSort extends Command {

    public static aliases = ['essentials:order-package-xml', 'essentials:packagexml:reorder'];

    public static description = 'Developers have the bad habit to input package.xml files in a non-alphabetical order. Use this command to reorder alphabetically your package.xml files !';

    public static examples = [
        '$ sfdx essentials:packagexml:sort -p "./Config/packageXml/package.xml"',
        '$ sfdx essentials:packagexml:sort -p "./Config/packageXml"'
    ];

    public static flags = {
        // flag with a value (-n, --name=VALUE)
        packagexml: flags.string({ char: 'p', description: 'package.xml file path (or a folder containing package.xml files)' }),
        noinsight: flags.boolean({ description: 'Do not send anonymous usage stats' }) as unknown as flags.IOptionFlag<boolean>
    };

    public static args = [];

    // Input params properties
    public packageXmlFile: string;

    // Internal properties

    // Runtime methods
    public async run() {
        // tslint:disable-next-line:no-shadowed-variable
        const { flags } = this.parse(PackageXmlSort);

        // Get input arguments or default values
        this.packageXmlFile = flags.packagexml;
        const stat = await fsPromises.lstat(this.packageXmlFile);
        // If directory, browse files and process them
        if (stat.isDirectory()) {
            const fileList = glob.sync(`${this.packageXmlFile}/*.xml`);
            await Promise.all(fileList.map(async file => {
                await this.reorderPackageXmlFile(file);
            }));
        } else {
            await this.reorderPackageXmlFile(this.packageXmlFile);
        }

        await this.config.runHook('essentials-analytics', this);

    }

    private async reorderPackageXmlFile(packageXmlUniqueFile: string) {

        // Parse packageXml content in a variable
        const currentPackageXmlBuffer = await fsPromises.readFile(packageXmlUniqueFile);
        const currentPackageXml = currentPackageXmlBuffer.toString();
        const parser = new xml2js.Parser();
        const packageXmlData = await parser.parseStringPromise(currentPackageXml);

        // Reorder types by alphabetical order
        packageXmlData.Package.types = packageXmlData.Package.types.sort((a: any, b: any) => a.name[0].localeCompare(b.name[0]));

        // Reorder items of each type
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < packageXmlData.Package.types.length; i++) {
            if (packageXmlData.Package.types[i].members) {
                packageXmlData.Package.types[i].members = packageXmlData.Package.types[i].members.sort((a: string, b: string) => a.localeCompare(b));
                // Remove strange useless property '_'
                if (packageXmlData.Package.types[i]._) {
                    delete packageXmlData.Package.types[i]._;
                }
            }
        }

        // Remove empty types
        packageXmlData.Package.types = packageXmlData.Package.types.filter((type1: any) =>
            type1.name && type1.name.length > 0 && type1.members && type1.members.length > 0);

        const builder = new xml2js.Builder();
        const orderedPackageXml = builder.buildObject(packageXmlData);

        // Update file only if updates have been performed
        if (currentPackageXml !== orderedPackageXml) {
            await fsPromises.writeFile(packageXmlUniqueFile, orderedPackageXml);
            this.log(`${packageXmlUniqueFile} file updated`);
        } else {
            this.log(`${packageXmlUniqueFile} file identical`);
        }
    }
}
