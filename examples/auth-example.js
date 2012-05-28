/* This example shows you how to login into a VCAP cloud, put your
 * credentials into credentials.json file.*/

var vcap = require('../index');
var credentials = require('./credentials');

// Create the client using the given endpoint.
var client = new vcap.Client(credentials.endpoint);

// Login with the given credentials
client.login(credentials.user, credentials.password, function(err, token) {
  if(err) return console.log('Login error:', err);
  console.log('Auth success, token is', token);
});
