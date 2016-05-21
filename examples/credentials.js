var fs = require('fs');
var path = require('path');

var credentialsFilePath = path.join(__dirname, 'credentials.json');
if(!fs.existsSync(credentialsFilePath)) {
  throw "Before running any example, be sure to put your cloud credentials in the examples/credentials.json file. Use examples/credentials-sample.json as an guide";
}
var credentials = JSON.parse(fs.readFileSync(credentialsFilePath));
module.exports = credentials;
