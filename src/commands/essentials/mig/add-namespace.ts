import Command, { flags } from '@oclif/command';
import * as AntPathMatcher from 'ant-path-matcher';
import * as cliProgress from 'cli-progress';
import * as fse from 'fs-extra';
import * as glob from 'glob';
import * as path from 'path';
import * as xml2js from 'xml2js';
import { EssentialsUtils } from '../../../common/essentials-utils';
import { MetadataUtils } from '../../../common/metadata-utils';

export default class AddNamespace extends Command {
    public static aliases = ['essentials:migrate-object-model'];

    public static description = `Migrate sources from an object model to a new object model (See [Example configuration](https://github.com/nvuillam/sfdx-essentials/blob/master/examples/migrate-object-model-config.json))

  Use this command if you need to replace a SObject by another one in all your sfdx sources`;

    public static examples = [
        '$ essentials:mig:add-namespace -n DxcOemDev -p "../../somefolder/package.xml"',
        '$ essentials:mig:add-namespace -n DxcOemDev -i "C:/Work/git/some-client-project/Projects/DevRootSource" --fetchExpressionList="**/*.apex,**/*.json" -p "C:/Work/git/DXCO4SF_Sources_OEM_ST/Config/packageXml/package_DevRoot_Managed.xml"',
        '$ essentials:mig:add-namespace -n DxcOemDev -e "**/www*" -p "../../somefolder/package.xml"'
    ];

    public static flags = {
        // flag with a value (-n, --name=VALUE)
        namespace: flags.string({ char: 'n', description: 'Namespace string', required: true }),
        packagexml: flags.string({ char: 'p', description: 'Path to package.xml file', required: true }),
        labelsfile: flags.string({ char: 'l', description: 'Path to CustomLabel.labels-meta.xml', required: false }),
        inputFolder: flags.string({ char: 'i', description: 'Input folder (default: "." )' }),
        fetchExpressionList: flags.string({ char: 'f', description: 'Fetch expression list. Let default if you dont know. ex: ./aura/**/*.js,./aura/**/*.cmp,./classes/*.cls,./objects/*/fields/*.xml,./objects/*/recordTypes/*.xml,./triggers/*.trigger,./permissionsets/*.xml,./profiles/*.xml,./staticresources/*.json' }),
        excludeExpressionList: flags.string({ char: 'e', description: 'List of expressions to ignore. ex: **/node_modules/**' }),
        verbose: flags.boolean({ char: 'v', description: 'Verbose', default: false }) as unknown as flags.IOptionFlag<boolean>,
        noinsight: flags.boolean({ description: 'Do not send anonymous usage stats' }) as unknown as flags.IOptionFlag<boolean>
    };

    public static args = [];

    // Input params properties
    private namespace: string;
    private packagexmlLs: string[];
    private labelsFile: string;
    private inputFolder: string;
    private fetchExpressionList: string[] = [
        '**/aura/**/*.js',
        '**/aura/**/*.cmp',
        '**/classes/*.cls',
        '**/objects/*/fields/*.xml',
        '**/objects/*/recordTypes/*.xml',
        '**/objectTranslations/*/*.xml',
        '**/triggers/*.trigger',
        '**/permissionsets/*.xml',
        '**/profiles/*.xml',
        '**/staticresources/*.json'
    ];
    private excludeExpressionList: string[] = [];
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
        this.labelsFile = flags.labelsfile;
        this.inputFolder = flags.inputFolder || '.';
        this.verbose = flags.verbose;
        if (flags.fetchExpressionList) {
            this.fetchExpressionList = flags.fetchExpressionList.split(',');
        }
        if (flags.excludeExpressionList) {
            this.excludeExpressionList = flags.excludeExpressionList.split(',');
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
        const replacementList = await this.buildReplacementList(packageXmlContent, this.labelsFile);

        // Process files
        await Promise.all(this.fetchExpressionList.map(async fetchExpression => {
            // Get all files matching expression
            const fetchExprWithPath = path.resolve(this.inputFolder + '/' + fetchExpression);
            const customFileNameList = glob.sync(fetchExprWithPath);
            for (const file of customFileNameList) {
                if (this.isExcluded(file, this.excludeExpressionList)) {
                    if (this.verbose) {
                        console.log(`Skipped ${file}`);
                    }
                    continue;
                }
                if (this.verbose) {
                    console.log(`Processing ${file}`);
                } else if (this.progressBar.terminal.isTTY()) {
                    this.progressBar.update(null, { file: `Processing ${file}` });
                }
                await this.addNameSpaceInFile(file, replacementList);
                await this.manageRenameFile(file, replacementList);
                if (this.verbose) {
                    console.log(`-- Processed ${file}`);
                }
                if (!this.verbose && this.progressBar.terminal.isTTY()) {
                    this.progressBar.increment();
                }
            }
        }));

        // Finalise progress bar
        if (!this.verbose && this.progressBar.terminal.isTTY()) {
            // @ts-ignore
            this.progressBar.update(null, { file: 'Completed in ' + EssentialsUtils.formatSecs(Math.round((Date.now() - elapseStart) / 1000)) });
            this.progressBar.stop();
        } else {
            this.progressBar.stop();
            console.info('Completed in ' + EssentialsUtils.formatSecs(Math.round((Date.now() - elapseStart) / 1000)) + 's');
        }
        return;
    }

    // Checks if the file path is contained in exclude list
    public isExcluded(file: string, excludeExprLs: string[]): boolean {
        for (const expression of excludeExprLs) {
            if (new AntPathMatcher().match(expression, file)) {
                return true;
            }
        }
        return false;
    }

    // Build the list of replacement strings to apply
    private async buildReplacementList(packageXmlContent: any, labelsFile: string) {
        const replacementLists = [];

        // Manage object names
        const aroundCharReplaceObjectList = MetadataUtils.getAroundCharsObjectReplacementList();
        if (packageXmlContent.CustomObject) {
            for (const objName of packageXmlContent.CustomObject) {
                if (!objName.endsWith('__c')) {
                    continue;
                }
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
                if (!fieldNameWithoutObject.endsWith('__c')) {
                    continue;
                }
                const fieldNameWithNameSpace = this.namespace + '__' + fieldNameWithoutObject;
                const fldReplacementsList = this.buildStringItemReplacementList('CustomField', aroundCharReplacefieldList, fieldNameWithoutObject, fieldNameWithNameSpace);
                replacementLists.push(...fldReplacementsList);
                if (fieldNameWithoutObject.endsWith('__c')) {
                    const relationName = fieldNameWithoutObject.replace('__c', '__r');
                    const relationWithNameSpace = this.namespace + '__' + relationName;
                    const relationReplacementsList = this.buildStringItemReplacementList('CustomField', aroundCharReplacefieldList, relationName, relationWithNameSpace);
                    replacementLists.push(...relationReplacementsList);
                }
            }
        }

        // Manage apex class names
        const aroundCharReplaceClassList = MetadataUtils.getAroundCharsClassReplacementList();
        if (packageXmlContent.ApexClass) {
            for (const className of packageXmlContent.ApexClass) {
                if (className.length < 3) {
                    console.info('Skipped ' + className);
                    continue;
                }
                const classNameWithNameSpace = this.namespace + '.' + className;
                const classReplacementsList = this.buildStringItemReplacementList('ApexClass', aroundCharReplaceClassList, className, classNameWithNameSpace);
                replacementLists.push(...classReplacementsList);
            }
        }

        // Manage label names
        const aroundCharReplaceLabelList = MetadataUtils.getLabelsReplacementList();
        if (packageXmlContent.CustomLabel || labelsFile) {
            const labelList = packageXmlContent.CustomLabel;
            if (labelsFile && fse.existsSync(labelsFile)) {
                const parser = new xml2js.Parser();
                const labelsXmlData = await parser.parseStringPromise(fse.readFileSync(labelsFile));
                const fromLabelsFileLabels = labelsXmlData.CustomLabels.labels.map((item: any) => item.fullName[0]);
                labelList.push(...fromLabelsFileLabels);
            }
            for (const labelName of labelList) {
                const labelNameWithNameSpace = this.namespace + '.' + labelName;
                const labelNameReplacementsList = this.buildStringItemReplacementList('CustomLabel', aroundCharReplaceLabelList, labelName, labelNameWithNameSpace);
                replacementLists.push(...labelNameReplacementsList);
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
            let regexStr = this.stringToRegex(oldString);
            if (aroundChars.beforeRegex) {
                regexStr = aroundChars.beforeRegex + regexStr;
            }
            const regexToReplace = new RegExp(regexStr, 'g');
            const replacement = {
                regex: regexToReplace,
                replacement: newString,
                type
            };
            replacementList.push(replacement);
        }
        return replacementList;
    }

    // Apply replacements on file
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
            try {
                await fse.rename(filePath, updatedFilePath);
            } catch (e) {
                console.error(`Error renaming ${filePath} into ${updatedFilePath}`);
                return;
            }
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
