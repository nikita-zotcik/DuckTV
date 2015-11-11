var DuckieTorrent = angular.module('DuckieTorrent.torrent', ['DuckieTV']);
/**
 * Generic DuckieTorrent abstraction layer.
 * Torrent clients register themselves in the app.run block and you get a handle to them by using getClient();
 */
DuckieTorrent.provider('DuckieTorrent', function() {

    var clients = {};
    this.$get = function() {
        return {
            getClients: function() {
                return clients;
            },

            register: function(name, client) {
                console.info("Registering torrent client: " + name);
                clients[name] = client;
            },

            getClient: function() {
                return clients[localStorage.getItem('torrenting.client')];
            },

            getClientName: function() {
                return localStorage.getItem('torrenting.client');
            }
        };
    };
})

.run(function() {
    // setting platform specific defaults (uTorrent for windows, uTorrent Web UI or non-windows)
    if (!localStorage.getItem('torrenting.client')) {
        if (navigator.platform.toLowerCase().indexOf('win') !== -1) {
            localStorage.setItem('torrenting.client', 'uTorrent'); // default for windows platforms
        } else {
            localStorage.setItem('torrenting.client', 'uTorrent Web UI'); // default for non-windows platforms
        }
    } else {
        if (localStorage.getItem('torrenting.client') === 'uTorrent' && navigator.platform.toLowerCase().indexOf('win') === -1) {
            localStorage.setItem('torrenting.client', 'uTorrent Web UI'); // override for non-windows platforms prior to #592
        }
    }
})


/**
 * Angular's private URL Builder method + unpublished dependencies converted to a public service
 * So we can properly build a GET url with parameters for a JSONP request.
 */
.provider('URLBuilder', function() {

    function encodeUriQuery(val, pctEncodeSpaces) {
        return encodeURIComponent(val).
        replace(/%40/gi, '@').
        replace(/%3A/gi, ':').
        replace(/%24/g, '$').
        replace(/%2C/gi, ',').
        replace(/%20/g, (pctEncodeSpaces ? '%20' : '+'));
    }

    /**
     * Angular's private buildUrl function, patched to refer to the public methods on the angular globals
     */
    function buildUrl(url, params) {
        if (!params) return url;
        var parts = [];
        angular.forEach(params, function(value, key) {
            if (value === null || angular.isUndefined(value)) return;
            if (!angular.isArray(value)) value = [value];

            angular.forEach(value, function(v) {
                if (angular.isObject(v)) {
                    v = angular.toJson(v);
                }
                parts.push(encodeUriQuery(key) + '=' + encodeUriQuery(v));
            });
        });
        return url + ((url.indexOf('?') == -1) ? '?' : '&') + parts.join('&');
    }

    this.$get = function() {
        return {
            build: function(url, params) {
                return buildUrl(url, params);
            }
        };

    };
});

String.capitalize = function(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
};

/**
 * Simple recursive object merge that merges everyting from obj2 into obj1 and recurses until it can't go any deeper.
 */
Object.deepMerge = function(obj1, obj2) {
    for (var i in obj2) { // add the remaining properties from object 2
        if (typeof obj2[i] !== 'object') {
            obj1[i] = obj2[i];
        } else {
            obj1[i] = Object.deepMerge(i in obj1 ? obj1[i] : {}, obj2[i]);
        }
    }
    return obj1;
};