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
	var originalDir = process.cwd()
	process.chdir(dir)
	var child = spawn("zip", ["-y", "-q", "-r", outputFile,"."])
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
		if(code != 0) {
			callback(new OperationError(null, code, errorContent))
		} else {
			callback(null)
		}
	})
}
exports.zip = zip