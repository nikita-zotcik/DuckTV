DuckieTV.controller('serieSettingsCtrl', ["$scope", "$filter", "$uibModalInstance", "FavoritesService", "FormlyLoader", "data", "TorrentSearchEngines", 
function($scope, $filter, $modalInstance, FavoritesService, FormlyLoader, data, TorrentSearchEngines) {
    //console.debug("Reinitcontroller!");
    $scope.model = FavoritesService.getById(data.serie.TVDB_ID); // refresh the model because it's cached somehow by the $modalInstance. (serialisation probably)
    $scope.model.ignoreHideSpecials = $scope.model.ignoreHideSpecials == 1;
    $scope.model.autoDownload = $scope.model.autoDownload == 1;
    $scope.model.ignoreGlobalQuality = $scope.model.ignoreGlobalQuality == 1;
    $scope.model.ignoreGlobalIncludes = $scope.model.ignoreGlobalIncludes == 1;
    $scope.model.ignoreGlobalExcludes = $scope.model.ignoreGlobalExcludes == 1;

    FormlyLoader.load('SerieSettings').then(function(form) {
        $scope.fields = form;
    });
    $scope.searchProviders = [{'name': '', 'value': null}];
    Object.keys(TorrentSearchEngines.getSearchEngines()).map(function(searchProvider) {
        $scope.searchProviders.push({'name': searchProvider, 'value': searchProvider});
    });

    FormlyLoader.setMapping('options', {
        'searchProviders': $scope.searchProviders
    });

    $scope.save = function() {
        $scope.model.ignoreHideSpecials = $scope.model.ignoreHideSpecials ? 1 : 0;
        $scope.model.autoDownload = $scope.model.autoDownload ? 1 : 0;
        $scope.model.ignoreGlobalQuality = $scope.model.ignoreGlobalQuality ? 1 : 0;
        $scope.model.ignoreGlobalIncludes = $scope.model.ignoreGlobalIncludes ? 1 : 0;
        $scope.model.ignoreGlobalExcludes = $scope.model.ignoreGlobalExcludes ? 1 : 0;
        // despite (because?) type=number, some invalid data trapped by formly returns undefined. so this ensures that we persist as null to stop downstream errors.
        $scope.customSearchSizeMin = (typeof $scope.customSearchSizeMin === 'undefined') ? null : $scope.customSearchSizeMin;
        $scope.customSearchSizeMax = (typeof $scope.customSearchSizeMax === 'undefined') ? null : $scope.customSearchSizeMax;

        $scope.model.Persist().then(function() {
            $modalInstance.close();
            $scope.$destroy();
        });
    };

    $scope.cancel = function() {
        $modalInstance.close();
        $scope.$destroy();
    };

}]);
