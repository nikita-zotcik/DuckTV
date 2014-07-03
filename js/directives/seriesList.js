angular.module('DuckieTV.directives.serieslist', [])

/**
 * The Serieslist directive is what's holds the favorites list and allows you to add/remove series and episodes to your calendar.
 * It also is used as the main navigation to get to any of your series.
 */
.directive('seriesList', function(FavoritesService, $rootScope, $filter, TraktTV) {
  return {
    restrict: 'E',
    transclude: true,
    templateUrl: "templates/home-series.html",
    link: function($scope, iElement) {


      $scope.search = {
        query: undefined,
        results: null
      }

      $scope.activated = false; // toggles when the favorites panel activated
      $scope.searchingForSerie = false; // toggles when 'add a show' is clicked
      $scope.serieAddFocus = false; // toggles this to automatically bring focus to the 'start typing to search for a serie' textbox

      $scope.mode = $rootScope.getSetting('series.displaymode'); // series display mode. Either 'banner' or 'poster', banner being wide mode, poster for portrait.

      /**
       * Set the series list display mode to either banner or poster.
       * Temporary mode is for enabling for instance the search, it's not stored.
       */
      $scope.setMode = function(mode, temporary) {
        if (!temporary) {
          $rootScope.setSetting('series.displaymode', mode);
        }
        $scope.mode = mode;
      }

      /**
       * Change location to the series details when clicked from display mode.
       */
      $scope.go = function(serieID, episode) {
        window.location.href = '#/serie/' + serieID + '/episode/' + episode.getID();
      }

      /**
       * Enabled 'add' serie mode.
       * Toggles the search panel and populates the trending mode when needed.
       */
      $scope.enableAdd = function() {
        $scope.searchingForSerie = true;
        $scope.trendingSeries = true;
        $scope.serieAddFocus = true;
        $scope.mode = $rootScope.getSetting('series.displaymode');
        $scope.search.query = undefined;
        $scope.search.results = null;

        if (!$scope.trending) {
          $scope.trending = {
            results: []
          };
          TraktTV.disableBatchMode().findTrending().then(function(res) {
            $scope.trending.results = res;
          });
        }

      }

      /**
       * Turn 'add serie' mode off, reset to stored display mode.
       */
      $scope.disableAdd = function() {
        $scope.searchingForSerie = false;
        $scope.mode = $rootScope.getSetting('series.displaymode');
      }

      /**
       * toggle or untoggle the favorites panel
       */
      $scope.activate = function(el) {
        iElement.addClass('active');
        $scope.activated = true;
        if (FavoritesService.favorites.length > 0) {
          $scope.disableAdd(); // disable add mode when the panel is activated every time. But not if favorites list is empty.
        }
      }

      /**
       * Close the drawer
       */
      $scope.closeDrawer = function() {
        iElement.removeClass('active');
        $scope.activated = false;
      }

      /**
       * Pop up a confirm dialog and remove the serie from favorites when confirmed.
       */
      $scope.removeFromFavorites = function(serie) {
        var dlg = $dialogs.confirm($filter('translate')('SERIEDETAILSjs/serie-delete/hdr'),
        $filter('translate')('SERIEDETAILSjs/serie-delete-question/p1') +
        serie.name +
        $filter('translate')('SERIEDETAILSjs/serie-delete-question/p2')
        );
        dlg.result.then(function(btn) {
          console.log("Remove from favorites!", serie);
          FavoritesService.remove(serie);
          $location.path('/')
        }, function(btn) {
          $scope.confirmed = $filter('translate')('SERIEDETAILSjs/serie-delete-confirmed');
        });
      }


      /**
       * When mode == 'filter', these are in effect.
       * Filters the local series list by substring.
       */
      $scope.localFilterString = '';
      $scope.setFilter = function(val) {
        $scope.localFilterString = val;
      }
      $scope.localFilter = function(el) {
        return el.name.toLowerCase().indexOf($scope.localFilterString.toLowerCase()) > -1;
      }

      /**
       * Automatically launch the first search result when user hits enter in the filter form
       */
      $scope.execFilter = function() {
        $location.path("/series/" + $scope.favorites.filter($scope.localFilter)[0].TVDB_ID);
      }

      /**
       * Fires when user types in the search box. Executes trakt.tv search based on find-while-you type.
       */
      $scope.findSeries = function() {
        if ($scope.search.query.trim() < 2) { // when query length is smaller than 2 chars, auto-show the trending results
          $scope.trendingSeries = true;
          $scope.search.results = null;
          return;
        }
        // disableBatchMode makes sure that previous request are aborted when a new one is started.
        return TraktTV.disableBatchMode().findSeries($scope.search.query).then(function(res) {
          $scope.trendingSeries = false; // we have a result, hide the trending series.
          TraktTV.enableBatchMode();
          $scope.search.results = res.series;
        });
      };

      /**
       * Fires when user hits enter in the search serie box. Auto-selects the first result and adds it to favorites.
       */
      $scope.selectFirstResult = function() {
        var serie = $scope.search.results[0];
        $scope.selectSerie(serie);
      }

      $scope.adding = {}; // object that will hold tvdb_id's of shows that are currently being added to the database

      /**
       * Add a show to favorites.
       * The serie object is a Trakt.TV TV Show Object.
       * Queues up the tvdb_id in the $scope.adding array so that the spinner can be shown.
       * Then adds it to the favorites list and when that's done, toggles the adding flag to false so that
       * It can show the checkmark.
       */
      $scope.selectSerie = function(serie) {
        $scope.adding[serie.tvdb_id] = true;
        TraktTV.enableBatchMode().findSerieByTVDBID(serie.tvdb_id).then(function(serie) {
          FavoritesService.addFavorite(serie).then(function() {
            $rootScope.$broadcast('storage:update');
            $scope.adding[serie.tvdb_id] = false;
          });
        });
      }


      /**
       * Verify with the favoritesservice if a specific TVDB_ID is registered.
       * Used to show checkmarks in the add modes for series that you already have.
       */
      $scope.isAdded = function(tvdb_id) {
        return FavoritesService.hasFavorite(tvdb_id.toString());
      }

      /**
       * Returns true as long as the add a show to favorites promise is running.
       */
      $scope.isAdding = function(tvdb_id) {
        return ((tvdb_id in $scope.adding) && ($scope.adding[tvdb_id] === true))
      }


      /**
       * The favorites service fetches data asynchronously via SQLite, we wait for it to emit the favorites:updated event.
       */
      $scope.favorites = FavoritesService.favorites;

      /**
       * Another class could fire an event that says this thing should close.
       * This is hooked from app.js, which monitors location changes.
       */
      $rootScope.$on('serieslist:hide', function() {
        $scope.closeDrawer();
      });

      /**
       * When the favorites list signals it's updated, we update the favorites here as well.
       * when the series list is empty, this makes it automatically pop up.
       * Otherwise, a random background is automagically loaded.
       */
      $rootScope.$on('favorites:updated', function(event, data) {
        FavoritesService.getSeries().then(function(series) {
          console.log("Favorites updated!", series.length);
          $scope.favorites = series;
          if (series.length == 0) {
            $rootScope.$broadcast('serieslist:empty'); // we notify all listening channels that the series list is empty.
          } else {
            FavoritesService.loadRandomBackground();
          }
        });
      });

      /**
       * When a new show has been inserted, we automatically load the background fanart
       */
      $rootScope.$on('episodes:inserted', function(event, serie) {
        if (serie.get('fanart') != null) {
          $rootScope.$broadcast('background:load', serie.get('fanart'));
        }
      });

      /**
       * When we detect the serieslist is empty, we pop up the panel and enable add mode.
       * This also enables trakt.tv most trending series download when it hasn't happen
       */
      $rootScope.$on('serieslist:empty', function(event) {
        console.log("Serieslist empty!!! ");
        $scope.activate();
        $scope.enableAdd();
      });

    }
  }
})
