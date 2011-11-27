function OperationError(statusCode, code, description) {
	this.code = code || ''
	this.description = description || ''
	this.statusCode = statusCode || ''
	this.explanation = statusCode == 403 ? 'Unauthorized': ''
}
module.exports = OperationError
