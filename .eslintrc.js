module.exports = {
	"extends": "google",
	"env": {
		"es6": true
	},
	rules: {
		'max-len': [ 2, {
			code: 120,
			tabWidth: 2,
			ignoreUrls: true,
			ignoreTrailingComments: true
		}],
		'key-spacing': ["error", { "mode": "minimum" }],
		'require-jsdoc': 0
	}
};
