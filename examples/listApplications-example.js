/** This example shows you how to list the applications from a VCAP
 * cloud */

var vcap = require('../index');
var credentials = require('./credentials');

var client = new vcap.Client(credentials.endpoint);

// List all my current applications
client.login(credentials.user, credentials.password, function(err, token) {
  if(err) return console.log('Login error: ' + err);
  client.listApplications(function(err, apps) {
    if(err) return console.log('An error occurred while listing the applications: ', err);
    console.log(apps);
  });
});
