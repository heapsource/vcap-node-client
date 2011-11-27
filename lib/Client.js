var request = require('request')
var OperationError = require('./OperationError.js')
var fs = require('fs')
var spawn = require('child_process').spawn

function Client(endpoint, auth_token) {
	this.apiEndpoint = endpoint ? "http://api." + endpoint : ''
	this.endpoint = endpoint || ''
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
		console.warn(uri)
		if(response.statusCode == 200) {
			self.auth_token = body.token
			callback(null, self.auth_token)
		}
		else {
			callback(new OperationError(response.statusCode, body.code, body.description),null)
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
		if(response.statusCode == 200) {
			callback(null, body)
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
		if(response.statusCode == 302) {
			callback(null, body)
		}
		else {
			callback(new OperationError(response.statusCode, body.code, body.description),null)
		}
	})
}

Client.prototype.uploadApp = function(zipPath, appName, manifest, callback) {
	var self = this
	fs.readFile(zipPath, function (err, data) {
	  	if (err) {
			callback(err);
		} else {
			var url = self.apiEndpoint + "/apps/" + appName + "/application"
			var child = spawn("curl", ['-XPOST', '-s', '-w%{http_code}', '-Fapplication=@' +zipPath + ';type=application/zip', '-F_method=put', '-Fresources=' + JSON.stringify(manifest || [])  + '', '-HAuthorization:' + self.auth_token + '', url])
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
	console.warn("updateApp app", manifest)
	request({
		method: "PUT",
		uri: this.apiEndpoint + "/apps/" + name,
		headers: {
			"authorization": this.auth_token,
			"Accept": "application/json"
		},
		json: manifest
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