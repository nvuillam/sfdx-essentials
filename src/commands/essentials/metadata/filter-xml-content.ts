import { Command, flags } from '@oclif/command';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as util from 'util';
import * as xml2js from 'xml2js';

export default class MetadataFilterXmlContent extends Command {
  public static aliases = ['essentials:filter-xml-content'];

  public static description = `Filter content of metadatas (XML) in order to be able to deploy only part of them on an org (See [Example configuration](https://github.com/nvuillam/sfdx-essentials/blob/master/examples/filter-xml-content-config.json))

When you perform deployments from one org to another, the features activated in the target org may not fit the content of the sfdx/metadata files extracted from the source org.

You may need to filter some elements in the XML files, for example in the Profiles

This script requires a filter-config.json file`;

  public static examples = [
    'sfdx essentials:filter-xml-content -i "./mdapi_output"',
    'sfdx essentials:filter-xml-content -i "retrieveUnpackaged"'];

  public static flags = {
    // flag with a value (-n, --name=VALUE)
    configFile: flags.string({ char: 'c', description: 'Config JSON file path' }),
    inputfolder: flags.string({ char: 'i', description: 'Input folder (default: "." )' }),
    outputfolder: flags.string({ char: 'o', description: 'Output folder (default: parentFolder + _xml_content_filtered)' })
  };

  public static args = [];

  // Input params properties
  public configFile;
  public inputFolder;
  public outputFolder;

  // Internal properties

  public smmryUpdatedFiles = {};
  public smmryResult = { filterResults: {} };

  // Runtime methods
  public async run() {
    // tslint:disable-next-line:no-shadowed-variable
    const { flags } = this.parse(MetadataFilterXmlContent);

    // Get input arguments or default values
    this.configFile = flags.configFile || './filter-config.json';
    this.inputFolder = flags.inputfolder || '.';
    this.outputFolder = flags.outputfolder || './' + path.dirname(this.inputFolder) + '/' + path.basename(this.inputFolder) + '_xml_content_filtered';
    this.log(`Initialize XML content filtering of ${this.inputFolder} ,using ${this.configFile} , into ${this.outputFolder}`);

    // Read json config file
    const filterConfig = fse.readJsonSync(this.configFile);
    console.log('Config file content:');
    console.log(util.inspect(filterConfig, false, null));

    // Create output folder/empty it if existing
    if (fs.existsSync(this.outputFolder)) {
      console.log('Empty output folder ' + this.outputFolder);
      fse.emptyDirSync(this.outputFolder);
    } else {
      console.log('Create output folder ' + this.outputFolder);
      fs.mkdirSync(this.outputFolder);
    }

    // Copy input folder to output folder
    console.log('Copy in output folder ' + this.outputFolder);
    fse.copySync(this.inputFolder, this.outputFolder);

    // Browse filters
    filterConfig.filters.forEach(filter => {
      console.log(filter.name + ' (' + filter.description + ')');
      // Browse filter folders
      filter.folders.forEach(filterFolder => {

        // Browse folder files
        const folderFiles = fs.readdirSync(this.outputFolder + '/' + filterFolder);
        folderFiles.forEach(file => {
          // Build file name
          const fpath = file.replace(/\\/g, '/');
          const browsedFileExtension = fpath.substring(fpath.lastIndexOf('.') + 1);
          filter.file_extensions.forEach(filterFileExt => {
            if (browsedFileExtension === filterFileExt) {
              // Found a matching file, process it
              const fullFilePath = this.outputFolder + '/' + filterFolder + '/' + fpath;
              console.log('- ' + fullFilePath);
              this.filterXmlFromFile(filter, fullFilePath);
            }
          });
        });

      });

    });
    this.smmryResult.filterResults = this.smmryUpdatedFiles;

    // Display results as JSON
    console.log(JSON.stringify(this.smmryResult));

  }

  // Filter XML content of the file
  public filterXmlFromFile(filter, file) {
    const parser = new xml2js.Parser();
    const builder = new xml2js.Builder();
    const data = fs.readFileSync(file);
    parser.parseString(data, (err2, fileXmlContent) => {
      console.log('Parsed XML \n' + util.inspect(fileXmlContent, false, null));
      Object.keys(fileXmlContent).forEach(eltKey => {
        fileXmlContent[eltKey] = this.filterElement(fileXmlContent[eltKey], filter, file);
      });
      if (this.smmryUpdatedFiles[file] != null && this.smmryUpdatedFiles[file].updated === true) {
        const updatedObjectXml = builder.buildObject(fileXmlContent);
        fs.writeFileSync(file, updatedObjectXml);
        console.log('Updated ' + file);
      }
    });
  }

  public filterElement(elementValue, filter, file) {
    const self = this;
    // Object case
    if (typeof elementValue === 'object') {
      Object.keys(elementValue).forEach(eltKey => {
        let found = false;
        // Browse filter exclude_list for elementValue
        filter.exclude_list.forEach(excludeDef => {

          if (excludeDef.type_tag === eltKey) {
            // Found matching type tag
            found = true;
            console.log('\nFound type: ' + eltKey);
            console.log(elementValue[eltKey]);
            // Filter type values
            const typeValues = elementValue[eltKey];
            const newTypeValues = [];
            typeValues.forEach(typeItem => {
              if (excludeDef.values.includes(typeItem[excludeDef.identifier_tag]) || excludeDef.values.includes(typeItem[excludeDef.identifier_tag][0])) {
                console.log('----- filtered ' + typeItem[excludeDef.identifier_tag]);
                if (self.smmryUpdatedFiles[file] == null) {
                  self.smmryUpdatedFiles[file] = { updated: true, excluded: {} };
                }
                if (self.smmryUpdatedFiles[file].excluded[excludeDef.type_tag] == null) {
                  self.smmryUpdatedFiles[file].excluded[excludeDef.type_tag] = [];
                }
                self.smmryUpdatedFiles[file].excluded[excludeDef.type_tag].push(typeItem[excludeDef.identifier_tag][0]);
              } else {
                console.log('--- kept ' + typeItem[excludeDef.identifier_tag]);
                newTypeValues.push(typeItem);
              }
            });
            elementValue[eltKey] = newTypeValues;
          }
        });
        if (!found) {
          elementValue[eltKey] = self.filterElement(elementValue[eltKey], filter, file);
        }
      });
    } else if (Array.isArray(elementValue)) {
      const newElementValue = [];
      elementValue.forEach(element => {
        element = self.filterElement(element, filter, file);
        newElementValue.push(element);
      });
      elementValue = newElementValue;
    }
    return elementValue;
  }

}
