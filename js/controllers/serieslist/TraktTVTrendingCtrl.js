DuckieTV.controller('traktTvTrendingCtrl', ["$scope", "$filter", "TraktTVTrending", "$state", "FavoritesService", "$rootScope",
    function($scope, $filter, TraktTVTrending, $state, FavoritesService, $rootScope) {
        var trending = this;
        this.results = [];
        this.filtered = [];
        this.limit = 75;
        this.oldLimit = 75;
        this.activeCategory = false;
        var categories = 'action|adventure|animation|children|comedy|crime|disaster|documentary|drama|eastern|family|fan-film|fantasy|film-noir|food|game-show|history|holiday|home-and-garden|horror|indie|mini-series|music|musical|mystery|news|none|reality|road|romance|science-fiction|short|soap|special-interest|sport|suspense|talk-show|thriller|travel|tv-movie|war|western'.split('|'); // used by this.translateCategory()        
        var translatedCategoryList = $filter('translate')('GENRELIST').split(',');

        FavoritesService.waitForInitialization().then(function() {
            if(FavoritesService.favorites.length == 0) {
                trending.noFavs = true;
            }
        });

        /*
         * Takes the English Category (as fetched from TraktTV) and returns a translation
         */
        this.translateCategory = function(category) {
            var idx = categories.indexOf(category);
            return (idx != -1) ? translatedCategoryList[idx] : category;
        };

        this.getCategories = function() {
            return TraktTVTrending.getCategories();
        };

        this.toggleCategory = function(category) {
            if (!category || this.activeCategory == category) {
                this.activeCategory = false;
                TraktTVTrending.getAll().then(function(result) {
                    trending.filtered = result;
                });
                this.limit = this.oldLimit;
            } else {
                this.activeCategory = category;
                this.filtered = TraktTVTrending.getByCategory(category);
                this.limit = this.filtered.length;
            }
            $rootScope.$emit('lazyImg:refresh');
        };

        this.getFilteredResults = function() {
            return this.filtered;
        };

        this.setHoverSerie = function(serie) {
            $state.go('favorites.add.trakt-serie', {
                id: serie.tvdb_id
            });
        };

        TraktTVTrending.getAll().then(function(results) {
            trending.filtered = results;
        });
    }
]);