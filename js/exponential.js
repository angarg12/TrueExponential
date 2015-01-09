angular.module('incremental',[])
    .controller('IncCtrl',['$scope','$document','$interval', '$sce',function($scope,$document,$interval,$sce) { 
		$scope.version = 0.5;
		
		var startPlayer = {
			cashPerClick:1,
			multiplier: 1,
			multiplierUpgradeLevel: [0,
									0,
									0,
									0,
									0],
			multiplierUpgradePrice: [10,
									100,
									10000,
									100000000,
									10000000000000000],
			clickUpgradeLevel: [0,
								0,
								0,
								0],
			clickUpgradePrice: [0.001,
								0.01,
								0.1,
								1],
			currency: new Decimal(0),
			version: $scope.version
			};
		
		var lastUpdate = 0;
        var multiplierUpgradeBasePrice = [10,
										100,
										10000,
										100000000,
										10000000000000000];
        $scope.multiplierUpgradePower = [0.0001,
									0.001,
									0.01,
									0.1,
									1];
        var clickUpgradeBasePrice = [10,
									100,
									10000,
									100000000,
									10000000000000000];
        $scope.clickUpgradePower = [10,
								1000,
								100000,
								10000000];
        
		$scope.currencyValue = function() {
			return $sce.trustAsHtml(prettifyNumber($scope.player.currency));
		}
		
        $scope.click = function() {
            $scope.player.currency = $scope.player.currency.plus($scope.player.cashPerClick);
        };
        
        $scope.buyMultiplierUpgrade = function(number) {
            if ($scope.player.currency.comparedTo($scope.player.multiplierUpgradePrice[number]) >= 0) {
                $scope.player.currency = $scope.player.currency.minus($scope.player.multiplierUpgradePrice[number]);
                $scope.player.multiplier += $scope.multiplierUpgradePower[number];
                $scope.player.multiplierUpgradeLevel[number]++;
				$scope.player.multiplierUpgradePrice[number] = (multiplierUpgradeBasePrice[number] * 
					Math.pow(2,Math.pow(1+0.2*(number+1),$scope.player.multiplierUpgradeLevel[number])))
					.toFixed();
            }
        };
        
        $scope.buyClickUpgrade = function(number) {
            if ($scope.player.multiplier >= $scope.player.clickUpgradePrice[number]) {			
                $scope.player.multiplier -= $scope.player.clickUpgradePrice[number];
				$scope.player.cashPerClick += $scope.clickUpgradePower[number];
                $scope.player.clickUpgradeLevel[number]++;
            }
        };
		
		$scope.save = function save() {
			localStorage.setItem("playerStored", JSON.stringify($scope.player));
			var d = new Date();
			$scope.lastSave = d.toLocaleTimeString();
		}
		
		$scope.load = function load() {
			$scope.player = JSON.parse(localStorage.getItem("playerStored"));
			$scope.player.currency = new Decimal($scope.player.currency);
		}
		
		$scope.reset = function reset() {
			var confirmation = confirm("Are you sure you want to permanently erase your savefile?");
			if(confirmation === true){
				$scope.player = angular.copy(startPlayer);
				localStorage.removeItem("playerStored");
			}
		}
		
		$scope.exportSave = function exportSave() {
			var exportText = btoa(JSON.stringify($scope.player));
			
			document.getElementById("exportSaveContents").style = "display: initial";
			document.getElementById("exportSaveText").value = exportText;
			document.getElementById("exportSaveText").select();
		}
		
		$scope.importSave = function importSave(){
			var importText = prompt("Paste the text you were given by the export save dialog here.\n" +
										"Warning: this will erase your current save!");
			if(importText){
				$scope.player = JSON.parse(atob(importText));
				$scope.player.currency = new Decimal($scope.player.currency);
				versionControl(true);
				save();
			}
		}
		
        function update() {
            $scope.player.currency = $scope.player.currency.times($scope.player.multiplier.toFixed(15));
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
		
		function versionControl(ifImport){
			if($scope.player.version < $scope.version || 
				typeof $scope.player.version == 'undefined'){
				$scope.player.version = $scope.version;
			}
		};
		
        $document.ready(function(){
			if(localStorage.getItem("playerStored") != null){
				$scope.load();
			}
			if(typeof $scope.player  === 'undefined'){
				$scope.player = angular.copy(startPlayer);
			}
			if(typeof $scope.lastSave  === 'undefined'){
				$scope.lastSave = "None";
			}
			versionControl(false);
            $interval(update,1000);
            $interval($scope.save,60000);
        });
}]);