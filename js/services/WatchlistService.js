/** 
 * The Watchlist Service stores items that are to be monitored.
 * Since the structure is not yet rock solid the items are stored as serialized json
 */
DuckieTV.factory('WatchlistService', ["$rootScope", "IMDB",
    function($rootScope, IMDB) {
        var service = {
            watchlist: [],

            add: function(data) {
                //console.debug("Add!", data);
                var watchlistitem = new WatchListItem();
                watchlistitem.set('searchstring', data.title);
                //console.debug("Saving!", watchlistitem);
                watchlistitem.Persist().then(function(e) {

                    var obj = new WatchListObject();
                    obj.set('property', 'imdb');
                    obj.set('json', angular.toJson(data, true));
                    obj.set('ID_WatchListItem', watchlistitem.ID_WatchListItem);
                    obj.Persist().then(function(obj) {
                        service.restore();
                    }, function(err) {

                    });
                }, function(fail) {
                    console.warn("Error persisting watchlistitem!", data, arguments);
                });
            },
            getById: function(id) {
                return CRUD.FindOne('WatchListItem', {
                    'ID_WatchlistItem': id
                });
            },
            remove: function(watchlistitem) {
                //console.debug("Remove watchlistitem from watchlist!", watchlistitem);
                var self = this;
                this.getById(watchlistitem.ID_WatchListItem).then(function(watchlistitem) {
                    watchlistitem.Delete().then(function() {
                        self.restore();
                    });
                });
            },
            /**
             * Fetch stored watchlistitems from sqlite and store them in service.watchlist
             * Notify anyone listening by broadcasting watchlist:updated
             */
            restore: function() {
                //console.debug("restoring watchlist!");
                CRUD.Find('WatchListItem').then(function(results) {
                    //console.debug("Fetched watchlist results: ", results);
                    var watchlist = [];
                    results.map(function(result) {
                        CRUD.Find('WatchListObject', {
                            'ID_WatchListItem': result.ID_WatchListItem
                        }).then(function(props) {

                            var item = result.asObject();
                            for (var j = 0; j < props.length; j++) {
                                item[props[j].get('property')] = angular.fromJson(props[j].get('json'));
                            }
                            watchlist.push(item);
                            if (watchlist.length == results.length) {
                                //console.debug("Watchlist done!", watchlist.length, results.length, watchlist);
                                service.watchlist = watchlist;
                                $rootScope.$broadcast('watchlist:updated', service.watchlist);
                            }
                        });
                    }, function(err) {
                        console.warn("Error fetching watchlist", err);
                    });
                });
            }
        };

        service.restore();
        return service;
    }
]);
