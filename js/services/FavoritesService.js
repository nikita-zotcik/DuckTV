/**
 * Persistent storage for favorite series and episode
 *
 * Provides functionality to add and remove series and is the glue between Trakt.TV,
 */
DuckieTV.factory('FavoritesService', ["$rootScope", "TraktTVv2", "$injector",
    function($rootScope, TraktTVv2, $injector) {

        /** 
         * Helper function to add a serie to the service.favorites hash if it doesn't already exist.
         * update existing otherwise.
         */
        addToFavoritesList = function(serie) {
            var existing = service.favorites.filter(function(el) {
                return el.TVDB_ID == serie.TVDB_ID;
            });
            if (existing.length === 0) {
                service.favorites.push(serie);
            } else {
                service.favorites[service.favorites.indexOf(existing[0])] = serie;
            }
            service.favoriteIDs.push(serie.TVDB_ID.toString());
        };

        /**
         * Helper function to map properties from the input data on a serie from Trakt.TV into a Serie CRUD object.
         * Input information will always overwrite existing information.
         */
        fillSerie = function(serie, data) {
            data.TVDB_ID = data.tvdb_id;
            data.TVRage_ID = data.tvrage_id;
            data.IMDB_ID = data.imdb_id;
            data.contentrating = data.certification;
            data.name = data.title;
            data.airs_dayofweek = data.airs.day;
            data.airs_time = data.airs.time;
            data.timezone = data.airs.timezone;
            data.firstaired = new Date(data.first_aired).getTime();
            if (!serie.ratingcount || serie.ratingcount + 25 > data.votes) {
                data.rating = Math.round(data.rating * 10);
                data.ratingcount = data.votes;
            } else {
                delete data.rating;
                delete data.ratingcount;
            }
            data.genre = data.genres.join('|');
            data.lastupdated = data.updated_at;
            if (data.people && 'cast' in data.people) {
                data.actors = data.people.cast.map(function(actor) {
                    if ('character' in actor && actor.character != '') {
                        return actor.person.name + ' (' + actor.character + ')';
                    } else {
                        return actor.person.name;
                    };
                }).join('|');
            }

            for (var i in data) {
                if (serie.hasField(i)) {
                    serie[i] = data[i];
                }
            }
        };
        /**
         * Helper function to map properties from the input data from Trakt.TV into a Episode CRUD object.
         * Input information will always overwrite existing information.
         */
        fillEpisode = function(episode, data, season, serie, watched) {
            // remap some properties on the data object to make them easy to set with a for loop. the CRUD object doesn't persist properties that are not registered, so that's cheap.
            data.TVDB_ID = data.tvdb_id;
            data.IMDB_ID = data.imdb_id;
            data.TRAKT_ID = data.trakt_id;
            if (!episode.ratingcount || episode.ratingcount + 25 > data.votes) {
                data.rating = Math.round(data.rating * 10);
                data.ratingcount = data.votes;
            } else {
                delete data.rating;
                delete data.ratingcount;
            }
            data.episodenumber = data.number;
            data.episodename = data.title;
            data.firstaired = new Date(data.first_aired).getTime();
            data.firstaired_iso = data.first_aired;
            data.filename = (('screenshot' in data.images) && ('thumb' in data.images.screenshot)) ? data.images.screenshot.thumb : '';

            for (var i in data) {
                if (episode.hasField(i)) {
                    episode[i] = data[i];
                }
            }
            episode.seasonnumber = season.seasonnumber;
            // if there's an entry for the episode in watchedEpisodes, this is a backup restore
            watched.map(function(el) {
                if (el.TVDB_ID == episode.TVDB_ID) {
                    episode.downloaded = 1; // an entry means it has to have been downloaded
                    episode.watchedAt = el.watchedAt; // an entry may mean it's watched ... or not.
                    if (el.watchedAt != null) {
                        episode.watched = 1;
                    } else {
                        episode.watched = 0;
                    };
                }
            });
            episode.ID_Serie = serie.getID();
            episode.ID_Season = season.getID();
            return episode;
        };

        /**
         * Wipe episodes from the database that were cached locally but are no longer in the latest update.
         * @param object seasons Trakt.TV seasons/episodes input
         * @param object series serie entity
         */
        cleanupEpisodes = function(seasons, serie) {
            var tvdbList = [];
            seasons.map(function(season) {
                season.episodes.map(function(episode) {
                    if (isNaN(parseInt(episode.tvdb_id))) return;
                    tvdbList.push(episode.tvdb_id);
                });
            });

            return CRUD.EntityManager.getAdapter().db.execute('delete from Episodes where ID_Serie = ? and TVDB_ID NOT IN (' + tvdbList.join(',') + ')', [serie.ID_Serie]).then(function(result) {
                if (result.rs.rowsAffected > 0) {
                    console.info("Cleaned up " + result.rs.rowsAffected + " orphaned episodes for series [" + serie.ID_Serie + "] " + serie.name);
                };
                return seasons;
            });
        };

        /**
         * Insert all seasons into the database and return a cached array map
         * @param  CRUD.Entity serie serie to update seasons for
         * @param  object seasons extended seasons input data from Trakt
         * @return object seasonCache indexed by seasonnumber
         */
        updateSeasons = function(serie, seasons) {
            //console.debug("Update seasons!", seasons);
            return serie.getSeasonsByNumber().then(function(seasonCache) { // fetch the seasons and cache them by number.
                return Promise.all(seasons.map(function(season) {
                    var SE = (season.number in seasonCache) ? seasonCache[season.number] : new Season();
                    SE.poster = season.poster;
                    SE.seasonnumber = season.number;
                    SE.ID_Serie = serie.getID();
                    SE.overview = season.overview;
                    if (!SE.ratingcount || SE.ratingcount + 25 > season.votes) {
                        SE.ratings = Math.round(season.rating * 10);
                        SE.ratingcount = season.votes;
                    }
                    seasonCache[season.number] = SE;
                    return SE.Persist().then(function() {
                        return true;
                    });
                })).then(function() {
                    return seasonCache;
                });
            });
        };

        updateEpisodes = function(serie, seasons, watched, seasonCache) {
            // console.debug(" Update episodes!", serie, seasons, watched, seasonCache);
            return serie.getEpisodesMap().then(function(episodeCache) {
                return Promise.all(seasons.map(function(season) {
                    return Promise.all(season.episodes.map(function(episode) {
                        if (episode.tvdb_id == null) return;
                        var dbEpisode = (!(episode.tvdb_id in episodeCache)) ? new Episode() : episodeCache[episode.tvdb_id];
                        return fillEpisode(dbEpisode, episode, seasonCache[season.number], serie, watched).Persist().then(function() {
                            episodeCache[episode.tvdb_id] = dbEpisode;
                            return true;
                        });
                    })).then(function() {
                        return episodeCache;
                    });
                }));
            });
        };

        var service = {
            addingList: {}, // holds any TVDB_ID's that are adding, used for spinner/checkmark icon control
            errorList: {}, // holds any TVDB_ID's that had an error, used for sadface icon control
            favorites: [],
            favoriteIDs: [],
            // TraktTV: TraktTV,
            /**
             * Handles adding, deleting and updating a show to the local database.
             * Grabs the existing serie, seasons and episode from the database if they exist
             * and inserts or updates the information.
             * Deletes the episode from the database if TraktTV no longer has it.
             * Returns a promise that gets resolved when all the updates have been launched
             * (but not necessarily finished, they'll continue to run)
             *
             * @param object data input data from TraktTV.findSerieByTVDBID(data.TVDB_ID)
             * @param object watched { TVDB_ID => watched episodes } mapped object to auto-mark as watched
             */
            addFavorite: function(data, watched) {
                watched = watched || [];
                // console.debug("FavoritesService.addFavorite!", data, watched);
                var entity = null;
                if (data.title === null || data.tvdb_id === null) { // if odd invalid data comes back from trakt.tv, remove the whole serie from db.
                    console.error("received error data as input, removing from favorites.");
                    return service.remove({
                        name: data.title,
                        TVDB_ID: data.tvdb_id
                    });
                }
                var serie = service.getById(data.tvdb_id) || new Serie();
                fillSerie(serie, data);
                return serie.Persist().then(function() {
                        return serie;
                    }).then(function(serie) {
                        addToFavoritesList(serie); // cache serie in favoritesservice.favorites
                        $rootScope.$applyAsync();
                        $rootScope.$broadcast('background:load', serie.fanart);
                        entity = serie;
                        return cleanupEpisodes(data.seasons, entity);
                    })
                    .then(function() {
                        return updateSeasons(entity, data.seasons);
                    })
                    .then(function(seasonCache) {
                        return updateEpisodes(entity, data.seasons, watched, seasonCache);
                    })
                    .then(function(episodeCache) {
                        $injector.get('CalendarEvents').processEpisodes(serie, episodeCache);
                        //console.debug("FavoritesService.Favorites", service.favorites)
                        $rootScope.$applyAsync();
                        $rootScope.$broadcast('storage:update');
                        return entity;
                    });
            },
            /**
             * Helper function to fetch all the episodes for a serie
             * Optionally, filters can be provided which will be turned into an SQL where.
             */
            getEpisodes: function(serie, filters) {
                serie = serie instanceof CRUD.Entity ? serie : this.getById(serie);
                return serie.Find('Episode', filters || {}).then(function(episodes) {
                    return episodes;
                }, function(err) {
                    console.error("Error in getEpisodes", serie, filters || {});
                });
            },
            getEpisodesForDateRange: function(start, end) {
                var filter = ['Episodes.firstaired > "' + start + '" AND Episodes.firstaired < "' + end + '" '];

                return CRUD.Find('Episode', filter).then(function(ret) {
                    return ret;
                });
            },
            /**
             * Find a serie by it's TVDB_ID (the main identifier for series since they're consistent regardless of local config)
             */
            getById: function(id) {
                return service.favorites.filter(function(el) {
                    return el.TVDB_ID == id;
                })[0];
            },
            getByID_Serie: function(id) {
                return service.favorites.filter(function(el) {
                    return el.ID_Serie == id;
                })[0];
            },
            hasFavorite: function(id) {
                return service.favoriteIDs.indexOf(id) > -1;
            },
            /**
             * Remove a serie, it's seasons, and it's episodes from the database.
             */
            remove: function(serie) {
                serie.displaycalendar = '0';
                //console.debug("Remove serie from favorites!", serie);
                service.getById(serie.TVDB_ID).Find('Season').then(function(seasons) {
                    seasons.map(function(el) {
                        el.Delete();
                    });
                });
                CRUD.EntityManager.getAdapter().db.execute('delete from Episodes where ID_Serie = ' + serie.ID_Serie);
                service.favoriteIDs = service.favoriteIDs.filter(function(id) {
                    return id != serie.TVDB_ID;
                });
                serie.Delete().then(function() {
                    service.favorites = service.favorites.filter(function(el) {
                        return el.getID() != serie.getID();
                    });
                    console.info("Serie '" + serie.name + "' deleted. Syncing storage.");
                    $rootScope.$broadcast('storage:update');
                    if (service.favorites.length === 0) {
                        $rootScope.$broadcast('serieslist:empty');
                    }
                });
                service.clearAdding(serie.TVDB_ID);
            },
            refresh: function() {
                return service.getSeries().then(function(results) {
                    service.favorites = results;
                    var ids = [];
                    results.map(function(el) {
                        ids.push(el.TVDB_ID.toString());
                    });
                    service.favoriteIDs = ids;
                    // $rootScope.$broadcast('favorites:updated');
                    if (ids.length === 0) {
                        setTimeout(function() {
                            $rootScope.$broadcast('serieslist:empty');
                        }, 0);
                    }
                    return service.favorites;
                });
            },
            /**
             * Fetch all the series asynchronously and return them as POJO's
             * (Plain Old Javascript Objects)
             * Runs automatically when this factory is instantiated
             */
            getSeries: function() {
                return CRUD.Find('Serie', ['name is not NULL']).then(function(results) {
                    results.map(function(el, idx) {
                        results[idx] = el;
                    });
                    return results;
                });
            },
            /**
             * Load a random background from the shows database
             * The BackgroundRotator service is listening for this event
             */
            loadRandomBackground: function() {
                // dafuq. no RANDOM() in sqlite in chrome... 
                // then we pick a random array item from the resultset based on the amount.
                CRUD.EntityManager.getAdapter().db.execute("select fanart from Series where fanart != ''").then(function(result) {
                    if (result.rs.rows.length > 0) {
                        $rootScope.$broadcast('background:load', result.rs.rows.item(Math.floor(Math.random() * (result.rs.rows.length - 1))).fanart);
                    }
                });
            },
            /**
             * set true the adding status for this series. used to indicate spinner icon required
             */
            adding: function(tvdb_id) {
                if (!(tvdb_id in service.addingList)) {
                    service.addingList[tvdb_id] = true;
                    service.clearError(tvdb_id);
                }
            },
            /**
             * set false the adding status for this series. used to indicate checkmark icon required
             */
            added: function(tvdb_id) {
                if (tvdb_id in service.addingList) service.addingList[tvdb_id] = false;
            },
            /**
             * flush the adding and error status list
             */
            flushAdding: function() {
                service.addingList = {};
                service.errorList = {};
            },
            /**
             * Returns true as long as the add a show to favorites promise is running.
             */
            isAdding: function(tvdb_id) {
                if (tvdb_id === null) return false;
                return ((tvdb_id in service.addingList) && (service.addingList[tvdb_id] === true));
            },
            /**
             * Used to show checkmarks in the add modes for series that you already have.
             */
            isAdded: function(tvdb_id) {
                if (tvdb_id === null) return false;
                return service.hasFavorite(tvdb_id.toString());
            },
            /**
             * clear the adding status for this series. used to indicate spinner and checkmark are NOT required.
             */
            clearAdding: function(tvdb_id) {
                if ((tvdb_id in service.addingList)) delete service.addingList[tvdb_id];
            },
            /**
             * add the error status for this series. used to indicate sadface icon is required.
             */
            addError: function(tvdb_id, error) {
                service.errorList[tvdb_id] = error;
            },
            /**
             * Used to show sadface icon in the add modes for series that you already have.
             */
            isError: function(tvdb_id) {
                if (tvdb_id === null) return false;
                return ((tvdb_id in service.errorList));
            },
            /**
             * clear the error status for this series. used to indicate sadface icon is NOT required.
             */
            clearError: function(tvdb_id) {
                if ((tvdb_id in service.errorList)) delete service.errorList[tvdb_id];
            }
        };

        return service;
    }
])

.run(function(FavoritesService, $state) {
    FavoritesService.loadRandomBackground();

    FavoritesService.refresh().then(function(favorites) {
        if (favorites.length == 0 && $state.current.name != 'favorites.add') {
            setTimeout(function() {
                $state.go('favorites.add');
            }, 500);
        }
    })
})