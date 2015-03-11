DuckieTorrent

.controller("qbtCtrl", ["qBittorrent",
    function(qBittorrent) {

        this.connect = function() {
            qBittorrent.AutoConnect();
        }
    }
])

.factory('qBittorrent', ["$q", "$http", "URLBuilder", "$parse", "qBittorrentRemote",
    function($q, $http, URLBuilder, $parse, qBittorrentRemote) {
        var self = this;

        this.port = 8080;

        /** 
         * Predefined endpoints for API actions.
         */
        this.endpoints = {

            torrents: 'http://127.0.0.1:%s/json/torrents',
            portscan: 'http://127.0.0.1:%s/json/transferInfo'
        };

        /**
         * If a specialized parser is needed for a response than it can be automatically picked up by adding the type and a parser
         * function here.
         */
        this.parsers = {

        };

        /**
         * Automated parser for responses for usage when neccesary
         */
        this.getParser = function(type) {
            return (type in this.parsers) ? this.parsers[type] : function(data) {
                return data.data;
            };
        };

        /**
         * Fetches the url, auto-replaces the port in the url if it was found.
         */
        this.getUrl = function(type, param) {
            var out = this.endpoints[type];
            if (this.port != null) {
                out = out.replace('%s', this.port);
            }
            return out.replace('%s', encodeURIComponent(param));
        };

        this.isPolling = false;
        this.isConnecting = false;
        this.connected = false;
        this.initialized = false;

        /**
         * Build a JSON request using the URLBuilder service.
         * @param string type url to fetch from the request types
         * @param object params GET parameters
         * @param object options $http optional options
         */
        var json = function(type, params, options) {
            var d = $q.defer();
            params = params || {};
            var url = self.getUrl(type)
            var parser = self.getParser(type);
            $http.get(url, options || {}).then(function(response) {
                d.resolve(parser ? parser(response) : response.data);
            }, function(err) {
                console.log('error fetching', type);
                d.reject(err);
            });
            return d.promise;
        };

        var self = this;

        var methods = {

            connect: function() {

                return json('portscan').then(function(result) {
                    console.log("qBittorrent check result: ", result);
                    self.connected = true;
                })
            },

            /** 
             * Execute and handle the api's 'update' query.
             * Parses out the events, updates, properties and methods and dispatches them to the TorrentRemote interface
             * for storage, handling and attaching RPC methods.
             */
            statusQuery: function() {
                return json('torrents', {}).then(function(data) {
                        data.map(function(el) {
                            console.log("Handle remote", el);
                            qBittorrentRemote.handleEvent(el);
                        });
                        return data;
                    },

                    function(error) {
                        console.error("Error executing get status query!", error);
                    });
            },
            /**
             * Return the interface that handles the remote data.
             */
            getRemote: function() {
                return qBittorrentRemote;
            },


            /**
             * Connect with an auth token obtained by the Pair function.
             * Store the resulting session key in $scope.session
             * You can call this method as often as you want. It'll return a promise that holds
             * off on resolving until the client is connected.
             * If it's connected and initialized, a promise will return that immediately resolves with the remote interface.
             */
            AutoConnect: function() {
                if (!self.isConnecting && !self.connected) {
                    self.connectPromise = $q.defer();
                    self.isConnecting = true;
                } else {
                    return (!self.connected || !self.initialized) ? self.connectPromise.promise : $q(function(resolve) {
                        resolve(methods.getRemote());
                    });
                }

                methods.connect().then(function(result) {
                    if (!self.isPolling) {
                        self.isPolling = true;
                        methods.Update();
                    }
                });




                return self.connectPromise.promise;
            },


            togglePolling: function() {
                self.isPolling = !self.isPolling;
                self.Update();
            },
            /**
             * Start the status update polling.
             * Stores the resulting TorrentClient service in $scope.rpc
             * Starts polling every 1s.
             */
            Update: function(dontLoop) {
                if (self.isPolling == true) {
                    methods.statusQuery().then(function(data) {
                        if (undefined === dontLoop && self.isPolling && !data.error) {
                            setTimeout(methods.Update, 3000);
                        }
                    });
                }
            },
            isConnected: function() {
                return self.connected;
            }
        };
        return methods;
    }
])

/**
 * uTorrent/Bittorrent remote singleton that receives the incoming data
 */
.factory('qBittorrentRemote', ["$parse", "$rootScope",
    function($parse, $rootScope) {


        var methods = {

            /**
             * Return a human-readable status for a torrent
             */
            getFormattedStatus: function() {
                var statuses = {
                    128: 'stopped',
                    136: 'stopped',
                    137: 'started',
                    152: 'Error: Files missing, please recheck',
                    198: 'Connecting to peers',
                    200: 'started',
                    201: 'downloading',
                    233: 'paused'
                };
                if (!(this.properties.all.status in statuses)) {
                    console.warn("There's an unknown status for this torrent!", this.properties.all.status, this);
                    return this.properties.all.status;
                }
                return statuses[this.properties.all.status];
            },
            getStarted: function() {
                return $parse('properties.all.added_on')(this);
            },
            getProgress: function() {
                var pr = $parse('properties.all.progress')(this);
                return pr ? pr / 10 : pr;
            },
            getStatusCode: function() {
                return this.properties.all.status;
            },
            getFiles: function() {
                var files = [];
                angular.forEach($parse('file.all')(this), function(el, key) {
                    files.push(el);
                });
                angular.forEach($parse('files.all')(this), function(el, key) {
                    files.push(el);
                });
                return files;
            },
            /**
             * The torrent is started if the status is uneven.
             */
            isStarted: function() {
                return this.properties.all.status % 2 === 1;
            }
        };


        var service = {
            torrents: {},
            settings: {},

            getTorrentName: function(torrent) {
                return torrent.name;
            },

            getTorrents: function() {
                var out = [];
                angular.forEach(service.torrents, function(el) {
                    out.push(el);
                });
                return out;
            },

            getByHash: function(hash) {
                return (hash in service.torrents) ? service.torrents[hash] : null;
            },


            handleEvent: function(data) {
                var key = data.hash;
                if (key in service.torrents) {
                    Object.deepMerge(service.torrents[key], data[key]);
                } else {
                    service.torrents[key] = data;
                }
                $rootScope.$broadcast('torrent:update:' + key, service.torrents[key]);
            }
        };

        window.qbt = service;
        return service;
    }
])

.run(["DuckieTorrent", "qBittorrent",
    function(DuckieTorrent, qBittorrent) {

        DuckieTorrent.register('qBittorrent', qBittorrent);
        console.log("qBittorrent registered with DuckieTorrentProvider!");

        setTimeout(function() {
            console.warn("Registered providers with DuckieTorrentProvider:", DuckieTorrent.getClients());
        }, 1000);
    }
])