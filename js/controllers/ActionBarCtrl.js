/**
 * Actionbar Controller
 */

DuckieTV.controller('ActionBarCtrl', ["$rootScope", "$filter", "SeriesListState", "SidePanelState",
    function($rootScope, $filter, SeriesListState, SidePanelState) {

        this.hideSeriesList = function() {
            SeriesListState.hide();
        };

        this.toggleSeriesList = function() {
            SeriesListState.toggle();
        };

        this.contractSidePanel = function() {
            SidePanelState.show();
            SidePanelState.contract();
        };

        this.showSidePanel = function() {
            SidePanelState.show();
        }

        this.expandSidePanel = function() {
            SidePanelState.expand();
        }

        this.resetCalendar = function() {
            $rootScope.$broadcast('calendar:setdate', new Date());
        };

        this.getHeartTooltip = function() {
            return SeriesListState.state.isShowing ? $filter('translate')('SERIESLIST/series-hide/glyph') : $filter('translate')('SERIESLIST/series-show/glyph');
        };
    }
])