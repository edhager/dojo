define([
	'intern!object',
	'intern/chai!assert',
	'require',
	'module',

	// use the dojo package that was used to kick start the tests
	'../../../../_base/kernel',

	'./modules/anon',
	'./modules/wrapped',

	// remember that all the packages will base based at the package used to start the tests, 'base'
	'./modules/full',

	'./modules/data',
	'./modules/factoryArity',
	'./modules/factoryArityExports',
	'./modules/idFactoryArity',
	'./modules/idFactoryArityExports'
], function (registerSuite, assert, require, module, dojo, anon, wrapped) {
	var packageName = module.id.slice(0, module.id.indexOf('/'));

	// test AMD module API
	registerSuite({
		name: 'dojo/_base/loader/modules',

		modules: function () {
			assert.strictEqual(anon.theAnswer, 42);
			assert.strictEqual(require('./modules/anon').five, 5);
			assert.strictEqual(wrapped.five, 5);
			assert.deepEqual(
				dojo.require(packageName + '.tests-intern.functional._base.loader.modules.wrapped'),
				require('./modules/wrapped')
			);
			assert.strictEqual(require('./modules/full').twiceTheAnswer, 84);
			assert.strictEqual(require('./modules/data').five, 5);

			assert.strictEqual(require('./modules/factoryArity').module.id, packageName + '/tests-intern/functional/_base/loader/modules/factoryArity');
			assert.strictEqual(require('./modules/factoryArity').id, 'factoryArity');
			assert.strictEqual(require('./modules/factoryArity').impliedDep, 'impliedDep1');

			assert.strictEqual(require('./modules/factoryArityExports').module.id, packageName + '/tests-intern/functional/_base/loader/modules/factoryArityExports');
			assert.strictEqual(require('./modules/factoryArityExports').id, 'factoryArityExports');
			assert.strictEqual(require('./modules/factoryArityExports').impliedDep, 'impliedDep2');

			assert.strictEqual(require('./modules/idFactoryArity').module.id, packageName + '/tests-intern/functional/_base/loader/modules/idFactoryArity');
			assert.strictEqual(require('./modules/idFactoryArity').id, 'idFactoryArity');
			assert.strictEqual(require('./modules/idFactoryArity').impliedDep, 'impliedDep3');

			assert.strictEqual(require('./modules/idFactoryArityExports').module.id, packageName + '/tests-intern/functional/_base/loader/modules/idFactoryArityExports');
			assert.strictEqual(require('./modules/idFactoryArityExports').id, 'idFactoryArityExports');
			assert.strictEqual(require('./modules/idFactoryArityExports').impliedDep, 'impliedDep4');
		}
	});
});
