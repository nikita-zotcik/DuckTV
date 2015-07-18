/**
 * Torrent Control for the torrenting window
 */
DuckieTV.controller('TorrentCtrl', ["$rootScope", "DuckieTorrent",
    function($rootScope, DuckieTorrent) {
        var vm = this;
        this.ports = [];
        this.session = false;
        this.authToken = localStorage.getItem('utorrent.token');
        //uTorrent.setPort(localStorage.getItem('utorrent.port'));
        this.rpc = null;
        this.polling = false;
        this.status = 'Connecting';

        this.removeToken = function() {
            localStorage.removeItem("utorrent.token");
            localStorage.removeItem("utorrent.preventconnecting");
            window.location.reload();
        };

        this.getTorrentClientName = function() {
            return DuckieTorrent.getClientName();
        };

        var autoConnectPoll = function() {
            vm.status = 'Connecting...';
            $rootScope.$applyAsync();
            DuckieTorrent.getClient().offline = false;
            DuckieTorrent.getClient().AutoConnect().then(function(rpc) {
                vm.status = 'Connected';
                vm.rpc = rpc;
                $rootScope.$applyAsync();
            }, function(err) {
                setTimeout(function() {
                    vm.status = 'Unable to connect. retrying in 5 seconds.';
                    $rootScope.$applyAsync();
                }, 1000);
                $rootScope.$applyAsync();
                console.error("Could not connect, retrying in 5 seconds.", err);
                setTimeout(autoConnectPoll, 5000);
            });
        };

        autoConnectPoll();
    }
])

.controller('TorrentDetailsCtrl', ["DuckieTorrent", "torrent",
    function(DuckieTorrent, torrent) {
        this.torrent = torrent;
        console.log("Torrent is!'", torrent);


        torrent.getFiles().then(function(files) {
            console.log('received files!', files);
            torrent.torrent_files = files.map(function(file) {
                file.isMovie = file.name.match(/mp4|avi|mkv|mpeg|mpg|flv/g);
                if (file.isMovie) {
                    file.searchFileName = file.name.split('/').pop().split(' ').pop();
                }
                return file;
            });
        });

    }
]);