DuckieTV.factory('SidePanelState', function() {

    var service = {
        state: {
            isShowing: false,
            isExpanded: false
        },
        show: function() {
            if (document.body.scrollHeight > window.innerHeight) {
                document.body.style.overflowY = 'auto';
            }
            document.body.scrollTop = 0;
            service.state.isShowing = true;
            service.state.isExpanded = false;
            document.body.classList.add('sidepanelActive');
            document.body.classList.remove('sidepanelExpanded');
        },
        hide: function() {
            document.body.style.overflowY = '';
            service.state.isShowing = false;
            service.state.isExpanded = false;
            document.body.classList.remove('sidepanelActive');
            document.body.classList.remove('sidepanelExpanded');
        },
        expand: function() {
            document.body.classList.add('sidepanelExpanded');
            service.state.isExpanded = true;
        },
        contract: function() {
            document.body.classList.remove('sidepanelExpanded');
            service.state.isExpanded = false;
        }
    };
    return service;
})

.directive('sidepanel', function() {
    return {
        restrict: 'E',
        templateUrl: 'templates/sidepanel/sidepanel.html',
        controllerAs: 'panel',
        bindToController: true,
        transclude: true,

        controller: ["$rootScope", "$scope", "SidePanelState", function($rootScope, $scope, SidePanelState) {
            var panel = this;

            this.isShowing = false;
            this.isExpanded = false;

            Object.observe(SidePanelState.state, function(newValue) {
                panel.isShowing = newValue[0].object.isShowing;
                panel.isExpanded = newValue[0].object.isExpanded;
                $scope.$applyAsync();
                setTimeout(function() {
                    $scope.$applyAsync();
                }, 250);
            });

            if (SidePanelState.state.isShowing) {
                this.isShowing = true;
            }
            if (SidePanelState.state.isExpanded) {
                this.isExpanded = true;
            }

            this.toggle = function() {
                this.isShowing ? SidePanelState.hide() : SidePanelState.show();
            };
            this.hide = function() {
                SidePanelState.hide();
            };
        }]
    };
})

/**
 * Click trap directive that catches clicks outside the sidepanel and hides it.
 */
.directive('clicktrap', ["SidePanelState", "$state",
    function(SidePanelState, $state) {
        return {
            restrict: 'E',
            link: function($scope, iElement) {
                iElement[0].onclick = function() {
                    if (SidePanelState.state.isShowing) {
                        Array.prototype.map.call(document.querySelectorAll('#actionbar a'), function(el) {
                            el.classList.remove('active');
                        });
                        var elm = document.querySelector('#actionbar_calendar');
                        elm.classList.add('fastspin');
                        setTimeout(function() {
                            $state.go('calendar').then(function() {
                                setTimeout(function() {
                                    elm.classList.remove('fastspin');
                                }, 500);
                            });
                        });
                    }
                };
            }
        };
    }
]);