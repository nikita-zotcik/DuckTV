DuckieTorrent.factory('BaseTorrentRemote', ["$rootScope",
    function($rootScope) {

        function BaseTorrentRemote() {
            this.torrents = {};
            this.dataClass = null;
        }

        BaseTorrentRemote.prototype.handleEvent = function(data) {
            var key = data.hash.toUpperCase();
            if (!(key in this.torrents)) {
                if (!this.dataClass) {
                    throw "No data class set for this torrent remote!";
                }
                this.torrents[key] = new this.dataClass(data);
            } else {
                this.torrents[key].update(data);
            }

            $rootScope.$broadcast('torrent:update:' + key, this.torrents[key]);
            $rootScope.$broadcast('torrent:update:', this.torrents[key]);
        };


        BaseTorrentRemote.prototype.getTorrents = function() {
            return Object.keys(this.torrents).map(function(el) {
                return this.torrents[el];
            }, this);
        };

        BaseTorrentRemote.prototype.getByHash = function(hash) {
            hash = hash.toUpperCase();
            return (hash in this.torrents) ? this.torrents[hash] : null;
        };

        BaseTorrentRemote.prototype.onTorrentUpdate = function(hash, callback) {
            $rootScope.$on('torrent:update:' + hash, function(evt, torrent) {
                callback(torrent);
            });
        };

        BaseTorrentRemote.prototype.offTorrentUpdate = function(hash, callback) {
            $rootScope.$off('torrent:update:' + hash, function(evt, torrent) {
                callback(torrent);
            });
        };

        return BaseTorrentRemote;

    }
])


.factory('BaseTorrentClient', ["$q", "$http", "URLBuilder", "$parse", "SettingsService",
    function($q, $http, URLBuilder, $parse, SettingsService) {

        var BaseTorrentClient = function() {
            this.config = {

            };

            this.configMappings = {
                server: null,
                port: null,
                username: null,
                password: null,
                use_auth: null
            };

            this.name = 'Base Torrent Client';
            this.remoteClass = null;
            this.apiImplementation = null;

            this.isPolling = false;
            this.isConnecting = false;
            this.connected = false;
            this.initialized = false;


        };

        var methods = {
            setConfig: function(config) {
                this.config = config;
                this.apiImplementation.config = this.config;
            },

            saveConfig: function() {
                Object.keys(this.configMappings).map(function(key) {
                    SettingsService.set(this.configMappings[key], this.apiImplementation.config[key]);
                }, this);
            },
            readConfig: function() {
                Object.keys(this.configMappings).map(function(key) {
                    this.apiImplementation.config[key] = this.config[key] = SettingsService.get(this.configMappings[key]);
                }, this);
            },
            setName: function(name) {
                this.name = name;
            },
            getName: function(name) {
                return this.name;
            },

            setConfigMappings: function(mappings) {
                Object.keys(mappings).map(function(key) {
                    this.configMappings[key] = mappings[key];
                }, this);
            },
            setEndpoints: function(endpoints) {
                Object.keys(endpoints).map(function(key) {
                    this.apiImplementation.endpoints[key] = endpoints[key];
                }, this);
            },

            setRemote: function(remoteImplementation) {
                this.remoteClass = remoteImplementation;
            },

            setAPI: function(apiImplementation) {
                this.apiImplementation = apiImplementation;
            },

            getAPI: function() {
                return this.apiImplementation;
            },

            /**
             * Return the interface that handles the remote data.
             */
            getRemote: function() {
                if (this.remoteClass === null) {
                    throw "No torrent remote assigned to " + this.getName() + "implementation!";
                }
                return this.remoteClass;
            },

            /**
             * Connect with an auth token obtained by the Pair function.
             * Store the resulting session key in $scope.session
             * You can call this method as often as you want. It'll return a promise that holds
             * off on resolving until the client is connected.
             * If it's connected and initialized, a promise will return that immediately resolves with the remote interface.
             */
            AutoConnect: function() {
                if (!this.isConnecting && !this.connected) {
                    this.connectPromise = $q.defer();
                    this.isConnecting = true;
                } else {
                    return (!this.connected || !this.initialized) ? this.connectPromise.promise : $q(function(resolve) {
                        resolve(this.getRemote());
                    }.bind(this));
                }
                var self = this;
                this.connect().then(function(result) {
                    console.log(self.getName() + " connected!");
                    if (!self.isPolling) {
                        self.isPolling = true;
                        self.Update();
                    }
                    self.connectPromise.resolve(self.getRemote());
                });

                return self.connectPromise.promise;
            },

            togglePolling: function() {
                this.isPolling = !this.isPolling;
                this.Update();
            },
            /**
             * Start the status update polling.
             * Stores the resulting TorrentClient service in $scope.rpc
             * Starts polling every 1s.
             */
            Update: function(dontLoop) {
                if (this.isPolling === true) {
                    var self = this;
                    this.getTorrents().then(function(data) {
                        if (undefined === dontLoop && self.isPolling && !data.error) {
                            setTimeout(function() {
                                self.Update();
                            }, 3000);
                        }
                    });
                }
            },

            isConnected: function() {
                return this.connected;
            },

            Disconnect: function() {
                this.isPolling = false;
                this.getRemote().torrents = {};
                this.getRemote().eventHandlers = {};
            },

            /**
             * -------------------------------------------------------------
             * Optionally overwrite the implementation of the methods below when adding a new torrent client.
             * You shouldn't have to, your API implementation should do the work.
             * -------------------------------------------------------------
             */



            /**
             *
             *
             * Example:
             *        return request('portscan').then(function(result) { // check if client webui is reachable
             *   console.log(service.getName() + " check result: ", result);
             *   self.connected = true; // we are now connected
             *   self.isConnecting = false; // we are no longer connecting
             *   return true;
             *  })
             */
            connect: function() {
                var self = this;
                return this.getAPI().portscan().then(function(result) { // check if client webui is reachable
                    console.log(self.getName() + " check result: ", result);
                    if (!result) {
                        throw self.getName() + " Connect call failed. No client listening";
                    }
                    self.connected = result; // we are now connected
                    self.isConnecting = !result; // we are no longer connecting
                    return result;
                });
            },

            /** 
             * Execute and handle the api's 'update' query.
             * Parses out the events, updates, properties and methods and dispatches them to the TorrentRemote interface
             * for storage, handling and attaching RPC methods.
             */

            getTorrents: function() {
                var self = this,
                    remote = this.getRemote();
                return this.getAPI().getTorrents()
                    .then(function(data) {
                        data.map(function(torrent) {
                            remote.handleEvent(torrent);
                        });
                        return data;
                    }, function(error) {
                        throw "Error executing " + self.getName() + " getTorrents";
                    });
            },
            /**
             * Implement this function to be able to add a magnet to the client
             */
            addMagnet: function(magnet) {
                if (!('addMagnet' in this.getAPI())) {
                    throw "addMagnet not implemented for " + this.getName();
                }
                return this.getAPI().addMagnet(magnet);

            },

            /**
             * Implement this function to be able to add a magnet to the client
             */
            addTorrentByUrl: function(magnet) {
                if (!('addTorrentByUrl' in this.getAPI())) {
                    throw "addTorrentByUrl not implemented for " + this.getName();
                }
                return this.getAPI().addTorrentByUrl(magnet);

            },

            request: function(type, params, options) {
                return request(type, params, options);
            }


        };

        Object.keys(methods).map(function(key) {
            BaseTorrentClient.prototype[key] = methods[key];
        });

        return BaseTorrentClient;
    }
]);