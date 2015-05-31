/**
 * uTorrentWebUI
 */
uTorrentWebUIData = function(data) {
    this.update(data);
};

uTorrentWebUIData.extends(TorrentData, {
    getName: function() {
        return this.name;
    },
    getProgress: function() {
        return this.round(this.progress / 10, 1);
    },
    start: function() {
        this.getClient().getAPI().execute('start', this.hash);
    },
    stop: function() {
        this.getClient().getAPI().execute('stop', this.hash);
    },
    pause: function() {
        this.getClient().getAPI().execute('pause', this.hash);
    },
    getFiles: function() {
        return this.getClient().getAPI().getFiles(this.hash).then(function(results) {
            this.files = results;
        }.bind(this));
    },
    isStarted: function() {
        return this.status % 2 === 1;
    }
});

/** 
 * uTorrentWebUI < 3.2 client
 */
DuckieTorrent.factory('uTorrentWebUIRemote', ["BaseTorrentRemote",
    function(BaseTorrentRemote) {

        var uTorrentWebUIRemote = function() {
            BaseTorrentRemote.call(this);
            this.dataClass = uTorrentWebUIData;
        };
        uTorrentWebUIRemote.extends(BaseTorrentRemote);

        return uTorrentWebUIRemote;
    }
])

.factory('uTorrentWebUIAPI', ['BaseHTTPApi', '$http',
    function(BaseHTTPApi, $http) {

        var uTorrentWebUIAPI = function() {
            BaseHTTPApi.call(this);
            this.config.token = null;
        };
        uTorrentWebUIAPI.extends(BaseHTTPApi, {
            /**
             * Fetches the url, auto-replaces the port in the url if it was found.
             */
            getUrl: function(type, param) {
                var out = this.config.server + ':' + this.config.port + this.endpoints[type];
                return out.replace('://', '://' + this.config.username + ':' + this.config.password + '@').replace('%token%', this.config.token).replace('%s', encodeURIComponent(param));
            },

            portscan: function() {
                var self = this;
                return this.request('portscan').then(function(result) {
                    if (result !== undefined) {
                        self.config.token = new HTMLScraper(result.data).querySelector('#token').innerHTML;
                        return true;
                    }
                    return false;
                }, function() {
                    return false;
                });
            },
            getTorrents: function() {
                return this.request('torrents').then(function(data) {
                    return data.data.torrents.map(function(torrent) {
                        return {
                            hash: torrent[0],
                            status: torrent[1],
                            name: torrent[2],
                            size: torrent[3],
                            progress: torrent[4],
                            downloaded: torrent[5],
                            uploaded: torrent[6],
                            ratio: torrent[7],
                            upload_speed: torrent[8],
                            download_speed: torrent[9],
                            eta: torrent[10],
                            label: torrent[11],
                            peers_connected: torrent[12],
                            peers_in_swarm: torrent[13],
                            seeds_connected: torrent[14],
                            seeds_in_swarm: torrent[15],
                            availability: torrent[16],
                            torrent_queue_order: torrent[17],
                            remaining: torrent[18],
                            download_url: torrent[19],
                            rss_feed_url: torrent[20],
                            status_message: torrent[21],
                            stream_id: torrent[22],
                            added_on: torrent[23],
                            completed_on: torrent[24],
                            app_update_url: torrent[25]
                        };
                    });
                });
            },
            getFiles: function(hash) {
                return this.request('files', hash).then(function(data) {
                    return data.data.files[1].map(function(file) {
                        return {
                            name: file[0],
                            filesize: file[1],
                            downloaded: file[2],
                            priority: file[3],
                            firstpiece: file[4],
                            num_pieces: file[5],
                            streamable: file[6],
                            encoded_rate: file[7],
                            duration: file[8],
                            width: file[9],
                            height: file[10],
                            stream_eta: file[11],
                            streamability: file[12]
                        };
                    });
                });
            },
            addMagnet: function(magnetHash) {
                var headers = {
                    'Content-Type': 'application/x-www-form-urlencoded',
                };
                if (this.config.use_auth) {
                    headers.Authorization = 'Basic ' + Base64.encode(this.config.username + ':' + this.config.password);
                }
                return $http.post(this.getUrl('addmagnet', magnetHash), {
                    headers: headers
                });
            },
            execute: function(method, id) {
                var headers = {
                    'Content-Type': 'application/x-www-form-urlencoded',
                };
                if (this.config.use_auth) {
                    headers.Authorization = 'Basic ' + Base64.encode(this.config.username + ':' + this.config.password);
                }
                return $http.post(this.getUrl(method, id), {
                    headers: headers
                });
            }
        });

        return uTorrentWebUIAPI;
    }
])

.factory('uTorrentWebUI', ["BaseTorrentClient", "uTorrentWebUIRemote", "uTorrentWebUIAPI",
    function(BaseTorrentClient, uTorrentWebUIRemote, uTorrentWebUIAPI) {

        var uTorrentWebUI = function() {
            BaseTorrentClient.call(this);
        };
        uTorrentWebUI.extends(BaseTorrentClient, {});

        var service = new uTorrentWebUI();
        service.setName('uTorrent Web UI');
        service.setAPI(new uTorrentWebUIAPI());
        service.setRemote(new uTorrentWebUIRemote());
        service.setConfigMappings({
            server: 'utorrentwebui.server',
            port: 'utorrentwebui.port',
            username: 'utorrentwebui.username',
            password: 'utorrentwebui.password',
            use_auth: 'utorrentwebui.use_auth'
        });
        service.setEndpoints({
            portscan: '/gui/token.html',
            torrents: '/gui/?token=%token%&list=1',
            addmagnet: '/gui/?token=%token%&action=add-url&s=%s',
            stop: '/gui/?token=%token%&action=stop&hash=%s',
            resume: '/gui/?token=%token%&action=start&hash=%s',
            pause: '/gui/?token=%token%&action=pause&hash=%s',
            files: '/gui/?token=%token%&action=getfiles&hash=%s',
        });
        service.readConfig();

        return service;
    }
])

.run(["DuckieTorrent", "uTorrentWebUI",
    function(DuckieTorrent, uTorrentWebUI) {
        DuckieTorrent.register('uTorrent Web UI', uTorrentWebUI);
    }
]);