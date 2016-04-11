DuckieTV.controller("uTorrentWebUICtrl", ["uTorrentWebUI", "SettingsService", "FormlyLoader",
    function(uTorrentWebUI, SettingsService, FormlyLoader) {

        var self = this;

        FormlyLoader.load('TorrentClientSettings').then(function(fields) {

            self.model = {
                server: SettingsService.get('utorrentwebui.server'),
                port: SettingsService.get('utorrentwebui.port'),
                use_auth: SettingsService.get('utorrentwebui.use_auth'),
                username: SettingsService.get('utorrentwebui.username'),
                password: SettingsService.get('utorrentwebui.password'),
                hideUsername: false,
                hideKey: true,
                hideUseAuth: true
            };

            self.fields = fields;
        });

        this.isConnected = function() {
            return uTorrentWebUI.isConnected();
        };

        this.test = function() {
            //console.log("Testing settings");
            uTorrentWebUI.Disconnect();
            uTorrentWebUI.setConfig(this.model);
            uTorrentWebUI.connect().then(function(connected) {
                console.info("uTorrent WEBUI connected! (save settings)", connected);
                uTorrentWebUI.saveConfig();
            }, function(error) {
                console.error("uTorrent WEBUI connect error!", error);
            });
        };

    }
]);