/*
 * Translation configuration.
 */
DuckieTV

.constant('availableLanguageKeys', [
    'de_de', 'en_au', 'en_nz', 'en_uk', 'en_us', 'es_es', 'fr_fr', 'it_it', 'ja_jp', 'ko_kr', 'nl_nl', 'pt_pt', 'ru_ru', 'sl_si', 'sv_se', 'zh_cn'
])

.constant('customLanguageKeyMappings', {
    'de*': 'de_de',
    'en*': 'en_us',
    'ca': 'en_uk',
    'en_ca': 'en_uk',
    'en_CA': 'en_uk',
    'gb': 'en_uk',
    'en_gb': 'en_uk',
    'en_GB': 'en_uk',
    'es*': 'es_es',
    'fr*': 'fr_fr',
    'it*': 'it_it',
    'ja*': 'ja_jp',
    'ko*': 'ko_kr',
    'nl*': 'nl_nl',
    'pt*': 'pt_pt',
    'ru*': 'ru_ru',
    'si*': 'sl_si',
    'sv*': 'sv_se',
    'zh*': 'zh_cn'
})

.config(["$translateProvider", "availableLanguageKeys", "customLanguageKeyMappings",
    function($translateProvider, availableLanguageKeys, customLanguageKeyMappings) {

        $translateProvider
        /*
         * Escape all outputs from Angular Translate for security, not that
         * it is really needed in this case but it stops throwing a warning
         */
        .useSanitizeValueStrategy('escaped')

        /*
         * setup path to the translation table files
         * example ../_Locales/en_us.json
         */
        .useStaticFilesLoader({
            prefix: '_locales/',
            suffix: '.json'
        })

        /*
         * help the determinePreferredLanguage module match a find
         * with one of our provided languages
         */
        .registerAvailableLanguageKeys(availableLanguageKeys, customLanguageKeyMappings)

        /*
         * default language
         */
        .preferredLanguage('en_us')

        /*
         * determine the local language
         *
         * Using this method at our own risk! Be aware that each browser can return different values on these properties.
         * It searches for values in the window.navigator object in the following properties (also in this order):
         *
         * navigator.languages[0]
         * navigator.language
         * navigator.browserLanguage
         * navigator.systemLanguage
         * navigator.userLanguage
         *
         * if it becomes problematic, use $translateProvider.preferredLanguage('en_us'); here to set a default
         * or $translate.use('en_us'); in a controller or service.
         */
        .determinePreferredLanguage()

        .fallbackLanguage('en_us')

        // error logging. missing keys are sent to $log
        .useMissingTranslationHandler('duckietvMissingTranslationHandler');
    }
])

/*
 * Custom Missing Translation key Handler
 */
.factory("duckietvMissingTranslationHandler", ["$translate", "SettingsService",
    function($translate, SettingsService) {
        var previousKeys = []; // list of missing keys we have processed once already
        var appLocale = SettingsService.get('application.locale'); // the application language the user wants

        return function(translationID, lang) {
            if (lang !== appLocale) {
                // ignore translation errors until the appLocale's translation table has been loaded
                return translationID;
            }
            if (previousKeys.indexOf(lang + translationID) !== -1) {
                // we have had this key already, do nothing
                return translationID;
            } else {
                // first time we have had this key, log it
                previousKeys.push(lang + translationID);
                console.warn("Translation for (" + lang + ") key " + translationID + " doesn't exist");
                return translationID;
            }
        };
    }
])

.run(function(SettingsService, $translate, datePickerConfig) {

    SettingsService.set('client.determinedlocale', $translate.proposedLanguage() === undefined ? 'en_us' : angular.lowercase($translate.proposedLanguage()));

    var configuredLocale = SettingsService.get('application.locale') || $translate.proposedLanguage();

    console.info('client determined locale proposed:', $translate.proposedLanguage(), 'set:', SettingsService.get('client.determinedlocale'), 'configured:', configuredLocale);
    SettingsService.changeLanguage(angular.lowercase(configuredLocale));

    datePickerConfig.startSunday = SettingsService.get('calendar.startSunday');

});