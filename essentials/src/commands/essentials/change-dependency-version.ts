import { Command, flags } from '@oclif/command'
import { FILE } from 'dns';

export default class ExecuteFilter extends Command {
  static description = `Allows to change an external package dependency version
  
   `

  static examples = [
    `$ sfdx change-dependency:execute -n FinServ -j 214 -m 7`,
  ]

  static flags = {
    // flag with a value (-n, --name=VALUE)
    namespace: flags.string({ char: 'n', description: 'Namespace of the managed package' }),
    majorversion: flags.string({ char: 'j', description: 'Major version' }),
    minorversion: flags.string({ char: 'm', description: 'Minor version' }),
    folder: flags.string({ char: 'f', description: 'SFDX project folder containing files' })
  }

  static args = []

  // Input params properties
  namespace
  majorversion
  minorversion
  folder

  // Internal properties
  fs = require('fs')
  xml2js = require('xml2js')
  util = require('util')
  glob = require('glob')

  // Runtime methods
  async run() {
    var self = this

    const { args, flags } = this.parse(ExecuteFilter)

    // Get input arguments or default values
    this.namespace = flags.namespace
    this.majorversion = flags.majorversion
    this.minorversion = flags.minorversion
    this.folder = flags.folder || '.'
    console.log(`Initialize update of dependencies in ${this.folder} with ${this.namespace} ${this.majorversion}.${this.minorversion}`)

    // Read files 
    var fileList = this.glob.sync('**/*.xml')

    // Replace dependencies in files 
    var parser = new this.xml2js.Parser();
    fileList.forEach(sfdxXmlFile => {
      this.fs.readFile(sfdxXmlFile, function (err, data) {
        // Parse XML file
        parser.parseString(data, function (err2, parsedXmlFile) {
          //console.log(`Parsed ${sfdxXmlFile} \n` + self.util.inspect(parsedXmlFile, false, null))
          // Check if packageVersions contains namespace
          var type = Object.keys(parsedXmlFile)[0]
          var objDescription = parsedXmlFile[type]
          var packageVersions = objDescription.packageVersions
          if (packageVersions == null)
            return
          var changed = false
          for (var i = 0; i < packageVersions.length; i++) {
            var dependency = packageVersions[i]
            // Update dependency in parsed XML object
            if (dependency.namespace[0] === self.namespace) {
              dependency.majorNumber[0] = self.majorversion
              dependency.minorNumber[0] = self.minorversion
              parsedXmlFile[type].packageVersions[i] = dependency
              changed = true
            }
          }
          if (changed) {
            // Update file
            var builder = new self.xml2js.Builder();
            var updatedObjectXml = builder.buildObject(parsedXmlFile);
            self.fs.writeFileSync(sfdxXmlFile, updatedObjectXml)
            console.log('- updated '+sfdxXmlFile+' with '+updatedObjectXml+'\n')
          }
        })
      })
    });
  }

}