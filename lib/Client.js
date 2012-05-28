// Copyright (c) 2011 Firebase.co - http://www.firebase.co
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

var request = require('request')
var OperationError = require('./OperationError.js')
var fs = require('fs')
var spawn = require('child_process').spawn
var url = require('url')
var crypto = require('crypto');
var path = require('path')
var cp_rf = require('./OSUtils').cp_rf
var zip  = require('./OSUtils').zip
function Client(endpoint, auth_token) {
	this.apiEndpoint = endpoint
	this.endpoint = url.parse(endpoint).hostname
	this.auth_token = auth_token || null
}

Client.prototype.login = function(user, password, callback) {
	var self = this
	var uri = this.apiEndpoint + "/users/" + user + "/tokens"
	request({
		method: "POST",
		uri: uri,
		json:{
			password: password
		}
	}, function(e, response, body) {
    if(e) return callback(e);
		if(response.statusCode == 200) {
			self.auth_token = body.token
			callback(null, self.auth_token)
		}
    else if(response.statusCode == 403) { 
			callback(new OperationError(response.statusCode, 'Unauthorized', 'Invalid user or password'));
    }
		else {
			callback(new OperationError(response.statusCode, 'Unknown', 'Unknown error'));
		}
	})
}

Client.prototype.getApps = function(callback) {
	var self = this
	request({
		method: "GET",
		uri: this.apiEndpoint + "/apps",
		headers: {
			"authorization": this.auth_token
		}
	}, function(e, response, body) {
		if(e) {
			callback(new OperationError(null,null,e),null)
		}
		else if(response.statusCode == 200) {
			callback(null, JSON.parse(body))
		}
		else {
			callback(new OperationError(response.statusCode, body.code, body.description),null)
		}
	})
}

Client.prototype.createApp = function(manifest, callback) {
	var self = this
	request({
		method: "POST",
		uri: this.apiEndpoint + "/apps",
		headers: {
			"authorization": this.auth_token
		},
		json: manifest
	}, function(e, response, body) {
		if(e) {
			callback(new OperationError(null, null, e), null)
		}
		else if(response.statusCode == 302) {
			callback(null, body)
		}
		else {
			callback(new OperationError(response.statusCode, body.code, body.description),null)
		}
	})
}

Client.prototype.updateAppSources = function(appDir, appName, resources, callback) {
	var self = this
	this._stageTempApp(appDir, function(err, stageInfo) {
		if(err) {
			callback(err)
		} else {
			self._uploadApp(stageInfo.zipPath, appName, resources, callback)
		}
	})
}

Client.prototype._uploadApp = function(zipPath, appName, resources, callback) {
	var self = this
	fs.readFile(zipPath, function (err, data) {
	  	if (err) {
			callback(err);
		} else {
			var url = self.apiEndpoint + "/apps/" + appName + "/application"
			var child = spawn("curl", ['-XPOST', '-s', '-w%{http_code}', '-Fapplication=@' +zipPath + ';type=application/zip', '-F_method=put', '-Fresources=' + JSON.stringify(resources || [])  + '', '-HAuthorization:' + self.auth_token + '', url])
			child.stderr.setEncoding('utf8')
			var errorContent = '', outContent = ''
			child.stderr.on('data', function(data) {
				errorContent+=data
			})
			child.stdout.setEncoding('utf8')
			child.stdout.on('data', function(data) {
				outContent+=data
			})
			child.on('exit', function(code) {
				httpStatus = outContent.replace(/^\s+/g,'').replace(/\s+$/g,'')
				if(httpStatus != '200') {
					callback(new OperationError(httpStatus, code, errorContent))
				} else {
					callback(null)
				}
			})
		}
	});
}

function getTempDir() {
	var checkPaths = [
		{
			env: "TMPDIR",
		},
		{
			env: "TEMP",
		},
		{
			env: "TMP",
		},
		{
			fs: "/tmp"
		},
		{
			fs: "/var/tmp"
		},
		{
			fs: "/usr/tmp"
		}
	]
	for(var i = 0;i < checkPaths.length; i++) {
		var checkPath = checkPaths[i]
		if(checkPath.env) {
			var envPath = process.env[checkPath.env]
			if(envPath) {
				return envPath
			}
		} else {
			if(path.existsSync(checkPath.fs)) {
				return checkPath.fs
			}
		}
	}
}


Client.prototype._stageTempApp = function(appDir, callback) {
	var mainTempDir = getTempDir()
	var stageDir = null
	if(!mainTempDir) {
		throw "vcap staging requires a system temp dir"
	} else {
		var md5 = crypto.createHash('md5');
		md5.update(appDir)
		var stageName = md5.digest('hex');
		stageDir = path.join(mainTempDir, "vcap-" + stageName)

		if(path.exists(stageDir)) {
			fs.rmdirSync(stageDir)
		}
		cp_rf(appDir, stageDir, function(err) {
			if(err) {
				callback(err)
			} else {
				// Zip it.
				var zipPath =path.join(mainTempDir, "vcap-" + stageName + ".zip")
				if(path.exists(zipPath)) {
					fs.unlinkSync(zipPath)
				}
				zip(stageDir, zipPath, function(err) {
					if(err) {
						callback(err)
					} else {
						callback(null, {
							stageDir: stageDir,
							zipPath: zipPath
						})
					}
				})
			}
		})
	}
}

Client.prototype.getApp = function(name, callback) {
	var self = this
	request({
		method: "GET",
		uri: this.apiEndpoint + "/apps/" + name,
		headers: {
			"authorization": this.auth_token,
			"Accept": "application/json"
		}
	}, function(e, response, body) {
		if(response.statusCode == 200) {
			callback(null, JSON.parse(body))
		}
		else {
			callback(new OperationError(response.statusCode, body.code, body.description),null)
		}
	})
}

Client.prototype.updateApp = function(name, manifest, callback) {
	var self = this
	request({
		method: "PUT",
		uri: this.apiEndpoint + "/apps/" + name,
		headers: {
			"authorization": this.auth_token,
			"Accept": "application/json"
		},
		json: manifest
	}, function(e, response, body) {
		if(e) {
			callback(new OperationError(null, null, e), null)
		}
		else if(response.statusCode == 200) {
			callback(null, true)
		}
		else {
			callback(new OperationError(response.statusCode, body.code, body.description),null)
		}
	})
}

Client.prototype.getProvisionedServices = function(callback) {
	var self = this
	request({
		method: "GET",
		uri: this.apiEndpoint + "/services",
		headers: {
			"authorization": this.auth_token
		}
	}, function(e, response, body) {
		if(response.statusCode == 200) {
			callback(null, JSON.parse(body))
		}
		else {
			callback(new OperationError(response.statusCode, body.code, body.description),null)
		}
	})
}

Client.prototype.getSystemServices = function(callback) {
	var self = this
	request({
		method: "GET",
		uri: this.apiEndpoint + "/info/services",
		headers: {
			"authorization": this.auth_token
		}
	}, function(e, response, body) {
		if(response.statusCode == 200) {
			callback(null, JSON.parse(body))
		}
		else {
			callback(new OperationError(response.statusCode, body.code, body.description),null)
		}
	})
}

Client.prototype.createService = function(info, callback) {
	var self = this
	request({
		method: "POST",
		uri: this.apiEndpoint + "/services",
		headers: {
			"authorization": this.auth_token
		},
		json: info
	}, function(e, response, body) {
		if(response.statusCode == 200) {
			callback(null, body)
		}
		else {
			callback(new OperationError(response.statusCode, body.code, body.description),null)
		}
	})
}

module.exports = Client
