/**
 * Wrapper from accessing and requesting chrome permissions
 */
DuckieTV.factory('ChromePermissions', ["$q",
    function($q) {
        var isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1,
            isExtension = (('chrome' in window) && ('permissions' in chrome)),
            isOpera = navigator.vendor.toLowerCase().indexOf('opera');

        var service = {
            /**
             * Storage sync only supported in chrome extensions
             */
            isSupported: function() {
                return isChrome && isExtension;
            },
            /**
             * Verify that a permission is available in chrome
             */
            checkGranted: function(permission) {
                return $q(function(resolve, reject) {
                    console.info('Verify if permission is granted', permission);

                    if (!service.isSupported()) {
                        console.info('Nope, not chrome or an extension');
                        reject();
                    }
                    chrome.permissions.contains({
                        permissions: [permission]
                    }, function(supported) {
                        console.info(supported ? 'Permission ' + permission + ' granted.' : 'Permission ' + permission + ' denied.');
                        (supported && 'sync' in chrome.storage) ? resolve() : reject();
                    });
                });
            },
            requestPermission: function(permission) {
                return $q(function(resolve, reject) {
                    console.info('Request permission', permission);

                    if (!service.isSupported()) {
                        console.info('Nope, not chrome or an extension');
                        reject();
                    }
                    chrome.permissions.request({
                        permissions: [permission]
                    }, function(granted) {
                        console.info(granted ? 'Permission ' + permission + ' granted.' : 'Permission ' + permission + ' denied.');
                        (granted) ? resolve() : reject();
                    });
                });
            },
            revokePermission: function(permission) {
                return $q(function(resolve, reject) {
                    console.info('Revoke permission', permission);

                    if (!service.isSupported()) {
                        console.info('Nope, not chrome or an extension');
                        reject();
                    }
                    chrome.permissions.request({
                        permissions: [permission]
                    }, function(result) {
                        console.info(result ? 'Permission ' + permission + ' revoked.' : 'Permission ' + permission + ' not revoked.');
                        (result) ? resolve() : reject();
                    });
                });
            }
        };

        return service;
    }
])

/**
 * The Settings Service stores user preferences and provides defaults.
 * Storage is in localStorage. values get serialized on save and deserialized on initialization.
 *
 * Shorthands to the get and set functions are provided in $rootScope by the getSetting and setSetting functions
 */
.factory('SettingsService', ["$injector", "$rootScope", "ChromePermissions",
    function($injector, $rootScope, ChromePermissions) {
        var service = {
            settings: {},
            defaults: {
                'KickAssTorrents.mirror': 'https://kat.cr',
                'ThePirateBay.mirror': 'https://thepiratebay.se',
                'application.language': null,
                'application.locale': 'en_us',
                'autodownload.minSeeders': 50,
                'autodownload.period': 1,
                'background-rotator.opacity': '0.4',
                'calendar.mode': 'date',
                'calendar.show-specials': true,
                'calendar.show-downloaded': true,
                'calendar.startSunday': true,
                'client.determinedlocale': null,
                'lastSync': -1,
                'library.smallposters': true,
                'qbittorrent.server': 'http://localhost',
                'qbittorrent.port': 8080,
                'qbittorrent.use_auth': true,
                'qbittorrent.username': 'admin',
                'qbittorrent.password': 'admin',
                'series.displaymode': 'poster',
                'standalone.zoomlevel': 6,
                'storage.sync': false, // off by default so that permissions must be requested
                'sync.progress': true,
                'tixati.server': 'http://localhost',
                'tixati.port': 8888,
                'tixati.username': 'admin',
                'tixati.password': 'admin',
                'topSites.enabled': true,
                'topSites.mode': 'onhover',
                'torrenting.autodownload': false,
                'torrenting.autostop': true,
                'torrenting.client': 'uTorrent',
                'torrenting.directory': true,
                'torrenting.enabled': true,
                'torrenting.progress': true,
                'torrenting.searchprovider': 'KickAssTorrents',
                'torrenting.searchquality': '',
                'torrenting.streaming': true,
                'vuze.server': 'http://localhost',
                'vuze.port': 9091,
                'vuze.use_auth': true,
                'vuze.username': 'vuze',
                'vuze.password': '',
                'transmission.server': 'http://localhost',
                'transmission.port': 9091,
                'transmission.use_auth': true,
                'transmission.username': 'admin',
                'transmission.password': 'admin',
                'trakttv.passwordHash': null,
                'trakttv.sync': false,
                'trakttv.username': null
            },
            /**
             * Read a setting key and return either the stored value or the default
             * @param  string key to read
             * @return mixed value value of the setting
             */
            get: function(key) {
                return ((key in service.settings) ? service.settings[key] : (key in service.defaults) ? service.defaults[key] : false);
            },
            /**
             * Store a value in the settings object and persist the changes automatically.
             * @param string key key to store
             * @param mixed value to store
             */
            set: function(key, value) {
                service.settings[key] = value;
                if (key == 'calendar.startSunday') {
                    $injector.get('datePickerConfig').startSunday = value;
                }
                service.persist();
            },
            /**
             * Serialize the data and persist it in localStorage
             */
            persist: function() {
                localStorage.setItem('userPreferences', angular.toJson(service.settings, true));
            },
            /**
             * Fetch stored series from sqlite and store them in service.favorites
             */
            restore: function() {
                if (!localStorage.getItem('userPreferences')) {
                    service.defaults['topSites.enabled'] = ('chrome' in window && 'topSites' in (window.chrome));
                    service.settings = service.defaults;
                } else {
                    service.settings = angular.fromJson(localStorage.getItem('userPreferences'));
                }
            },
            /*
             * Change the UI language and locale to use for translations tmhDynamicLocale
             * Todo: clean this up.
             */
            changeLanguage: function(langKey) {
                langKey = angular.lowercase(langKey) || 'en_us';
                var locale = langKey;
                switch (langKey) {
                    case 'en_au':
                    case 'en_ca':
                    case 'en_gb':
                    case 'en_nz':
                        langKey = 'en_uk';
                        break;
                    case 'de':
                        langKey = 'de_de';
                        break;
                    case 'en':
                        langKey = 'en_us';
                        break;
                    case 'es':
                        langKey = 'es_es';
                        break;
                    case 'fr':
                        langKey = 'fr_fr';
                        break;
                    case 'it':
                        langKey = 'it_it';
                        break;
                    case 'ja':
                        langKey = 'ja_jp';
                        break;
                    case 'ko':
                        langKey = 'ko_kr';
                        break;
                    case 'nl':
                        langKey = 'nl_nl';
                        break;
                    case 'pt':
                    case 'pt_br':
                        langKey = 'pt_pt';
                        break;
                    case 'ru':
                        langKey = 'ru_ru';
                        break;
                    case 'sv':
                        langKey = 'sv_se';
                        break;
                    case 'zh':
                        langKey = 'zh_cn';
                        break;
                }
                service.set('application.language', langKey);
                service.set('application.locale', locale);
                $injector.get('$translate').use(langKey); // get these via the injector so that we don't have to use these dependencies hardcoded.
                $injector.get('tmhDynamicLocale').set(locale); // the SettingsService is also required in the background page and we don't need $translate there
                //console.info("Active Language", langKey, "; Active Locale", locale);
            }
        };
        service.restore();
        return service;
    }
])

/**
 * rootScope shorthand helper functions.
 */
.run(function($rootScope, SettingsService) {

    $rootScope.getSetting = function(key) {
        return SettingsService.get(key);
    };

    $rootScope.setSetting = function(key, value) {
        return SettingsService.set(key, value);
    };

    $rootScope.enableSetting = function(key) {
        SettingsService.set(key, true);
    };

    $rootScope.disableSetting = function(key) {
        SettingsService.set(key, false);
    };

})