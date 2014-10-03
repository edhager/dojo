var testArgs = (window.parent.loaderTestArgs) || {
	async: 1,
	baseUrl: '.'
};

var requirejsArgs = requirejsArgs || {
	dojoLocation: '../../../../..'
};

var dojoConfig = {
	async: testArgs.async,
	baseUrl: testArgs.baseUrl || '.',
	packages: [
		{ name: 'testing', location: requirejsArgs.dojoLocation },
		{ name:'dojo', location: requirejsArgs.dojoLocation + '/node_modules/dojo' },
		{ name:'dojox', location: requirejsArgs.dojoLocation + '/node_modules/dojo/../dojox' }
	],
	has: {
		'dojo-requirejs-api': 1,
		'config-tlmSiblingOfDojo': 0
	}
};

if (typeof require !== 'undefined') {
	(function () {
		for (var p in require) {
			dojoConfig[p]= require[p];
		}
	})();
}
