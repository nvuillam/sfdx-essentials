import Command, { flags } from '@oclif/command';
import * as cliProgress from 'cli-progress';
import * as fse from 'fs-extra';
import * as glob from 'glob';
import path = require('path');
import { EssentialsUtils } from '../../../common/essentials-utils';
import { MetadataUtils } from '../../../common/metadata-utils';

export default class AddNamespace extends Command {
    public static aliases = ['essentials:migrate-object-model'];

    public static description = `Migrate sources from an object model to a new object model (See [Example configuration](https://github.com/nvuillam/sfdx-essentials/blob/master/examples/migrate-object-model-config.json))

  Use this command if you need to replace a SObject by another one in all your sfdx sources`;

    public static examples = [
        '$ essentials:mig:add-namespace -n DxcOemDev -p "../../somefolder/package.xml"',
        '$ essentials:mig:add-namespace -n DxcOemDev -i "C:/Work/git/some-client-project/Projects/DevRootSource" --fetchExpressionList="**/*.apex,**/*.json" -p "C:/Work/git/DXCO4SF_Sources_OEM_ST/Config/packageXml/package_DevRoot_Managed.xml"'
    ];

    public static flags = {
        // flag with a value (-n, --name=VALUE)
        namespace: flags.string({ char: 'n', description: 'Namespace string', required: true }),
        packagexml: flags.string({ char: 'p', description: 'Path to package.xml file', required: true }),
        inputFolder: flags.string({ char: 'i', description: 'Input folder (default: "." )' }),
        fetchExpressionList: flags.string({ char: 'f', description: 'Fetch expression list. Let default if you dont know. ex: /aura/**/*.js,./aura/**/*.cmp,./classes/*.cls,./objects/*/fields/*.xml,./objects/*/recordTypes/*.xml,./triggers/*.trigger,./permissionsets/*.xml,./profiles/*.xml,./staticresources/*.json' }),
        verbose: flags.boolean({ char: 'v', description: 'Verbose', default: false }) as unknown as flags.IOptionFlag<boolean>
    };

    public static args = [];

    // Input params properties
    private namespace: string;
    private packagexmlLs: string[];
    private inputFolder: string;
    private fetchExpressionList: string[] = [
        './aura/**/*.js',
        './aura/**/*.cmp',
        './classes/*.cls',
        './objects/*/fields/*.xml',
        './objects/*/recordTypes/*.xml',
        './objectTranslations/*/*.xml',
        './triggers/*.trigger',
        './permissionsets/*.xml',
        './profiles/*.xml',
        './staticresources/*.json'
    ];
    private verbose: boolean = false;

    // Internal props
    private progressBar: any;

    // Runtime methods
    public async run() {

        // Parse options
        // tslint:disable-next-line:no-shadowed-variable
        const { flags } = this.parse(AddNamespace);
        this.namespace = flags.namespace;
        this.packagexmlLs = flags.packagexml.split(',');
        this.inputFolder = flags.inputFolder || '.';
        this.verbose = flags.verbose;
        if (flags.fetchExpressionList) {
            this.fetchExpressionList = flags.fetchExpressionList.split(',');
        }

        const elapseStart = Date.now();

        // Progress bar
        // @ts-ignore
        this.progressBar = new cliProgress.SingleBar({
            format: '{name} [{bar}] {percentage}% | {value}/{total} | {file} ',
            stopOnComplete: true
        });
        if (this.progressBar.terminal.isTTY()) {
            this.progressBar.start(this.fetchExpressionList.length, 0, { name: 'Progress', file: 'N/A' });
        }

        // Extract package.xml data
        const packageXmlContent = await EssentialsUtils.appendPackageXmlFilesContent(this.packagexmlLs, {
            failIfError: true,
            logFlag: this.verbose,
            ignoreDuplicateTypes: []
        });

        // Build replacement list
        const replacementList = this.buildReplacementList(packageXmlContent);

        // Process files
        for (const fetchExpression of this.fetchExpressionList) {

            // Get all files matching expression
            const fetchExprWithPath = path.resolve(this.inputFolder + '/' + fetchExpression);
            const customFileNameList = glob.sync(fetchExprWithPath);
            for (const file of customFileNameList) {
                this.progressBar.update(null, { file: 'Processing ' + file });
                await this.addNameSpaceInFile(file, replacementList);
                await this.manageRenameFile(file, replacementList);
            }
            if (!this.verbose && this.progressBar.terminal.isTTY()) {
                this.progressBar.increment();
            }
        }

        // Finalise progress bar
        if (!this.verbose && this.progressBar.terminal.isTTY()) {
            // @ts-ignore
            this.progressBar.update(null, { file: 'Completed in ' + EssentialsUtils.formatSecs(Math.round((Date.now() - elapseStart) / 1000)) });
            this.progressBar.stop();
        }
    }

    // Build the list of replacement strings to apply
    private buildReplacementList(packageXmlContent) {
        const replacementLists = [];

        // Manage object names
        const aroundCharReplaceObjectList = MetadataUtils.getAroundCharsObjectReplacementList();
        if (packageXmlContent.CustomObject) {
            for (const objName of packageXmlContent.CustomObject) {
                const objNameWithNameSpace = this.namespace + '__' + objName;
                const objReplacementsList = this.buildStringItemReplacementList('CustomObject', aroundCharReplaceObjectList, objName, objNameWithNameSpace);
                replacementLists.push(...objReplacementsList);
            }
        }
        // Manage object fields names
        const aroundCharReplacefieldList = MetadataUtils.getAroundCharsFieldReplacementList();
        if (packageXmlContent.CustomField) {
            for (const fieldName of packageXmlContent.CustomField) {
                const fieldNameWithoutObject = fieldName.split('.').pop();
                const fieldNameWithNameSpace = this.namespace + '__' + fieldNameWithoutObject;
                const fldReplacementsList = this.buildStringItemReplacementList('CustomField', aroundCharReplacefieldList, fieldNameWithoutObject, fieldNameWithNameSpace);
                replacementLists.push(...fldReplacementsList);
            }
        }

        // Manage apex class names
        const aroundCharReplaceClassList = MetadataUtils.getAroundCharsClassReplacementList();
        if (packageXmlContent.ApexClass) {
            for (const className of packageXmlContent.ApexClass) {
                const classNameWithNameSpace = this.namespace + '.' + className;
                const classReplacementsList = this.buildStringItemReplacementList('ApexClass', aroundCharReplaceClassList, className, classNameWithNameSpace);
                replacementLists.push(...classReplacementsList);
            }
        }
        return replacementLists;
    }

    // Build list of replacement strings for an object
    private buildStringItemReplacementList(type: string, aroundCharsReplaceList: any, prevSubString: string, newSubstring: string) {
        const replacementList = [];
        for (const aroundChars of aroundCharsReplaceList) {
            let oldString = aroundChars.before + prevSubString + aroundChars.after;
            let newString = aroundChars.before + newSubstring + aroundChars.after;
            const regexStr = this.stringToRegex(oldString);
            const regexToReplace = new RegExp(regexStr, 'g');
            replacementList.push({ regex: regexToReplace, replacement: newString, type });
        }
        return replacementList;
    }

    private async addNameSpaceInFile(file: string, replacementList: any) {
        const fileContent = fse.readFileSync(file);
        if (fileContent == null) {
            console.warn('Warning: empty file -> ' + file);
            return;
        }
        // Split all lines of the file
        let fileLines = fileContent.toString().split('\n');
        const initialFileLines = fileLines;

        // Try to apply replacements
        const fileExt = file.split('.').pop();
        switch (fileExt) {
            case 'cls':
            case 'apex': fileLines = this.applyReplacementsGeneric(fileLines, replacementList); break;
            case 'json': fileLines = this.applyReplacementsGeneric(fileLines, replacementList); break;
            case 'xml': fileLines = this.applyReplacementsGeneric(fileLines, replacementList); break;
            default: console.log(`Extension ${fileExt} not supported (yet ?)`);
        }

        // Update file if its content has been updated
        if (JSON.stringify(fileLines) !== JSON.stringify(initialFileLines)) {
            await fse.writeFile(file, fileLines.join('\n'));
            console.log(`Updated ${file}`);
        }
    }

    private async manageRenameFile(file: string, replacementList: any) {
        const filePath = path.resolve(file);
        const updatedFilePath = this.applyStringReplacements(filePath, replacementList);

        // Update file if its content has been updated
        if (updatedFilePath !== filePath) {
            await fse.rename(filePath, updatedFilePath);
            console.log(`Renamed ${filePath} into ${updatedFilePath}`);
        }
    }

    private applyReplacementsGeneric(fileLines: string[], replacementList: any): string[] {
        const newFileLines = [];
        for (let line of fileLines) {
            line = this.applyStringReplacements(line, replacementList);
            newFileLines.push(line);
        }
        return newFileLines;
    }

    private applyStringReplacements(line: string, replacementList: any[]): string {
        // To not apply on comments
        if (line.trimLeft().startsWith('//') || line.trimLeft().startsWith('/*')) {
            return line;
        }
        for (const replacement of replacementList) {
            if (!line.includes(replacement.replacement)) {
                line = line.replace(replacement.regex, replacement.replacement);
            }
        }
        return line;
    }

    private stringToRegex(str: string) {
        return str
            .replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
            .replace(/-/g, '\\x2d');
    }
}
