import { Command, flags } from '@oclif/command';
import { promises as fsPromises } from 'fs';
import * as glob from 'glob';
import * as fse from 'fs-extra';
import * as xml2js from 'xml2js';
import * as util from 'util';
import * as cliProgress from 'cli-progress';
import EssentialsUtils = require('../../common/essentials-utils');
import metadataUtils = require('../../common/metadata-utils');

export default class OrderPackageXml extends Command {
    public static description = '';

    public static examples = [];

    public static flags = {
        // flag with a value (-n, --name=VALUE)
        packagexml: flags.string({ char: 'p', description: 'package.xml file path (or a folder containing package.xml files)' })
    };

    public static args = [];

    // Input params properties
    public packageXmlFile: string;

    // Internal properties

    // Runtime methods
    public async run() {
        // tslint:disable-next-line:no-shadowed-variable
        const { args, flags } = this.parse(OrderPackageXml);

        // Get input arguments or default values
        this.packageXmlFile = flags.packagexml;
        const stat = await fsPromises.lstat(this.packageXmlFile);
        // If directory, browse files and process them
        if (stat.isDirectory()) {
            const fileList = glob.sync(`${this.packageXmlFile}/*.xml`);
            await Promise.all(fileList.map(async (file) => {
                await this.reorderPackageXmlFile(file);
            }));
        } else {
            await this.reorderPackageXmlFile(this.packageXmlFile);
        }

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
        for (let i = 0; i < packageXmlData.Package.types.length; i++) {
            if (packageXmlData.Package.types[i].members) {
                packageXmlData.Package.types[i].members = packageXmlData.Package.types[i].members.sort((a: string, b: string) => a.localeCompare(b));
            }
        }

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
