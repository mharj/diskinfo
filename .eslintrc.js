module.exports = {
	"extends": "google",
	"env": {
		"es6": true
	},
	rules: {
		'max-len': [ 2, {
			code: 80,
			tabWidth: 2,
			ignoreUrls: true,
			ignoreTrailingComments: true
		}],
		'key-spacing': ["error", {
			"align": {
				"beforeColon": false,
				"afterColon": true,
				"on": "value"
			}
		}]
	}
};
