const path = require('path');
const fs = require('fs');
process.env.TS_NODE_PROJECT = path.resolve('test/tsconfig.json');
if (!fs.existsSync('./test/tmp')) {
    console.log('Created test/tmp folder');
    fs.mkdirSync('./test/tmp');
}