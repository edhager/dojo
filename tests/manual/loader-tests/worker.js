self.onmessage = function (event) {
	if (event.data.run) {
		try {
			// Load a long list of modules.
			require([
				'dojo/aspect',
				'dojo/date/locale',
				'dojo/currency',
				'dojo/Deferred',
				'dojo/i18n',
				'dojo/on',
				'dojo/when',
				'dojo/request/xhr',
				'dojo/store/Memory',
				'dojo/store/Observable',
				'dojo/store/Cache',
				'dojo/store/JsonRest',
				'dojo/text!./data1.json',
				'dojo/text!./data2.json',
				'dojo/text!./data3.json'
			], function(aspect, locale) {
				self.postMessage({
					success: true,
					date: locale.format(new Date(), {
						selector: 'date',
						formateLength: 'short'
					})
				});
			});
		} catch (e) {
			self.postMessage({
				success: false,
				error: e.stack
			});
		}
	}
};

