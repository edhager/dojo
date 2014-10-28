define('testing/tests-intern/functional/_base/loader/modules/full', [
	'./anon',
	'../../../../unit/_base/loader/a',
	'./wrapped',
	'require'
], function (anon, a, wrapped, require) {
	return {
		twiceTheAnswer: a.number + require('../../../../unit/_base/loader/a').number
	};
});
