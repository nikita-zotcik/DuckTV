DuckieTV
/**
 * Migrations that run when updating DuckieTV version.
 */
    .run(['FavoritesService', '$rootScope', 'SettingsService', 'TorrentHashListService', 'TraktTVv2',
    function(FavoritesService, $rootScope, SettingsService, TorrentHashListService, TraktTVv2) {

        // Update the newly introduced series' and seasons'  watched and notWatchedCount entities

        if (!localStorage.getItem('1.1migration')) {
            setTimeout(function() {
                $rootScope.$broadcast('series:recount:watched');
                console.info("1.1 migration done.");
                localStorage.setItem('1.1migration', new Date());
            }, 3000);
            console.info("Executing the 1.1 migration to populate watched and notWatchedCount entities");
        }

        // Clean up Orphaned Seasons

        if (!localStorage.getItem('1.1.4cleanupOrphanedSeasons')) {
            setTimeout(function() {
                var serieIds = [];
                CRUD.executeQuery('select distinct(ID_Serie) from Series').then(function(res) {
                    res.rows.map(function(row) {
                        serieIds.push(row.ID_Serie)
                    });
                    CRUD.executeQuery('delete from Seasons where ID_Serie not in (' + serieIds.join(',') + ') ').then(function(res) {
                        console.log('1.1.4cleanupOrphanedSeasons done!', res.rowsAffected, 'season records deleted!')
                    });
                });
                localStorage.setItem('1.1.4cleanupOrphanedSeasons', new Date());
            }, 5000);
            console.info("Executing the 1.1.4cleanupOrphanedSeasons to remove orphaned seasons");
        }

        // Clean up Orphaned Episodes

        if (!localStorage.getItem('1.1.4cleanupOrphanedEpisodes')) {
            setTimeout(function() {
                var serieIds = [];
                CRUD.executeQuery('select distinct(ID_Serie) from Series').then(function(res) {
                    res.rows.map(function(row) {
                        serieIds.push(row.ID_Serie)
                    })
                    CRUD.executeQuery('delete from Episodes where ID_Serie not in (' + serieIds.join(',') + ') ').then(function(res) {
                        console.log('1.1.4cleanupOrphanedEpisodes done!', res.rowsAffected, 'episode records deleted!')
                    });
                });
                localStorage.setItem('1.1.4cleanupOrphanedEpisodes', new Date());
            }, 4000);
            console.info("Executing the 1.1.4cleanupOrphanedEpisodes to remove orphaned episodes");
        }

        // Refresh all to fetch Trakt_id for Series, Seasons and Episodes

        if (!localStorage.getItem('1.1.4refresh')) {
            setTimeout(function() {
                FavoritesService.favorites.map(function(serie) {
                    FavoritesService.adding(serie.TVDB_ID);
                    return TraktTVv2.resolveTVDBID(serie.TVDB_ID).then(function(s) {
                        return TraktTVv2.serie(s.slug_id)
                    }).then(function(s) {
                        return FavoritesService.addFavorite(s).then(function() {
                            $rootScope.$broadcast('storage:update');
                            FavoritesService.added(s.tvdb_id);
                        });
                    }, function(err) {
                        console.error("Error adding show!", err);
                        FavoritesService.added(serie.TVDB_ID);
                        FavoritesService.addError(serie.TVDB_ID, err);
                    });
                });
                console.log('1.1.4refresh done!');
                localStorage.setItem('1.1.4refresh', new Date());
            }, 10000);
            console.info("Executing the 1.1.4refresh to update Trakt_id for all Series, Seasons and Episodes");
        }

        // Update qBittorrent to qBittorrent (pre3.2)

        if (!localStorage.getItem('1.1.4qBittorrentPre32')) {
            console.info("Executing 1.1.4qBittorrentPre32 to rename qBittorrent to qBittorrent (pre3.2)");
            if ('qBittorrent' == localStorage.getItem('torrenting.client')) {
                localStorage.setItem('torrenting.client', 'qBittorrent (pre3.2)');
                SettingsService.set('torrenting.client', 'qBittorrent (pre3.2)');
            };
            localStorage.setItem('1.1.4qBittorrentPre32', new Date());
            console.info("1.1.4qBittorrentPre32 done!");
        }

        // refresh trending cache (so that we can start using trakt_id in trending searches)

        if (!localStorage.getItem('1.1.4refreshTrendingCache')) {
            console.info("Executing 1.1.4refreshTrendingCache to refresh the TraktTV Trending Cache with trakt_id");
            localStorage.removeItem('trakttv.lastupdated.trending');
            localStorage.removeItem('trakttv.trending.cache');
            localStorage.setItem('1.1.4refreshTrendingCache', new Date());
            console.info("1.1.4refreshTrendingCache done!");
        }

        // update deluge auth

        if (!localStorage.getItem('1.1.5updateDelugeAuth')) {
            console.info("Executing 1.1.5updateDelugeAuth to set deluge.use_auth to true");
            SettingsService.set('deluge.use_auth', true);
            localStorage.setItem('1.1.5updateDelugeAuth', new Date());
            console.info("1.1.5updateDelugeAuth done!");
        }

        // update transmission path (and vuze)

        if (!localStorage.getItem('1.1.4updateTransmissionPath')) {
            console.info("Executing 1.1.4updateTransmissionPath to clone transmission.key to transmission.path");
            if (SettingsService.get('transmission.key')) {
                SettingsService.set('transmission.path', SettingsService.get('transmission.key'));
            } else {
                SettingsService.set('transmission.path', '/transmission/rpc');
            }
            if (SettingsService.get('vuze.key')) {
                SettingsService.set('vuze.path', SettingsService.get('vuze.key'));
            } else {
                SettingsService.set('vuze.path', '/transmission/rpc');
            }
            localStorage.setItem('1.1.4updateTransmissionPath', new Date());
            console.info("1.1.4updateTransmissionPath done!");
        }

        // remove obsolete torrentHashes from TorrentHashListService.hashList

        if (!localStorage.getItem('1.1.4TorrentHashListCleanup')) {
            setTimeout(function() {
                // collect known good torrent hashes
                var newTorrentHashList = {};
                CRUD.executeQuery("select magnetHash,downloaded from Episodes where magnetHash != ''").then(function(res) {
                    res.rows.map(function(row) {
                        newTorrentHashList[row.magnetHash] = (parseInt(row.downloaded) == 1);
                    });
                    // save new hashList
                    localStorage.setItem(['torrenting.hashList'], JSON.stringify(newTorrentHashList));
                    // reload TorrentHashListService.hashList
                    TorrentHashListService.hashList = JSON.parse(localStorage.getItem(['torrenting.hashList'])) || {};
                    localStorage.setItem('1.1.4TorrentHashListCleanup', new Date());
                    console.info("1.1.4TorrentHashListCleanup done!");
                });
            }, 6000);
            console.info("Executing 1.1.4TorrentHashListCleanup to remove obsolete torrentHashes from TorrentHashListService");
        }

        // copy autodownload.minSeeders to torrenting.min_seeders if previously set

        if (!localStorage.getItem('1.1.5updateTorrenting.min_seeders')) {
            console.info("Executing 1.1.5updateTorrenting.min_seeders to clone autodownload.minSeeders to torrenting.min_seeders");
            if (SettingsService.get('autodownload.minSeeders')) {
                SettingsService.set('torrenting.min_seeders', SettingsService.get('autodownload.minSeeders'));
            }
            localStorage.setItem('1.1.5updateTorrenting.min_seeders', new Date());
            console.info("1.1.5updateTorrenting.min_seeders done!");
        }


        // Clean up duplicate records from fanart

        if (!localStorage.getItem('1.1.5fanartCleanup')) {
            var cleanupDelay = 30000;
            if (localStorage.getItem('1.1.4refresh')) {
                cleanupDelay = 10000;
            }
            setTimeout(function() {
                CRUD.executeQuery("delete from Fanart where ID_Fanart not in (select max(ID_Fanart) from Fanart group by TVDB_ID)")
                .then(function(res) {
                    console.log('1.1.5fanartCleanup done!', res.rowsAffected, 'items deleted!');
                    localStorage.setItem('1.1.5fanartCleanup', new Date());
                });
            }, cleanupDelay);
            console.info("Executing the 1.1.5fanartCleanup to drop duplicate records in", cleanupDelay / 1000, "seconds.");
        }

        // delete custom engines

        if (!localStorage.getItem('1.1.5deleteSearchEngines')) {
            console.info("Executing 1.1.5deleteSearchEngines");
            CRUD.executeQuery('drop table SearchEngines');
            localStorage.setItem('1.1.5deleteSearchEngines', new Date());
            console.info("1.1.5deleteSearchEngines done!");
        }

        // delete watchlist

        if (!localStorage.getItem('1.1.6deleteWatchList')) {
            console.info("Executing 1.1.6deleteWatchList");
            CRUD.executeQuery('drop table WatchList');
            CRUD.executeQuery('drop table WatchListObject');
            localStorage.setItem('1.1.6deleteWatchList', new Date());
            console.info("1.1.6deleteWatchList done!");
        }


    }
])