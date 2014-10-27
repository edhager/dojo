define([
	'./intern'
], function (intern) {
	intern.tunnel = 'NullTunnel';
	intern.tunnelOptions = {
		hostname: 'localhost',
		port: 4444
	};

	intern.environments = [
//		{ browserName: 'firefox' },
		{ browserName: 'chrome' }
	];

	// Non-functional test suite(s) to run in each browser
	intern.suites = [ ];

	// Functional test suite(s) to run in each browser once non-functional tests are completed
	intern.functionalSuites = [ 'testing/tests-intern/functional/_base/loader' ];

	return intern;
});
