/** DOMParser Polyfill */
(function(DOMParser) {
    "use strict";

    var DOMParser_proto = DOMParser.prototype,
        real_parseFromString = DOMParser_proto.parseFromString;

    // Firefox/Opera/IE throw errors on unsupported types
    try {
        // WebKit returns null on unsupported types
        if ((new DOMParser).parseFromString("", "text/html")) {
            // text/html parsing is natively supported
            return;
        }
    } catch (ex) {}

    DOMParser_proto.parseFromString = function(markup, type) {
        if (/^\s*text\/html\s*(?:;|$)/i.test(type)) {
            var
                doc = document.implementation.createHTMLDocument("");
            if (markup.toLowerCase().indexOf('<!doctype') > -1) {
                doc.documentElement.innerHTML = markup;
            } else {
                doc.body.innerHTML = markup;
            }
            return doc;
        } else {
            return real_parseFromString.apply(this, arguments);
        }
    };
}(DOMParser));

/**
 * Helper class for more fluent parsing of HTML results in a document parsed from string
 * Example:
 *
 * var scraper = new HTMLScraper(response.data);
 * scraper.walkSelector('table tr:not(:first-child)', function(node) {
 *   scraper.walkNodes(node.querySelectorAll('td'), function(cell, idx) {
 *     // do something with cells for each row.
 *   });
 * });
 *
 */
var HTMLScraper = function(text) {
    var parser = new DOMParser();
    this.doc = parser.parseFromString(text, "text/html");

    this.walkSelector = function(selector, callback) {
        return this.walkNodes(this.querySelectorAll(selector), callback);
    };

    this.querySelector = function(selector) {
        return this.doc.querySelector(selector);
    };

    this.querySelectorAll = function(selector) {
        return this.doc.querySelectorAll(selector);
    };

    this.walkNodes = function(nodes, callback) {
        return Array.prototype.map.call(nodes, callback);
    };
    return this;
};

/**
 * Allow for easy prototype extension.
 * This means you can create a class, and extend another class onto it,
 * while overwriting specific prototype implementations.
 * Call the parent class's prototype methods by referring to prototype.constructor.
 */

Function.prototype.extends = function(ParentClass, prototypeImplementations) {
    this.prototype = Object.create(ParentClass.prototype);
    this.prototype.constructor = ParentClass;
    if (undefined === prototypeImplementations) {
        prototypeImplementations = {};
    }

    // add all prototypeImplementations to the non-prototype chain for this function.
    Object.keys(prototypeImplementations).map(function(key) {
        this.prototype[key] = prototypeImplementations[key];
    }, this);
};

console.log("%cDuckieTV", "color:transparent; font-size: 16pt; line-height: 125px; padding:25px; padding-top:30px; padding-bottom:60px; background-image:url(https://duckietv.github.io/DuckieTV/img/logo/icon128.png); background-repeat:no-repeat; ", "quack!\n\n\n\n\n\n");


if (localStorage.getItem('optin_error_reporting')) {
    /* duckietv_halp */
    if (!localStorage.getItem('optin_error_reporting.start_time')) {
        localStorage.setItem('optin_error_reporting.start_time', new Date().getTime());
    };
    // if opt-in was enabled for more than 7 days then disable it
    var localDT = new Date().getTime();
    var halpEnabled = new Date(parseInt(localStorage.getItem('optin_error_reporting.start_time')));
    var halpExpiryDT = new Date(halpEnabled.getFullYear(), halpEnabled.getMonth(), halpEnabled.getDate() + 7, halpEnabled.getHours(), halpEnabled.getMinutes(), halpEnabled.getSeconds()).getTime();
    var timeToHalpExpiry = (halpExpiryDT - localDT);
    if (timeToHalpExpiry > 0) {
        // set up error tracking
        console.info('Opt-In Error Tracking Service Enabled.');
        var s = document.createElement('script');
        s.type = 'text/javascript';
//        s.src = 'https://api.loggr.net/1/loggr.min.js?l=duckietv_halp&a=6586d951da1e4d43aa594bb63591af21';
/*
* switching to private tracker for #688, must remember to revoke this when ticket is closed.
*/
        s.src = 'https://api.loggr.net/1/loggr.min.js?l=duckietv_dev_halp&a=8c835f96de1e401597feb2389e4af473';  // garfield69's development testing loggr 
        document.body.appendChild(s);

        if (!localStorage.getItem('uniqueId')) {
            function guid() {
                function s4() {
                    return Math.floor((1 + Math.random()) * 0x10000)
                        .toString(16)
                        .substring(1);
                }
                return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                    s4() + '-' + s4() + s4() + s4();
            }
            localStorage.setItem('uniqueId', guid());
            console.info("Generated unique user identifier for opt-in error tracking:", localStorage.getItem('uniqueId'));
        }

        // trap runtime errors 
        window.onerror = function(msg, url, line) {
            var log = Loggr.Log;
            // dump UserPreferences
            var userPrefs = JSON.parse(localStorage.getItem('userPreferences'));
            Object.keys(userPrefs).map(function(key) {
                if (key.indexOf('password') > -1) {
                    userPrefs[key] = "*****";
                }
            });
            // dump local storage with exceptions to avoid overload.
            var dumpLocalStorage = JSON.parse(JSON.stringify(localStorage)); 
            ['userPreferences','torrenting.hashList','trakttv.token','trakttv.trending.cache','alarms','xem.mappings','snr.name-exceptions','snr.date-exceptions'].map(function(key) { delete dumpLocalStorage[key]; });
            var data = "Message: " + msg + "<br>";
            data += "URL: " + url + "<br>";
            data += "Line: " + line + "<br>";
            data += "Platform: " + navigator.platform + "<br>";
            data += "User Agent: " + navigator.userAgent + "<br>";
            data += "Config: <pre>" + angular.toJson(userPrefs, true) + "</pre>";
            data += "Local Storage (filtered): <pre>" + angular.toJson(dumpLocalStorage, true) + "</pre>";
            log.events.createEvent()
                .text("Runtime error: " + msg)
                .tags("error")
                .user(localStorage.getItem('uniqueId'))
                .dataType(Loggr.dataType.html)
                .data(data)
                .post();
            console.error(msg, url, line);
        };

        // trap console errors
        console.olderror = console.error;
        console.error = function() {
            console.olderror(arguments);
            var log = Loggr.Log;
            // filter out unwanted error logging 
            var blacklist = ["Connect call failed. No client listening"];
            var args = Array.prototype.slice.call(arguments);
            var wanted = true;
            blacklist.map(function(unwanted) {
                if (args[0].indexOf(unwanted) > -1) {
                    wanted = false; 
                };
            });
            if (wanted) {
                // dump UserPreferences
                var userPrefs = JSON.parse(localStorage.getItem('userPreferences'));
                Object.keys(userPrefs).map(function(key) {
                    if (key.indexOf('password') > -1) {
                        userPrefs[key] = "*****";
                    }
                });
                // dump local storage with exceptions to avoid overload.
                var dumpLocalStorage = JSON.parse(JSON.stringify(localStorage)); 
                ['userPreferences','torrenting.hashList','trakttv.token','trakttv.trending.cache','alarms','xem.mappings','snr.name-exceptions','snr.date-exceptions'].map(function(key) { delete dumpLocalStorage[key]; });
                var data = "Message: " + JSON.stringify(arguments) + "<br>";
                data += "Platform: " + navigator.platform + "<br>";
                data += "User Agent: " + navigator.userAgent + "<br>";
                data += "Config: <pre>" + angular.toJson(userPrefs, true) + "</pre>";
                data += "Local Storage (filtered): <pre>" + angular.toJson(dumpLocalStorage, true)  + "</pre>";
                log.events.createEvent()
                    .text("Console.error: " + JSON.stringify(arguments))
                    .tags("error")
                    .user(localStorage.getItem('uniqueId'))
                    .dataType(Loggr.dataType.html)
                    .data(data)
                    .post();
            }
        }
    } else {
        console.warn('Opt-In Error Tracking time limit of 7 days has expired. Turning off Error Tracking Service.');
        localStorage.removeItem('optin_error_reporting');
        localStorage.removeItem('optin_error_reporting.start_time');
    };

}
