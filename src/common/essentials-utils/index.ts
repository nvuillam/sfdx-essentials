import * as arrayCompare from 'array-compare';
import { promises as fsPromises } from 'fs';
import * as util from 'util';
import * as xml2js from 'xml2js';

class EssentialsUtils {

    // Format seconds
    public static formatSecs(seconds: number) {
        return Math.floor(seconds / 60) + ':' + ('0' + Math.floor(seconds % 60)).slice(-2);
    }

    public static multibarStartProgress(multibars: any, multibarKey: string, multibar: any, label: string): NodeJS.Timer {
        if (!multibar) {
            return null;
        }
        let dotsNb = 0;
        const interval = setInterval(() => {
            const progressLbl = label + '.'.repeat(dotsNb);
            multibars[multibarKey].update(null, { file: progressLbl });
            multibar.update();
            dotsNb++;
            if (dotsNb === 3) {
                dotsNb = 0;
            }
        }, 1000);
        return interval;
    }
    public static multibarStopProgress(interval: NodeJS.Timer) {
        if (interval) {
            clearInterval(interval);
        }
    }

    // Read package.xml files and build concatenated list of items
    public static async appendPackageXmlFilesContent(packageXmlFileList, {
        failIfError = false,
        ignoreDuplicateTypes = [],
        outputXmlFile = null,
        logFlag = false }) {

        let firstPackageXmlContent: any = null;
        let allPackageXmlFilesTypes = {};
        const doublingItems = [];
        // loop on packageXml files
        for (const packageXmlFile of packageXmlFileList) {
            const parser = new xml2js.Parser();
            // read file content
            const data = await fsPromises.readFile(packageXmlFile);
            // parse xml content
            const result: any = await parser.parseStringPromise(data);
            if (firstPackageXmlContent == null) {
                firstPackageXmlContent = result;
            }
            if (logFlag) {
                console.log(`Parsed ${packageXmlFile} :\n` + util.inspect(result, false, null));
            }
            let packageXmlMetadatasTypeLs: any[];
            // get metadata types in parse result
            try { packageXmlMetadatasTypeLs = result.Package.types; } catch { throw new Error('Unable to parse package Xml file ' + packageXmlFile); }

            // Add metadata members in concatenation list of items & store doublings
            for (const typePkg of packageXmlMetadatasTypeLs) {
                const nameKey = typePkg.name[0];
                if (allPackageXmlFilesTypes[nameKey] != null && typePkg.members != null) {
                    const compareRes = arrayCompare(typePkg.members, allPackageXmlFilesTypes[nameKey]);
                    if (compareRes.found.length > 0) {
                        if (!ignoreDuplicateTypes.includes(nameKey)) {
                            doublingItems.push(compareRes.found);
                            console.warn(`ERROR: ${nameKey} items are existing in several package.xml files:` + JSON.stringify(compareRes.found, null, 2));
                        } else {
                            console.warn(`WARNING: ${nameKey} items are existing in several package.xml files:` + JSON.stringify(compareRes.found, null, 2));
                        }
                    }
                    allPackageXmlFilesTypes[nameKey] = Array.from(new Set(allPackageXmlFilesTypes[nameKey].concat(typePkg.members))).sort();
                } else if (typePkg.members != null) {
                    allPackageXmlFilesTypes[nameKey] = Array.from(new Set(typePkg.members)).sort();
                }
            }
        }
        // Check doubling items if failIfError = true
        if (failIfError === true && doublingItems.length > 0) {
            throw Error('There are doubling items in package.xml files, please make them unique');
        }

        // Sort result & display in logs if requested
        allPackageXmlFilesTypes = this.sortObject(allPackageXmlFilesTypes);
        if (logFlag) {
            console.log('Package.xml files concatenation results :\n' + util.inspect(allPackageXmlFilesTypes, false, null));
        }

        // Write in output file if required
        if (outputXmlFile) {
            const appendTypesXml = [];
            for (const packageXmlType of Object.keys(allPackageXmlFilesTypes)) {
                appendTypesXml.push({ members: allPackageXmlFilesTypes[packageXmlType], name: packageXmlType });
            }
            firstPackageXmlContent.Package.types = appendTypesXml;
            const builder = new xml2js.Builder();
            const updatedObjectXml = builder.buildObject(firstPackageXmlContent);
            await fsPromises.writeFile(outputXmlFile, updatedObjectXml);
            if (logFlag) {
                console.log('Generated package.xml file: ' + outputXmlFile);
            }
        }

        return allPackageXmlFilesTypes;
    }

    // Sort object for debug ( yeah yeah I know objects are not sortable , blah blah blah ^^ )
    public static sortObject(o) {
        return Object.keys(o).sort().reduce((r, k) => (r[k] = o[k], r), {});
    }

}

export { EssentialsUtils };
