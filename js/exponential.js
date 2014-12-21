angular.module('incremental',[])
    .controller('IncCtrl',['$scope','$document','$interval',function($scope,$document,$interval) {
        BigNumber.config({ DECIMAL_PLACES: 10, ROUNDING_MODE: 4 })
        var lastUpdate = 0;
        var upgradeBasePrice = [10,
                                100,
                                1000,
                                10000,
                                100000];
        var upgradePower = [0.0001,
                            0.001,
                            0.01,
                            0.1,
                            1];
        var cashPerClick = 1;
        
        $scope.multiplier = 0;

        $scope.cashPerClick = function() {
            return cashPerClick;
        };
        
        $scope.upgrades = [0,
                           0,
                           0,
                           0,
                           0];
        $scope.currency = new BigNumber(0);
        
		$scope.currencyValue = function() {
			if($scope.currency.comparedTo(10e13) >= 0){
				return $scope.currency.toPrecision(15);
			}
			return $scope.currency.toString();
		}
		
        $scope.click = function() {
            $scope.currency = $scope.currency.plus(($scope.cashPerClick()));
        };
        
        $scope.upgradePrice = function(number) {
            return (upgradeBasePrice[number] * Math.pow(1.2,$scope.upgrades[number])).toFixed();
        };
        
        $scope.buyUpgrade = function(number) {
            if ($scope.currency.comparedTo($scope.upgradePrice(number)) >= 0) {
                $scope.currency = $scope.currency.minus($scope.upgradePrice(number));
                $scope.multiplier += upgradePower[number];
                $scope.upgrades[number]++;
            }
        };
        
        function update() {
            var updateTime = new Date().getTime();
            var timeDiff = (Math.min(1000, Math.max(updateTime - lastUpdate,0))) / 1000;
            lastUpdate = updateTime;
            var updateMultiplier = 1+$scope.multiplier * timeDiff;
            $scope.currency = $scope.currency.times(updateMultiplier.toFixed(15)).round(15);
            

        };
        
        $document.ready(function(){
            $interval(update,80);
        });
    }]);