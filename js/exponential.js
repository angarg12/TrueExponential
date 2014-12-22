angular.module('incremental',[])
    .controller('IncCtrl',['$scope','$document','$interval', '$sce',function($scope,$document,$interval,$sce) {
        BigNumber.config({ DECIMAL_PLACES: 10, ROUNDING_MODE: 4 });
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
        $scope.cashPerClick = 100000;
        
        $scope.multiplier = 0;

        $scope.upgrades = [0,
                           0,
                           0,
                           0,
                           0];
        $scope.currency = new BigNumber(0);
        
		$scope.currencyValue = function() {
			if($scope.currency.comparedTo(10e13) >= 0){
				// Very ugly way to extract the mantisa and exponent from an exponential string
				var number=$scope.currency.toExponential(13).split("e");
				var exponent = number[1].split("+")[1];
				//return $scope.currency.toPrecision(15);
				// And it is displayed in with superscript
				return  $sce.trustAsHtml(number[0]+" x 10<sup>"+exponent+"</sup>");
			}
			return $sce.trustAsHtml($scope.currency.toString());
		}
		
        $scope.click = function() {
            $scope.currency = $scope.currency.plus(($scope.cashPerClick));
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