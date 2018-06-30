import { Command, flags } from '@oclif/command'
import { FILE } from 'dns';

export default class ExecuteFilter extends Command {
  static description = ``

  static examples = []

  static flags = {
    folder: flags.string({ char: 'f', description: 'SFDX project folder containing files' }),
    uncommentKey: flags.string({ char: 'k', description: 'Uncomment key (default: SFDX_ESSENTIALS_UNCOMMENT)' })
    // flag with a value (-n, --name=VALUE)
  }

  static args = []

  // global variables
  folder = '.'
  uncommentKey = 'SFDX_ESSENTIALS_UNCOMMENT'
  totalUncomments = 0

  // Internal properties
  fs = require('fs')
  glob = require('glob')
  cint = require('cint')

  // Runtime methods
  async run() {

    // args
    const { args, flags } = this.parse(ExecuteFilter)

    this.folder = flags.folder || '.'
    this.uncommentKey = flags.uncommentKey || 'SFDX_ESSENTIALS_UNCOMMENT'

    // List apex classes
    var fetchClassesExpression = this.folder + '/classes/*.cls'
    console.log('Fetching classes with expression : ' + fetchClassesExpression)
    var customApexClassFileNameList = this.glob.sync(fetchClassesExpression)

    // Replace commented lines in each class
    var self = this
    customApexClassFileNameList.forEach(customApexClassFileName => {
      self.processFile(customApexClassFileName)
    })
    console.log('Completed uncomment in : ' + fetchClassesExpression)

    // List aura items
    var fetchAuraExpression = this.folder + '/aura/**/*.js'
    console.log('Fetching aura with expression : ' + fetchAuraExpression)
    var customAuraFileNameList = this.glob.sync(fetchAuraExpression)

    // Replace commented lines in each aura item
    var self = this
    customAuraFileNameList.forEach(customAuraFileName => {
      self.processFile(customAuraFileName)
    })
    console.log('Completed uncomment in : ' + fetchAuraExpression)    

  }

  // Process component file
  processFile(fileName) {
    // Read file
      var fileContent = this.fs.readFileSync(fileName)
      if (fileContent == null) {
        console.log('Warning: empty file -> ' + fileName)
        return
      }
      var arrayFileLines = fileContent.toString().split("\n");

      // Process file lines one by one
      var updated = false
      var updatedFileContent = ''
      arrayFileLines.forEach(line => {
        // Uncomment if SFDX_ESSENTIALS_UNCOMMENT is contained in a commented line (can be overriden sending uncommentKey argument)
        if (line.includes(this.uncommentKey)) {
          line = line.replace('//','').replace(this.uncommentKey,'').trim()
          console.log('- uncommented: '+line)
          line= line+ ' // Uncommented by sfdx essentials:uncomment (https://github.com/nvuillam/sfdx-essentials)'
          updated = true
        }
        updatedFileContent += line + '\n'
      })
      // Update file if content has been updated
      if (updated) {
        this.fs.writeFileSync(fileName, updatedFileContent)
        console.log('Updated ' + fileName)//+ ' with content :\n' + updatedFileContent)
      }

  }

}

