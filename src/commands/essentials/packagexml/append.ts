import { Command, flags } from '@oclif/command';
import { promises as fsPromises } from 'fs';
import * as glob from 'glob';
import * as xml2js from 'xml2js';

export default class AppendPackageXml extends Command {
    public static description = '';

    public static examples = [];

    public static flags = {
        // flag with a value (-n, --name=VALUE)
        packagexmls: flags.string({ char: 'p', description: 'package.xml files path (separated by a comma)' })
    };

    public static args = [];

    // Input params properties
    public packageXmlFiles: string;

    // Internal properties

    // Runtime methods
    public async run() {
        // tslint:disable-next-line:no-shadowed-variable
        const { flags } = this.parse(AppendPackageXml);
    }

}
