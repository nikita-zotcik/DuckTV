 angular.module('DuckieTV.controllers.trakttv', [])

 .controller('TraktTVCtrl', function($scope, $rootScope, TraktTV, FavoritesService) {

     $scope.credentials = {
         username: 'schizoduckie',
         password: null,
         passwordHash: null
     };

     $scope.traktTVSeries = [];
     $scope.tvdbSeries = {};

     $scope.encryptPassword = function() {
         if ($scope.credentials.password !== null) {
             $scope.credentials.passwordHash = CryptoJS.SHA1($scope.credentials.password).toString();
             $scope.credentials.password = angular.copy($scope.credentials.passwordHash);
         }
     }

     $scope.isDownloaded = function(tvdb_id) {
         return tvdb_id in $scope.tvdbSeries;
     }

     $scope.getDownloaded = function(tvdb_id) {
         return $scope.tvdbSeries[tvdb_id];
     }


     $scope.readTraktTV = function() {
         TraktTV.getUserWatched($scope.credentials.username).then(function(data) {
             console.log("Found watched from Trakt.TV", data);
             data.map(function(show) {
                 $scope.traktTVSeries.push(show);
                 if (!(show.tvdb_id in $scope.tvdbSeries)) {
                     TraktTV.findSerieByTVDBID(show.tvdb_id).then(function(serie) {
                         $scope.tvdbSeries[show.tvdb_id] = serie;
                         FavoritesService.addFavorite(serie).then(function() {
                             show.seasons.map(function(season) {
                                 season.episodes.map(function(episode) {
                                     CRUD.FindOne('Episode', {
                                         seasonnumber: season.season,
                                         episodenumber: episode,
                                         'Serie': {
                                             TVDB_ID: show.tvdb_id
                                         }
                                     }).then(function(epi) {
                                         console.log("Episode marked as watched: ", serie.title, epi.getFormattedEpisode());
                                         epi.set('watched', 1);
                                         epi.set('watchedAt', new Date().getTime());
                                         epi.Persist();
                                     })
                                 });
                             });
                         });
                     });
                 }
             });
             $scope.traktTVSeries = data;
         });

         TraktTV.getUserShows($scope.credentials.username).then(function(data) {
             console.log("Found user shows from Trakt.tV", data);
             data.map(function(show) {
                 if ($scope.traktTVSeries.filter(function(el) {
                     return el.tvdb_id == show.tvdb_id;
                 }).length === 0) {
                     TraktTV.findSerieByTVDBID(show.tvdb_id).then(function(show) {
                         $scope.traktTVSeries.push(show);
                         if (!(show.tvdb_id in $scope.tvdbSeries)) {
                             $scope.tvdbSeries[show.tvdb_id] = show;
                             FavoritesService.addFavorite(show);
                         }
                     });
                 }

             });

         });
     };

 });