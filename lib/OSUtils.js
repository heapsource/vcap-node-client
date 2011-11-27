var spawn = require('child_process').spawn
var OperationError = require('./OperationError.js')

function cp_rf(source, dest, callback) {
	var child = spawn("cp", ['-rf', source, dest])
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
		if(code != 0) {
			callback(new OperationError(null, code, errorContent))
		} else {
			callback(null)
		}
	})
}
exports.cp_rf = cp_rf
function copyProcessEnv() {
	var e = {}
	Object.keys(process.env).forEach(function(k) {
		e[k] = process.env[k]
	});
	return e
}
function zip(dir, outputFile, callback) {
	console.log("zip outputFile",outputFile, "dir", dir)
	var originalDir = process.cwd()
	process.chdir(dir)
	var child = spawn("zip", ["-y", "-q", "-r", outputFile,"."])
	//var child = spawn("pwd",[])
	process.chdir(originalDir)
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
		console.log("zip child stdout", outContent, "stderr", errorContent)
		if(code != 0) {
			callback(new OperationError(null, code, errorContent))
		} else {
			callback(null)
		}
	})
}
exports.zip = zip