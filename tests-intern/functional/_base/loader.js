/*jshint -W117*/
/*jshint -W101*/
define([
	'intern!object',
	'intern/chai!assert',
	'dojo/dom-construct',
	'dojo/has',
	'dojo/_base/lang',
	'dojo/Deferred',
	'dojo/promise/all',
	'dojo/_base/url',
	'require',
	'intern/dojo/node!leadfoot/helpers/pollUntil'
//	'dojo/has!dojo-amd-factory-scan?./loader/modules',
//	'dojo/has!dojo-publish-privates?./loader/moduleIds'
], function (registerSuite, assert, domConstruct, has, lang, Deferred, all, url, require, pollUntil) {

	function beginLoaderTest(url, testFn, readyFn) {
		return testFn(this.get('remote')
			.setExecuteAsyncTimeout(5000)
			.get(require.toUrl(url))
			.then(pollUntil(readyFn || documentReady)));
	}

	function documentReady() {
		return document.readyState === 'complete' || null;
	}

	function readyVar() {
		return window.ready || null;
	}

	// test equality of items from different contexts
	function itemsAreEqual(item1, item2) {
		if (lang.isArray(item1)) {
			return arraysAreEqual(item1, item2);
		}
		if (lang.isObject(item1)) {
			return objectsAreEqual(item1, item2);
		}
		return item1 === item2;
	}

	// test equality of arrays from different contexts
	function arraysAreEqual(array1, array2) {
		if (array1.length !== array2.length) {
			return false;
		}

		for (var i = 0; i < array1.length; i++) {
			if (!itemsAreEqual(array1[i], array2[i])) {
				return false;
			}
		}

		return true;
	}

	// test equality of objects from different contexts
	function objectsAreEqual(object1, object2) {
		for (var k in object1) {
			if (!itemsAreEqual(object1[k], object2[k])) {
				return false;
			}
		}

		return true;
	}

	var suite = {
		name: 'dojo/_base/loader',

		'async with Dojo require': function () {
			return beginLoaderTest.call(this, './loader/asyncWithDojoRequire.html', function (command) {
				return command.execute(function () {
					return window.syncFromAsyncModule;
				}).then(function (value) {
					assert.strictEqual(value, 'OK');
				});
			}, readyVar);
		},

		'config': (function () {
			function createConfigTest(search, configName) {
				return function () {
					return beginLoaderTest.call(this, './loader/config.html?' + search,
						function (command) {
							return command.executeAsync(function (configName, callback) {
								require([ 'dojo', 'dojo/has'], function (dojo, has) {
									var config = window[configName];
									var data = {
										baseUrl: require.baseUrl,
										config: config,
										requireConfig: require.rawConfig,
										dojoConfig: dojo.config
									};
									var hasResults = {};
									for (var key in config.has) {
										hasResults[key] = has(key);
									}
									data.has = hasResults;
									callback(data);
								});
							}, [configName]).then(function (data) {
								var config = data.config;
								var requireConfig = data.requireConfig;
								var dojoConfig = data.dojoConfig;

								assert.strictEqual(requireConfig.baseUrl, config.baseUrl);
								assert.strictEqual(requireConfig.waitSeconds, config.waitSeconds);
								assert.strictEqual(requireConfig.locale, config.locale);
								objectsAreEqual(requireConfig.has, config.has);
								assert.strictEqual(requireConfig.cats, config.cats);
								assert.strictEqual(requireConfig.a, config.a);
								assert.ok(arraysAreEqual(requireConfig.b, config.b));

								assert.strictEqual(data.baseUrl, config.baseUrl + '/');
								for (var key in data.has) {
									assert.ok(data.has[key]);
								}
								assert.isUndefined(require.cats);
								assert.isUndefined(require.a);
								assert.isUndefined(require.b);

								assert.strictEqual(dojoConfig.baseUrl, config.baseUrl + '/');
								assert.strictEqual(dojoConfig.waitSeconds, config.waitSeconds);
								assert.strictEqual(dojoConfig.locale, config.locale);
								assert.strictEqual(dojoConfig.cats, config.cats);
								assert.strictEqual(dojoConfig.a, config.a);
								assert.ok(arraysAreEqual(dojoConfig.b, config.b));
							});
						});
				};
			}

			var testDescriptions = [
				{ search: 'djConfig', configName: '_djConfig' },
				{ search: 'djConfig-require', configName: '_djConfig' },
				{ search: 'dojoConfig', configName: '_dojoConfig' },
				{ search: 'dojoConfig-djConfig', configName: '_dojoConfig' },
				{ search: 'dojoConfig-djConfig-require', configName: '_dojoConfig' },
				{ search: 'dojoConfig-require', configName: '_dojoConfig' },
				{ search: 'require', configName: '_require' }
			];
			var tests = {};
			var test;

			while ((test = testDescriptions.shift())) {
				tests[test.search] = createConfigTest(test.search, test.configName);
			}

			return tests;
		})(),

		'config sniff': function () {
			return beginLoaderTest.call(this, './loader/config-sniff.html',
				function (command) {
					return command.executeAsync(function (callback) {
						require(['dojo'], function (dojo) {
							callback({
								requireConfig: require.rawConfig,
								dojoConfig: dojo.config,
								async: require.async,
								baseUrl: require.baseUrl,
								cats: require.cats === undefined,
								a: require.a === undefined,
								b: require.b === undefined
							});
						});
					}).then(function (data) {
						var requireConfig = data.requireConfig;
						var dojoConfig = data.dojoConfig;

						assert.equal(requireConfig.async, true);
						assert.strictEqual(requireConfig.baseUrl, '../../../..');
						assert.strictEqual(requireConfig.waitSeconds, 6);
						assert.strictEqual(requireConfig.cats, 'dojo-config-dogs');
						assert.strictEqual(requireConfig.a, 2);
						assert.ok(arraysAreEqual(requireConfig.b, [ 3, 4, 5 ]));

						assert.equal(data.async, true);
						assert.strictEqual(data.baseUrl, '../../../../');
						assert.isTrue(data.cats);
						assert.isTrue(data.a);
						assert.isTrue(data.b);

						assert.strictEqual(dojoConfig.baseUrl, '../../../../');
						assert.strictEqual(dojoConfig.cats, 'dojo-config-dogs');
						assert.strictEqual(dojoConfig.a, 2);
						assert.ok(arraysAreEqual(dojoConfig.b, [ 3, 4, 5 ]));
					});
				});
		},

		'config sniff djConfig': function () {
			return beginLoaderTest.call(this, './loader/config-sniff-djConfig.html',
				function (command) {
					return command.executeAsync(function (callback) {
						require(['dojo'], function (dojo) {
							callback({
								requireConfig: require.rawConfig,
								dojoConfig: dojo.config,
								async: require.async,
								baseUrl: require.baseUrl,
								cats: require.cats === undefined,
								a: require.a === undefined,
								b: require.b === undefined
							});
						});
					}).then(function (data) {
						var requireConfig = data.requireConfig;
						var dojoConfig = data.dojoConfig;

						assert.equal(requireConfig.async, true);
						assert.strictEqual(requireConfig.baseUrl, '../../../..');
						assert.strictEqual(requireConfig.waitSeconds, 6);
						assert.strictEqual(requireConfig.cats, 'dojo-config-dogs');
						assert.strictEqual(requireConfig.a, 2);
						assert.ok(arraysAreEqual(requireConfig.b, [ 3, 4, 5 ]));

						assert.equal(data.async, true);
						assert.strictEqual(data.baseUrl, '../../../../');
						assert.isTrue(data.cats);
						assert.isTrue(data.a);
						assert.isTrue(data.b);

						assert.strictEqual(dojoConfig.baseUrl, '../../../../');
						assert.strictEqual(dojoConfig.cats, 'dojo-config-dogs');
						assert.strictEqual(dojoConfig.a, 2);
						assert.ok(arraysAreEqual(dojoConfig.b, [ 3, 4, 5 ]));
					});
				});
		},

		'config has': function () {
			return beginLoaderTest.call(this, './loader/config-has.html',
				function (command) {
					return command.executeAsync(function (callback) {
						require([ 'dojo/has' ], function (has) {
							callback({
								requireConfig: require.rawConfig,
								has: {
									'config-someConfigSwitch': has('config-someConfigSwitch'),
									'config-isDebug': has('config-isDebug'),
									'config-anotherConfigSwitch': has('config-anotherConfigSwitch'),
									'some-has-feature': has('some-has-feature')
								}
							});
						});
					}).then(function (data) {
						var requireConfig = data.requireConfig;
						assert.strictEqual(requireConfig.someConfigSwitch, 0);
						assert.strictEqual(requireConfig.isDebug, 1);
						assert.strictEqual(requireConfig.anotherConfigSwitch, 2);

						assert.strictEqual(data.has['config-someConfigSwitch'], 0);
						assert.strictEqual(data.has['config-isDebug'], 1);
						assert.strictEqual(data.has['config-anotherConfigSwitch'], 2);
						assert.strictEqual(data.has['some-has-feature'], 5);
					}).executeAsync(function (callback) {
						// setting an existing config variable after boot does *not* affect the has cache
						require([ 'dojo/has' ], function (has) {
							require({ someConfigSwitch: 3 });
							callback({
								requireConfig: require.rawConfig,
								'config-someConfigSwitch': has('config-someConfigSwitch')
							});
						});
					}).then(function (data) {
						assert.strictEqual(data.requireConfig.someConfigSwitch, 3);
						assert.strictEqual(data['config-someConfigSwitch'], 0);
					}).executeAsync(function (callback) {
						// but, we can add new configfeatures any time
						require([ 'dojo/has' ], function (has) {
							require({ someNewConfigSwitch: 4 });
							callback({
								requireConfig: require.rawConfig,
								'config-someNewConfigSwitch': has('config-someNewConfigSwitch')
							});
						});
					}).then(function (data) {
						assert.strictEqual(data.requireConfig.someNewConfigSwitch, 4);
						assert.strictEqual(data['config-someNewConfigSwitch'], 4);
					}).executeAsync(function (callback) {
						// setting an existing has feature via config after boot does *not* affect the has cache
						require([ 'dojo/has' ], function (has) {
							require({ has: { 'some-has-feature': 6 } });
							callback({
								'some-has-feature': has('some-has-feature')
							});
						});
					}).then(function (data) {
						assert.strictEqual(data['some-has-feature'], 5);
					}).executeAsync(function (callback) {
						// setting an existing has feature via has.add does *not* affect the has cache...
						require([ 'dojo/has' ], function (has) {
							has.add('some-has-feature', 6);
							callback({
								'some-has-feature': has('some-has-feature')
							});
						});
					}).then(function (data) {
						assert.strictEqual(data['some-has-feature'], 5);
					}).executeAsync(function (callback) {
						// ...*unless* you use force...
						require([ 'dojo/has' ], function (has) {
							has.add('some-has-feature', 6, 0, 1);
							callback({
								'some-has-feature': has('some-has-feature')
							});
						});
					}).then(function (data) {
						assert.strictEqual(data['some-has-feature'], 6);
					}).executeAsync(function (callback) {
						// but, we can add new has features any time
						require([ 'dojo/has' ], function (has) {
							require({ has: { 'some-new-has-feature': 7 } });
							callback({
								'some-new-has-feature': has('some-new-has-feature')
							});
						});
					}).then(function (data) {
						assert.strictEqual(data['some-new-has-feature'], 7);
					});
				});
		},

		'declare steps on provide': function () {
			return beginLoaderTest.call(this, './loader/declareStepsOnProvide.html',
				function (command) {
					return command.executeAsync(function (callback) {
						require([ 'dojo', 'dojo/tests-intern/_base/loader/declareStepsOnProvideAmd' ],
							function (dojo, DeclareStepsOnProvideAmd) {
								var data = {};
								var instance = new DeclareStepsOnProvideAmd();
								data.status1 = instance.status();

								// requiring declareStepsOnProvideAmd caused
								// declareStepsOnProvide to load which loaded *two* modules
								// and dojo.declare stepped on both of them
								instance = new (require('dojo/tests-intern/_base/loader/declareStepsOnProvide1'))();
								data.status2 = instance.status();
								callback(data);
							});
					}).then(function (data) {
						assert.strictEqual(data.status1, 'OK');
						assert.strictEqual(data.status2, 'OK-1');
					});
				});
		},

		'publish require result': (function () {
			function createTest(publish) {
				return function () {
					return beginLoaderTest.call(this, './loader/publishRequireResult.html' + (publish ? '' : '?do-not-publish'),
						function (command) {
							return command.executeAsync(function (callback) {
								var dojo = this.dojo;

								dojo.setObject('dojo.tests._base.loader.pub1', 'do-not-mess-with-me');
								dojo.require('dojo.tests._base.loader.pub1');
								dojo.require('dojo.tests._base.loader.pub2');

								require([ 'dojo/has' ], function (has) {
									callback({
										pub1: dojo.tests._base.loader.pub1,
										pub2Status: dojo.tests._base.loader.pub2 && dojo.tests._base.loader.pub2.status,
										dojoConfigPublishRequireResult: !!dojo.config.publishRequireResult,
										hasPublishRequireResult: !!has('config-publishRequireResult')
									});
								});
							}).then(function (data) {
								assert.strictEqual(data.pub1, 'do-not-mess-with-me');

								if (publish) {
									assert.isTrue(data.hasPublishRequireResult);
									assert.strictEqual(data.pub2Status, 'ok');
								} else {
									assert.isFalse(data.hasPublishRequireResult);
									assert.isFalse(data.dojoConfigPublishRequireResult);
									assert.isTrue(data.pub2Status == null);
								}
							});
						});
				};
			}

			return {
				'publish': createTest(true),
				'no publish': createTest()
			};
		})(),

		'top level module by paths': function () {
			return beginLoaderTest.call(this, './loader/paths.html',
				function (command) {
					return command.executeAsync(function (callback) {
						var myModule1Value = {};
						var myModule2Value = {};

						define('myModule1', [], myModule1Value);
						define('myModule2', [], myModule2Value);

						require({
							aliases: [
								// yourModule --> myModule1
								[ 'yourModule', 'myModule1' ],

								// yourOtherModule --> myModule1
								[ /yourOtherModule/, 'myModule1' ],

								// yourModule/*/special --> yourModule/common/special
								// this will result in a resubmission to finally resolve in the next one
								[ /yourOtherModule\/([^\/]+)\/special/, 'yourOtherModule/common/special' ],

								// yourModule/common/special --> myModule2
								// notice the regex above also finds yourOtherModule/common/special;
								// the extra parenthesized subexprs make this have priority
								[ /(yourOtherModule\/(common))\/special/, 'myModule2' ]
							],
							paths: { myTopLevelModule: './tests-intern/functional/_base/loader/myTopLevelModule' }
						});

						require([
							'myTopLevelModule',
							'myModule1',
							'myModule2',
							'yourModule',
							'yourOtherModule',
							'yourOtherModule/stuff/special'
						], function (myModule, myModule1, myModule2, yourModule, yourOtherModule, special) {
							// top level module via path
							var myTopLevelModule = window.myTopLevelModule;
							var results =
								myModule1Value === myModule1 &&
								myModule1Value === yourModule &&
								myModule1Value === yourOtherModule &&
								myModule2Value === myModule2 &&
								myModule2Value === special &&
								myTopLevelModule.name === 'myTopLevelModule' &&
								myTopLevelModule.myModule.name === 'myTopLevelModule.myModule';
							callback(results);
						});
					}).then(function (data) {
						assert.isTrue(data);
					});
				});
		},

		'xdomain': (function () {
			function createTest(queryString) {
				return function () {
					return beginLoaderTest.call(this, './loader/xdomain/xdomain.html' + (queryString || ''),
						function (command) {
							return command.executeAsync(function (callback) {
								function makeResults(actual, expected, message) {
									return {
										actual: actual,
										expected: expected,
										message: message
									};
								}

								var testArgs = this.testArgs;
								var expectedSequence = this.expectedSequence;
								var xdomainExecSequence = this.xdomainExecSequence;
								var xdomainLog = this.xdomainLog;

								define('dijit', [ 'dojo' ], function (dojo) {
									return dojo.dijit;
								});
								define('dojox', [ 'dojo' ], function (dojo) {
									return dojo.dojox;
								});

								require([ 'dojo', 'dojo/ready' ], function (dojo, ready) {
									if (!('legacyMode' in require)) {
										assert.strictEqual(define.vendor, 'dojotoolkit.org');
										callback([makeResults(define.vendor, 'dojotoolkit.org')]);
										return;
									}

									// pretend that everything except the stuff in dojo/tests/_base/loader/xdomain is xdomain
									require.isXdUrl = function (url) {
										return !/loader\/xdomain/.test(url) && !/syncBundle/.test(url);
									};

									// each of these dojo.requires a xdomain module which puts the loader in xdomain loading mode,
									// then dojo.requires a local tree of modules with various loading challenges. Many of the loading
									// challenges are in local1; therefore we test when that module causes the xdomain shift and when
									// the loader is already in xdomain when that module is demanded
									if (testArgs.variation === 1) {
										dojo.require('dojo.tests-intern._base.loader.xdomain.local1');

										//>>excludeStart('srcVersion', kwArgs.copyTests=='build');
										if (testArgs.async === 0) {
											// can't stop the local module from completely executing...
											xdomainLog.push(11, dojo['tests-intern']._base.loader.xdomain.local1 === 'stepOnLocal1');
											xdomainLog.push(12, dojo.require('dojo.tests-intern._base.loader.xdomain.local1') === 'stepOnLocal1');
											xdomainLog.push(13, require('dojo/tests-intern/_base/loader/xdomain/local1') === 'stepOnLocal1');
										}
										else {
											xdomainLog.push(11, dojo.getObject('dojo.tests-intern._base.loader.xdomain.local1') === undefined);
										}
										//>>excludeEnd('srcVersion');
									}
									else {
										dojo.require('dojo.tests-intern._base.loader.xdomain.local2');
										//>>excludeStart('srcVersion', kwArgs.copyTests=='build');
										if (testArgs.async === 0) {
											// can't stop the local module from completely executing...
											xdomainLog.push(11, dojo['tests-intern']._base.loader.xdomain.local2.status === 'local2-loaded');
											xdomainLog.push(12, dojo.require('dojo.tests-intern._base.loader.xdomain.local2').status === 'local2-loaded');
											xdomainLog.push(13, require('dojo/tests-intern/_base/loader/xdomain/local2').status === 'local2-loaded');
										}
										else {
											xdomainLog.push(11, dojo.getObject('dojo.tests-intern._base.loader.xdomain.local2') === undefined);
										}

										xdomainLog.push(16, dojo.getObject('dojo.tests-intern._base.loader.xdomain.local1') === undefined);

										if (dojo.isIE !== 6) {
											try {
												require('dojo/tests-intern/_base/loader/xdomain/local1');
												xdomainLog.push(19, false);
											}
											catch (e) {
												xdomainLog.push(19, true);
											}
										}
										//>>excludeEnd('srcVersion');
									}

									// but none of the modules after going into xdomain loading should be executed
									// (WARNING: ie might look different because of its strange caching behavior)
									xdomainLog.push(14, (dojo.hash === undefined));
									xdomainLog.push(15, (dojo.cookie === undefined));
									xdomainLog.push(17, dojo.getObject('dojo.tests-intern._base.loader.xdomain.local3') === undefined);

									if (dojo.isIE !== 6) {
										try {
											require('dojo/tests-intern/_base/loader/xdomain/local3');
											xdomainLog.push(18, false);
										}
										catch (e) {
											xdomainLog.push(18, true);
										}
									}

									ready(function () {
										var results = [], throwTest = false;
										for (var i = 0; i < xdomainLog.length; i += 2) {
											results.push(makeResults(!!xdomainLog[i + 1], true, 'failed at id = ' + xdomainLog[i]));
										}

										results.push(makeResults(xdomainExecSequence.join(';'), expectedSequence));

										results.push(makeResults(dojo['tests-intern']._base.loader.xdomain.local1, 'stepOnLocal1'));
										results.push(makeResults(dojo.getObject('dojo.tests-intern._base.loader.xdomain.local1'), 'stepOnLocal1'));
										results.push(makeResults(dojo.require('dojo.tests-intern._base.loader.xdomain.local1'), 'stepOnLocal1'));
										results.push(makeResults(require('dojo/tests-intern/_base/loader/xdomain/local1'), 'stepOnLocal1'));

										results.push(makeResults(dojo['tests-intern']._base.loader.xdomain.local1SteppedOn, 'stepOn1SteppedOn'));
										results.push(makeResults(dojo.getObject('dojo.tests-intern._base.loader.xdomain.local1SteppedOn'), 'stepOn1SteppedOn'));
										results.push(makeResults(dojo.require('dojo.tests-intern._base.loader.xdomain.local1SteppedOn'), 'stepOn1SteppedOn'));
										results.push(makeResults(require('dojo/tests-intern/_base/loader/xdomain/local1SteppedOn'), 'stepOn1SteppedOn'));

										results.push(makeResults(dojo['tests-intern']._base.loader.xdomain.local1NotSteppedOn.status, 'local1NotSteppedOn'));
										results.push(makeResults(dojo.getObject('dojo.tests-intern._base.loader.xdomain.local1NotSteppedOn.status'), 'local1NotSteppedOn'));
										results.push(makeResults(dojo.require('dojo.tests-intern._base.loader.xdomain.local1NotSteppedOn').status, 'local1NotSteppedOn'));
										results.push(makeResults(require('dojo/tests-intern/_base/loader/xdomain/local1NotSteppedOn').status, 'local1NotSteppedOn'));

										results.push(makeResults(dojo['tests-intern']._base.loader.xdomain['local1-dep'].status, 'dojo.tests-intern._base.loader.xdomain.local1-dep-ok'));
										results.push(makeResults(dojo.getObject('dojo.tests-intern._base.loader.xdomain.local1-dep.status'), 'dojo.tests-intern._base.loader.xdomain.local1-dep-ok'));
										results.push(makeResults(dojo.require('dojo.tests-intern._base.loader.xdomain.local1-dep').status, 'dojo.tests-intern._base.loader.xdomain.local1-dep-ok'));
										results.push(makeResults(require('dojo/tests-intern/_base/loader/xdomain/local1-dep').status, 'dojo.tests-intern._base.loader.xdomain.local1-dep-ok'));

										results.push(makeResults(dojo['tests-intern']._base.loader.xdomain['local1-runtimeDependent1'].status, 'dojo.tests-intern._base.loader.xdomain.local1-runtimeDependent1-ok'));
										results.push(makeResults(dojo.getObject('dojo.tests-intern._base.loader.xdomain.local1-runtimeDependent1.status'), 'dojo.tests-intern._base.loader.xdomain.local1-runtimeDependent1-ok'));
										results.push(makeResults(dojo.require('dojo.tests-intern._base.loader.xdomain.local1-runtimeDependent1').status, 'dojo.tests-intern._base.loader.xdomain.local1-runtimeDependent1-ok'));
										results.push(makeResults(require('dojo/tests-intern/_base/loader/xdomain/local1-runtimeDependent1').status, 'dojo.tests-intern._base.loader.xdomain.local1-runtimeDependent1-ok'));

										results.push(makeResults(dojo.getObject('dojo.tests-intern._base.loader.xdomain.local1-runtimeDependent').status, 'ok'));

										results.push(makeResults(dojo['tests-intern']._base.loader.xdomain['local1-runtimeDependent2'], undefined));
										results.push(makeResults(dojo.getObject('dojo.tests-intern._base.loader.xdomain.local1-runtimeDependent2'), undefined));

										try {
											require('dojo/tests-intern/_base/loader/xdomain/local1/runtimeDependent2');
										} catch (e) {
											throwTest = true;
										}
										results.push(makeResults(throwTest, true));

										results.push(makeResults(dojo['tests-intern']._base.loader.xdomain['local1-browser'].status, 'dojo.tests-intern._base.loader.xdomain.local1-browser-ok'));
										results.push(makeResults(dojo.getObject('dojo.tests-intern._base.loader.xdomain.local1-browser.status'), 'dojo.tests-intern._base.loader.xdomain.local1-browser-ok'));
										results.push(makeResults(dojo.require('dojo.tests-intern._base.loader.xdomain.local1-browser').status, 'dojo.tests-intern._base.loader.xdomain.local1-browser-ok'));
										results.push(makeResults(require('dojo/tests-intern/_base/loader/xdomain/local1-browser').status, 'dojo.tests-intern._base.loader.xdomain.local1-browser-ok'));

										results.push(makeResults(!!dojo.cookie, true));
										results.push(makeResults(dojo.getObject('dojo.cookie'), dojo.cookie));
										results.push(makeResults(require('dojo/cookie'), dojo.cookie));

										if (testArgs.variation !== 1) {
											results.push(makeResults(!!dojo.hash, true));
											results.push(makeResults(dojo.getObject('dojo.hash'), dojo.hash));
											results.push(makeResults(require('dojo/hash'), dojo.hash));
										}

										callback(results);
									});
								});
							}).then(function (data) {
								var test;
								while ((test = data.shift())) {
									assert.isTrue(itemsAreEqual(test.actual, test.expected), test.message);
								}
							});
						});
				};
			}

			return {
				'sync 1': createTest('?variation=1'),
				'sync 2': createTest('?variation=2'),
				'async 1': createTest('?async=legacyAsync'),
				'async 2': createTest('?async=legacyAsync&variation=2')
			};
		})(),

		'requirejs': (function () {
			function createSyncAsyncTests(url, test, readyFn) {
				return {
					'sync': function () {
						return beginLoaderTest.call(this, url, test, readyFn);
					},
					'async': function () {
						var sep = url.indexOf('?') >= 0 ? '&' : '?';
						return beginLoaderTest.call(this, url + sep + 'async', test, readyFn);
					}
				};
			}

			var tests = {
				'simple': createSyncAsyncTests.call(this, './loader/requirejs/simple.html', function (command) {
					return command.executeAsync(function (callback) {
						require({
							baseUrl: './'
						}, [
							'map', 'simple', 'dimple', 'func'
						], function (map, simple, dimple, func) {
							callback({
								mapName: map.name,
								simpleColor: simple.color,
								dimpleColor: dimple.color,
								funcOut: func()
							});
						});
					}).then(function (data) {
						assert.strictEqual(data.mapName, 'map');
						assert.strictEqual(data.simpleColor, 'blue');
						assert.strictEqual(data.dimpleColor, 'dimple-blue');
						assert.strictEqual(data.funcOut, 'You called a function');
					}).executeAsync(function (callback) {
						var path = this.location.href.replace(/simple\.html.*$/, 'foo');
						var index = path.indexOf(':');
						var noProtocolPath = path.substring(index + 1, path.length).replace(/foo/, 'bar');
						var self = this;

						console.log('this.location.href = ' + this.location.href);
						console.log('path = ' + path);
						console.log('noProtocolPath = ' + noProtocolPath);

						require([ path, noProtocolPath ], function () {
							callback({
								fooName: self.foo.name,
								barName: self.bar.name
							});
						});
					}).then(function (data) {
						assert.strictEqual(data.fooName, 'foo');
						assert.strictEqual(data.barName, 'bar');
					});
				}),

				'config': createSyncAsyncTests.call(this, './loader/requirejs/config.html', function (command) {
					return command.execute(function () {
						return window.testData;
					}).then(function (data) {
						assert.strictEqual(data.simpleColor, 'blue');
						assert.strictEqual(data.dimpleColor, 'dimple-blue');
						assert.strictEqual(data.funcOut, 'You called a function');
					});
				}, function () {
					return window.testData;
				}),

				'simple, no head': createSyncAsyncTests.call(this, './loader/requirejs/simple-nohead.html', function (command) {
					return command.executeAsync(function (callback) {
						require([ 'simple', 'dimple', 'func'], function (simple, dimple, func) {
							callback({
								simpleColor: simple.color,
								dimpleColor: dimple.color,
								funcOut: func()
							});
						});
					}).then(function (data) {
						assert.strictEqual(data.simpleColor, 'blue');
						assert.strictEqual(data.dimpleColor, 'dimple-blue');
						assert.strictEqual(data.funcOut, 'You called a function');
					});
				}),

				'circular': function () {
					return beginLoaderTest.call(this, './loader/requirejs/circular.html?async',
						function (command) {
							return command.executeAsync(function (callback) {
								require(['require', 'two', 'funcTwo', 'funcThree'],
									function (require, two, FuncTwo, funcThree) {
										var args = two.doSomething();
										var twoInst = new FuncTwo('TWO');
										callback({
											size: args.size,
											color: args.color,
											name: twoInst.name,
											oneName: twoInst.oneName(),
											three: funcThree('THREE')
										});
									});
							}).then(function (data) {
								assert.strictEqual(data.size, 'small');
								assert.strictEqual(data.color, 'redtwo');
								assert.strictEqual(data.name, 'TWO');
								assert.strictEqual(data.oneName, 'ONE-NESTED');
								assert.strictEqual(data.three, 'THREE-THREE_SUFFIX');
							});
						});
				},

				'url fetch': createSyncAsyncTests.call(this, './loader/requirejs/urlfetch/urlfetch.html', function (command) {
					return command.executeAsync(function (callback) {
						require({
							baseUrl: './',
							paths: {
								'one': 'two',
								'two': 'two',
								'three': 'three',
								'four': 'three'
							}
						}, [ 'one', 'two', 'three', 'four' ], function (one, two, three, four) {
							var scripts = document.getElementsByTagName('script');
							var counts = {};
							var url;

							//First confirm there is only one script tag for each module
							for (var i = scripts.length - 1; i > -1; i--) {
								url = scripts[i].src;
								if (url) {
									if (!(url in counts)) {
										counts[url] = 0;
									}
									counts[url] += 1;
								}
							}

							var data = {
								oneName: one.name,
								twoOneName: two.oneName,
								twoName: two.name,
								threeName: three.name,
								fourThreeName: four.threeName,
								fourName: four.name
							};
							if (require.async) {
								data.counts = [];
								for (var prop in counts) {
									data.counts.push(counts[prop]);
								}
							}
							callback(data);
						}).then(function (data) {
							var count;
							while ((count = data.counts.shift()) !== undefined) {
								assert.strictEqual(count, 1);
							}
							assert.strictEqual(data.oneName, 'one');
							assert.strictEqual(data.twoOneName, 'one');
							assert.strictEqual(data.twoName, 'two');
							assert.strictEqual(data.threeName, 'three');
							assert.strictEqual(data.fourThreeName, 'three');
							assert.strictEqual(data.fourName, 'four');
						});
					});
				}),

				// TODO: there are more of the i18n tests...
				'i18n': {
					'i18n': (function () {
						function i18nTest(command) {
							return command.executeAsync(function (callback) {
								//Allow locale to be set via query args.
								var locale = null;
								var query = this.location.href.split('#')[0].split('?')[1];
								var match = query && query.match(/locale=([\w-]+)/);
								if (match) {
									locale = match[1];
								}

								//Allow bundle name to be loaded via query args.
								var bundle = 'i18n!nls/colors';
								match = query && query.match(/bundle=([^\&]+)/);
								if (match) {
									bundle = match[1];
								}

								var red = 'red';
								var blue = 'blue';
								var green = 'green';

								if (locale && locale.indexOf('en-us-surfer') !== -1 || bundle.indexOf('nls/en-us-surfer/colors') !== -1) {
									red = 'red, dude';
								}
								else if ((locale && locale.indexOf('fr-') !== -1) || bundle.indexOf('fr-') !== -1) {
									red = 'rouge';
									blue = 'bleu';
								}

								require([ 'dojo' ], function (dojo) {
									// dojo/i18n! looks at dojo.locale
									locale && (dojo.locale = locale);
									require([ bundle ], function (colors) {
										callback({
											red: {actual: colors.red, expected: red},
											blue: {actual: colors.blue, expected: blue},
											green: {actual: colors.green, expected: green}
										});
									});
								}).then(function (data) {
									assert.strictEqual(data.red.actual, data.red.expected);
									assert.strictEqual(data.blue.actual, data.blue.expected);
									assert.strictEqual(data.green.actual, data.green.expected);
								});
							});
						}

						return {
							'locale unknown': createSyncAsyncTests.call(this, './loader/requirejs/i18n/i18n.html?bundle=i18n!nls/fr-fr/colors', i18nTest),
							'base': createSyncAsyncTests.call(this, './loader/requirejs/i18n/i18n.html', i18nTest),
							'locale': createSyncAsyncTests.call(this, './loader/requirejs/i18n/i18n.html?locale=en-us-surfer', i18nTest),
							'bundle': createSyncAsyncTests.call(this, './loader/requirejs/i18n/i18n.html?bundle=i18n!nls/en-us-surfer/colors', i18nTest)
						};
					})(),

					'common': (function () {
						function commonTest(command) {
							return command.executeAsync(function (callback) {
								//Allow locale to be set via query args.
								var locale = null;
								var query = this.location.href.split('#')[0].split('?')[1];
								var match = query && query.match(/locale=([\w-]+)/);

								if (match) {
									locale = match[1];
								}

								var red = 'red';
								var blue = 'blue';

								if (locale && locale.indexOf('en-us-surfer') !== -1) {
									red = 'red, dude';
								}
								else if ((locale && locale.indexOf('fr-') !== -1)) {
									red = 'rouge';
									blue = 'bleu';
								}

								require([ 'dojo' ], function (dojo) {
									// dojo/i18n! looks at dojo.locale
									locale && (dojo.locale = locale);
									require([ 'commonA', 'commonB' ], function (commonA, commonB) {
										callback({
											commonA: {actual: commonA, expected: red},
											commonB: {actual: commonB, expected: blue},
										});
									});
								});
							}).then(function (data) {
								assert.strictEqual(data.commonA.actual, data.commonA.expected);
								assert.strictEqual(data.commonB.actual, data.commonB.expected);
							});
						}

						return {
							'base': createSyncAsyncTests.call(this, './loader/requirejs/i18n/i18n.html', commonTest),
							'locale': createSyncAsyncTests.call(this, './loader/requirejs/i18n/i18n.html?locale=en-us-surfer', commonTest)
						};
					})()
				},

				'paths': createSyncAsyncTests.call(this, './loader/requirejs/paths/paths.html', function (command) {
					return command.executeAsync(function (callback) {
						var scriptCounter = 0;
						var self = this;

						require({
							baseUrl: './',
							packages: [
								{
									name: 'first',
									location: 'first.js',
									main: './first'
								}
							]
						}, [ 'first!whatever' ], function (first) {
							//First confirm there is only one script tag for each
							//module:
							var scripts = self.document.getElementsByTagName('script');
							var modName;

							for (var i = scripts.length - 1; i > -1; i--) {
								modName = scripts[i].getAttribute('src');
								if (/first\.js$/.test(modName)) {
									scriptCounter += 1;
								}
							}

							var result = {
								async: require.async,
								globalCounter: self.globalCounter,
								name: first.name,
								secondName: first.secondName

							};
							if (require.async) {
								result.scriptCounter = scriptCounter;
							}
							callback(result);
						});
					}).then(function (data) {
						if (data.async) {
							assert.strictEqual(data.scriptCounter, 1);
						}

						assert.strictEqual(data.globalCounter, 2);
						assert.strictEqual(data.name, 'first');
						assert.strictEqual(data.secondName, 'second');
					});
				}),

				'relative': createSyncAsyncTests.call(this, './loader/requirejs/relative/relative.html', function (command) {
					return command.executeAsync(function (callback) {
						// alias dojo's text module to text!
						window.define('text', [ 'dojo/text' ], function (text) {
							return text;
						});

						require({
							baseUrl: require.has('host-browser') ? './' : './relative/',
							paths: {
								text: '../../text'
							}
						}, [ 'foo/bar/one' ], function (one) {
							callback({
								name: one.name,
								twoName: one.twoName,
								threeName: one.threeName,
								message: one.message.replace(/\r|\n/g, '')
							});
						});
					}).then(function (data) {
						assert.strictEqual(data.name, 'one');
						assert.strictEqual(data.twoName, 'two');
						assert.strictEqual(data.threeName, 'three');
						assert.strictEqual(data.message, 'hello world');
					});
				})

//				'text': (function () {
//					function textTest(context, useAlias) {
//						var require = context.require;
//						var define = context.define;
//						var dfd = createDeferred();
//
//						if (useAlias) {
//							// alias dojo's text module to text!
//							require({ aliases: [ [ 'text', 'testing/text' ] ] });
//						}
//						else {
//							define('text', [ 'testing/text' ], function (text) { return text; });
//						}
//
//						require({
//							baseUrl: './',
//							paths: {
//								text: '../../text'
//							}
//						}, [
//							'widget',
//							'local',
//							'text!resources/sample.html!strip'
//						],
//						dfd.callback(function (widget, local, sampleText) {
//							function check(expected, actual) {
//								assert.strictEqual(actual.replace(/\r|\n/g, ''), expected);
//							}
//
//							check('<span>Hello World!</span>', sampleText);
//							check('<div data-type="widget"><h1>This is a widget!</h1><p>I am in a widget</p></div>', widget.template);
//							check('subwidget', widget.subWidgetName);
//							check('<div data-type="subwidget"><h1>This is a subwidget</h1></div>', widget.subWidgetTemplate);
//							check('<span>This! is template2</span>', widget.subWidgetTemplate2);
//							check('<h1>Local</h1>', local.localHtml);
//						}));
//
//						return dfd.promise;
//					}
//
//					return {
//						alias: createSyncAsyncTests('./loader/requirejs/text/text.html', function () {
//							return textTest(this, true);
//						}),
//
//						'non-alias': createSyncAsyncTests('./loader/requirejs/text/text.html', function () {
//							return textTest(this);
//						})
//					};
//				})(),
//
//				'text only': createSyncAsyncTests('./loader/requirejs/text/textOnly.html', function () {
//					var dfd = createDeferred();
//
//					// alias dojo's text module to text!
//					define('text', [ 'testing/text' ], function (text) { return text; });
//
//					require({
//						baseUrl: './',
//						paths: {
//							text: '../../text'
//						}
//					}, [ 'text!resources/sample.html!strip'], dfd.callback(function (sampleText) {
//						assert.strictEqual(sampleText, '<span>Hello World!</span>');
//					}));
//
//					return dfd.promise;
//				}),
//
//				'exports': createTest('./loader/requirejs/exports/exports.html', function () {
//					var dfd = createDeferred();
//
//					try {
//						require({
//							baseUrl: require.has('host-browser') ? './' : './exports/'
//						}, [
//							'vanilla',
//							'funcSet',
//							'assign',
//							'assign2',
//							'usethis',
//							'implicitModule',
//							'simpleReturn'
//						], dfd.callback(function(vanilla, funcSet, assign, assign2, usethis, implicitModule, simpleReturn) {
//							assert.strictEqual(vanilla.name, 'vanilla');
//							assert.strictEqual(funcSet, 'funcSet');
//							assert.strictEqual(assign, 'assign');
//							assert.strictEqual(assign2, 'assign2');
//							//TODO: not implemented in dojo assert.strictEqual(usethis.name, 'usethis');
//							assert.strictEqual(implicitModule(), 'implicitModule');
//							assert.strictEqual(simpleReturn(), 'simpleReturn');
//						}));
//					} catch (e) {
//						console.error(e);
//					}
//
//					return dfd.promise;
//				})
			};
//
//			function badBaseTest() {
//				var self = this;
//				var dfd1 = createDeferred();
//
//				// set the base URL
//				require({ baseUrl: baseUrl + '/loader/requirejs/' });
//
//				require([ '../../functional/_base/loader/requirejs/simple', 'dimple', 'func' ], dfd1.callback(function (simple, dimple, func) {
//					assert.strictEqual(simple.color, 'blue');
//					assert.strictEqual(dimple.color, 'dimple-blue');
//					assert.strictEqual(func(), 'You called a function');
//				}));
//
//				//This test is only in the HTML since it uses an URL for a require
//				//argument. It will not work well in say, the Rhino tests.
//				var path = this.location.href.replace(/simple-badbase\.html$/, 'foo');
//				var index = path.indexOf(':');
//				var noProtocolPath = path.substring(index + 1, path.length).replace(/foo/, 'bar');
//				var dfd2 = createDeferred();
//
//				require([ path, noProtocolPath ], dfd2.callback(function () {
//					assert.strictEqual(self.foo.name, 'foo');
//					assert.strictEqual(self.bar.name, 'bar');
//				}));
//
//				return all([ dfd1.promise, dfd2.promise ]);
//			}
//
//			if (has('ie') > 6) {
//				tests['simple, bad base async'] = createTest('./loader/requirejs/simple-badbase.html', badBaseTest, { async: 1 });
//			}
//			tests['simple, bad base sync'] = createTest('./loader/requirejs/simple-badbase.html', badBaseTest, { async: 0 });
//
//			if (has('dojo-requirejs-api')) {
//				tests.dataMain = createSyncAsyncTests('./loader/requirejs/dataMain.html', function (simple) {
//					assert.strictEqual(simple.color, 'blue');
//				}),
//
//				tests.depoverlap = createSyncAsyncTests('./loader/requirejs/depoverlap.html', function (uno) {
//					//First confirm there is only one script tag for each module:
//					var scripts = this.document.getElementsByTagName('script');
//					var i;
//					var counts = {};
//					var modName;
//					var something;
//
//					for (i = scripts.length - 1; i > -1; i--) {
//						modName = scripts[i].getAttribute('data-requiremodule');
//						if (modName) {
//							if (!(modName in counts)) {
//								counts[modName] = 0;
//							}
//							counts[modName] += 1;
//						}
//					}
//
//					//Now that we counted all the modules make sure count
//					//is always one.
//					for (var prop in counts){
//						assert.strictEqual(counts[prop], 1);
//					}
//
//					assert.strictEqual(uno.name, 'uno');
//					something = uno.doSomething();
//					assert.strictEqual(something.dosName, 'dos');
//					assert.strictEqual(something.tresName, 'tres');
//				});
//			}
//
//			if (has('dojo-amd-factory-scan')) {
//				tests.uniques = createSyncAsyncTests('./loader/requirejs/uniques/uniques.html', function () {
//					var dfd = createDeferred();
//
//					require({
//							baseUrl: './'
//					}, [ '../../functional/_base/loader/requirejs/one', 'two', 'three' ], dfd.callback(function (one, two, three) {
//						assert.strictEqual(one.name, 'one');
//						assert.strictEqual(one.threeName, 'three');
//						assert.strictEqual(one.threeName2, 'three');
//						assert.strictEqual(two.oneName, 'one');
//						assert.strictEqual(two.oneName2, 'one');
//						assert.strictEqual(two.name, 'two');
//						assert.strictEqual(two.threeName, 'three');
//						assert.strictEqual(three.name, 'three');
//					}));
//
//					return dfd.promise;
//				});
//			}

			return tests;
		})()

//		'config/test': createTest('./loader/config/test.html', function () {
//
//			require({
//				config: {
//					'loader/someModule': {
//						someConfig: 'this is the config for someModule-someConfig'
//					},
//					'pkgMapped/m1': {
//						globalConfig: 'globalConfigForpkgMapped/m1',
//						isMapped: true
//					},
//					'pkgMapped/m2': {
//						globalConfig: 'globalConfigForpkgMapped/m2'
//					}
//				}
//			});
//
//			var dfd1 = createDeferred();
//
//			require([
//				'loader/someModuleConfiggedPriorToBoot',
//				'loader/someModule'
//			], dfd1.rejectOnError(function (someModuleConfiggedPriorToBoot, someModule) {
//				assert.ok(objectsAreEqual(someModuleConfiggedPriorToBoot.getConfig(), {
//					someConfig: 'this is the config for someModuleConfiggedPriorToBoot'
//				}));
//				assert.ok(objectsAreEqual(someModule.getConfig(), {
//					someConfig: 'this is the config for someModule-someConfig'
//				}));
//				assert.ok(objectsAreEqual(someModule.m1.getConfig(), {
//					globalConfig: 'globalConfigForpkgMapped/m1',
//					isMapped: true,
//					configThroughMappedRefForM1: 'configThroughMappedRefForM1'
//				}));
//				assert.ok(objectsAreEqual(someModule.m2.getConfig(), {
//					globalConfig: 'globalConfigForpkgMapped/m2',
//					configThroughMappedRefForM1: 'configThroughMappedRefForM1',
//					config1: 'mapped-config1',
//					config2: 'mapped-config2',
//					config3: 'mapped-config3'
//				}));
//
//				setTimeout(function () {
//					require({
//						config: {
//							'loader/someModule': {
//								someMoreConfig:
//									'this is the config for someModule-someMoreConfig'
//							}
//						}
//					});
//
//					require(['loader/someModule'], dfd1.callback(function (someModule) {
//						assert.ok(objectsAreEqual(someModule.getConfig(), {
//							someConfig: 'this is the config for someModule-someConfig',
//							someMoreConfig: 'this is the config for someModule-someMoreConfig'
//						}));
//					}));
//				}, 10);
//			}));
//
//			var dfd2 = createDeferred();
//
//			require({
//				config: {
//					'pkg/m1': { globalConfig: 'globalConfigForM1' },
//					'pkg/m2': { globalConfig: 'globalConfigForM2' }
//				}
//			}, [ 'pkg/m1', 'pkg/m2' ], dfd2.callback(function (m1, m2) {
//				assert.ok(objectsAreEqual(m1.getConfig(), { globalConfig: 'globalConfigForM1' }));
//				assert.ok(objectsAreEqual(m2.getConfig(), {
//					globalConfig: 'globalConfigForM2',
//					config1: 'config1',
//					config2: 'config2',
//					config3: 'config3'
//				}));
//			}));
//
//			return all([ dfd1.promise, dfd2.promise ]);
//		}),
//
//		'mapping': createTest('./loader/mapping.html', function () {
//			var dfd = createDeferred();
//
//			// simulate a built layer, this is added to dojo.js by the builder
//			require({
//				cache: {
//					'my/replacement/A': function () {
//						define([ '../A' ], function () {
//							return { it: 'is a replacement module' };
//						});
//					},
//					'my/A': function () {
//						define([ './B' ], function () {
//							return { it: 'is the original module' };
//						});
//					},
//					'my/B': function () {
//						define([], function () {
//							return { it: 'is a module dependency' };
//						});
//					}
//				}
//			});
//
//			// consume pending cache, the following are added at the end of a built dojo.js in a closure
//			require({ cache: {} });
//			!require.async && require([ 'dojo' ]);
//			require.boot && require.apply(null, require.boot);
//
//			// begin test:
//			// moving modules from the pending cache to the module cache should ignore
//			// any mapping, pathing, or alias rules
//			var handle = require.on('error', function (e) {
//				dfd.reject(e);
//			});
//
//			dfd.promise.always(function () {
//				handle.remove();
//			});
//
//			require([ 'my/A' ], dfd.callback(function (A) {
//				assert.equal(A.it, 'is a replacement module');
//			}));
//
//			return dfd.promise;
//		})
	};
//
//	if (has('dojo-publish-privates')) {
//		suite['config API'] = createTest('./loader/configApi.html', function () {
//
//			var expectedConfig1;
//			var expectedConfig2;
//			var called1;
//			var called2;
//			var savedRawConfig;
//			var configListener1 = function (config, rawConfig) {
//				called1 = true;
//				savedRawConfig = rawConfig;
//				assert.strictEqual(config, expectedConfig1);
//			};
//			var configListener2 = function(config, rawConfig){
//				called2 = true;
//				savedRawConfig = rawConfig;
//				assert.strictEqual(config, expectedConfig2);
//			};
//			var configListeners = require.listenerQueues.config ||
//				(require.listenerQueues.config = []);
//			var listenerCount = configListeners.length;
//			var h1 = require.on('config', configListener1);
//			var h2 = require.on('config', configListener2);
//
//			assert.strictEqual(configListeners.length, listenerCount+2);
//			assert.strictEqual(configListeners[listenerCount], configListener1);
//			assert.strictEqual(configListeners[listenerCount+1], configListener2);
//			expectedConfig1 = expectedConfig2 = {
//				someFeature: 1
//			};
//
//			called1 = called2 = 0;
//			require(expectedConfig1);
//			assert.ok(called1);
//			assert.ok(called2);
//
//			h1.remove();
//			assert.strictEqual(configListeners.length, listenerCount+1);
//			assert.strictEqual(configListeners[listenerCount], configListener2);
//			expectedConfig1 = expectedConfig2 = {
//				someFeature: 0,
//				someOtherFeature: 1
//			};
//
//			called1 = called2 = 0;
//			require(expectedConfig1);
//			assert.strictEqual(called1, 0);
//			assert.ok(called2);
//			assert.strictEqual(savedRawConfig.someFeature, 0);
//			assert.strictEqual(savedRawConfig.someOtherFeature, 1);
//			h2.remove();
//
//			require({ async: 1 });
//			assert.strictEqual(require.async, true);
//			assert.strictEqual(require.legacyMode, false);
//
//			require({ async: true });
//			assert.strictEqual(require.async, true);
//			assert.strictEqual(require.legacyMode, false);
//
//			require({ async: 2 });
//			assert.strictEqual(require.async, true);
//			assert.strictEqual(require.legacyMode, false);
//
//			require({ async: 'nonsense'});
//			assert.strictEqual(require.async, true);
//			assert.strictEqual(require.legacyMode, false);
//
//			require({ async: 0 });
//			assert.strictEqual(require.async, false);
//			assert.strictEqual(require.legacyMode, 'sync');
//
//			require({ async: false });
//			assert.strictEqual(require.async, false);
//			assert.strictEqual(require.legacyMode, 'sync');
//
//			require({ async: 'sync'});
//			assert.strictEqual(require.async, false);
//			assert.strictEqual(require.legacyMode, 'sync');
//
//			require({ async: 'legacyAsync'});
//			assert.strictEqual(require.async, false);
//			assert.strictEqual(require.legacyMode, 'legacyAsync');
//		});
//
//		suite.internals = function () {
//			var compactPath = require.compactPath;
//			assert.strictEqual('../../../mytests', compactPath('../../dojo/../../mytests'));
//			assert.strictEqual('module', compactPath('module'));
//			assert.strictEqual('a/b', compactPath('a/./b'));
//			assert.strictEqual('b', compactPath('a/../b'));
//			assert.strictEqual('a/b/c/d', compactPath('a/./b/./c/./d'));
//			assert.strictEqual('d', compactPath('a/../b/../c/../d'));
//			assert.strictEqual('a/d', compactPath('a/b/c/../../d'));
//			assert.strictEqual('a/b/c/d', compactPath('a/b/c/././d'));
//			assert.strictEqual('a/b', compactPath('./a/b'));
//			assert.strictEqual('../a/b', compactPath('../a/b'));
//			assert.strictEqual('', compactPath(''));
//		};
//	}

	registerSuite(suite);
});

