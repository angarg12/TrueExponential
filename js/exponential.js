angular.module('incremental',[])
    .controller('IncCtrl',['$scope','$document','$interval', '$sce',function($scope,$document,$interval,$sce) { 
		var version = 0.3;
		
		var startPlayer = {
			cashPerClick:1,
			multiplier: 1,
			upgrades: [0,
						0,
						0,
						0,
						0],
			upgradesPrice: [10,
							100,
							1000,
							10000,
							100000],
			currency: new Decimal(0)
			//version: version
			};
		
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
        
		$scope.currencyValue = function() {
			return $sce.trustAsHtml(prettifyNumber($scope.player.currency));
		}
		
        $scope.click = function() {
            $scope.player.currency = $scope.player.currency.plus($scope.player.cashPerClick);
        };
        
        $scope.upgradePrice = function(number) {
			return $scope.player.upgradesPrice[number];
        };
        
        $scope.buyUpgrade = function(number) {
            if ($scope.player.currency.comparedTo($scope.upgradePrice(number)) >= 0) {
                $scope.player.currency = $scope.player.currency.minus($scope.upgradePrice(number));
                $scope.player.multiplier += upgradePower[number];
                $scope.player.upgrades[number]++;
				$scope.player.upgradesPrice[number] = (upgradeBasePrice[number] * Math.pow(1.2,$scope.player.upgrades[number])).toFixed();
            }
        };
        
        function update() {
            var updateTime = new Date().getTime();
            var timeDiff = (Math.min(1000, Math.max(updateTime - lastUpdate,0))) / 1000;
            lastUpdate = updateTime;
            var updateMultiplier = (1+($scope.player.multiplier-1) * timeDiff).toFixed(15);
            $scope.player.currency = $scope.player.currency.times(updateMultiplier);
        };
        
		function prettifyNumber(number){
			if(number.comparedTo(Infinity) == 0){
				return "&infin;";
			}
			if(number.comparedTo(1e21) >= 0){
				// Very ugly way to extract the mantisa and exponent from an exponential string
				var exponential = number.toString().split("e");
				var exponent = new Decimal(exponential[1].split("+")[1]);
				// And it is displayed in with superscript
				return  exponential[0]+" x 10<sup>"+prettifyNumber(exponent)+"</sup>";
			}
			return number.toString();
		};
		
        $document.ready(function(){
			if(typeof $scope.player  === 'undefined'){
				$scope.player = angular.copy(startPlayer);
			}
            $interval(update,80);
        });
}]);