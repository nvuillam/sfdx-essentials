const path = require('path');
const fs = require('fs');
process.env.TS_NODE_PROJECT = path.resolve('test/tsconfig.json');

// Create temp dir for tests
if (!fs.existsSync('./test/tmp')) {
    console.log('Created test/tmp folder');
    fs.mkdirSync('./test/tmp');
}

// Activate debug library
const debug = typeof v8debug === "object" || /--debug|--inspect|--inspect-brk/.test(process.execArgv.join(" "));
if (debug) {
    require("debug").enable("sfdx-essentials");
}

globalThis.SFDX_ESSENTIALS_TEST = true;