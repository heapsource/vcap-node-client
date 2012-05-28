all: test/test.js
	node_modules/.bin/vows test/test.js --spec
