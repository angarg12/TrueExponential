angular.module('incremental',[])
    .controller('IncCtrl',['$scope','$document','$interval', '$sce',function($scope,$document,$interval,$sce) { 
		$scope.version = 0.7;
		$scope.Math = window.Math;
		
		var startPlayer = {
			cashPerClick: new Decimal(1),
			multiplier: new Decimal(1),
			multiplierUpgradeLevel: [],
			multiplierUpgradePrice: [],
			clickUpgradeLevel: [],
			clickUpgradePrice: [],
			currency: new Decimal(0),
			prestige: 1,
			version: $scope.version,
			preferences: {logscale: $scope.logscale}
			};
		
        var multiplierUpgradeBasePrice = [];
        $scope.multiplierUpgradePower = [];
        $scope.clickUpgradePower = [];
        $scope.prestigeGoal = [new Decimal("1e4"),
							new Decimal("1e16")];
		$scope.sprintFinished = false;
		
		$scope.currencyValue = function() {
			return $sce.trustAsHtml(prettifyNumber($scope.player.currency));
		}
		
        $scope.click = function() {
			tempCurrency = $scope.player.currency.plus($scope.player.cashPerClick);
			$scope.player.currency = adjustCurrency(tempCurrency);
        };
        
        $scope.buyMultiplierUpgrade = function(number) {
            if ($scope.player.currency.comparedTo($scope.player.multiplierUpgradePrice[number]) >= 0) {
                $scope.player.currency = $scope.player.currency.div($scope.player.multiplierUpgradePrice[number]);
                $scope.player.multiplier = $scope.player.multiplier.plus($scope.multiplierUpgradePower[number]);
                $scope.player.multiplierUpgradeLevel[number]++;
				// The cost function is of the form 2^1.x^(upgradeLevel), where 1.x depends on the upgrade tier
				var exponent = Decimal.pow(1+0.2*(number+1),$scope.player.multiplierUpgradeLevel[number]);
				$scope.player.multiplierUpgradePrice[number] = multiplierUpgradeBasePrice[number].
					times(Decimal.pow(2,exponent));
            }
        };
        
        $scope.buyClickUpgrade = function(number) {
            if ($scope.player.multiplier.comparedTo($scope.player.clickUpgradePrice[number])  >= 0) {			
                $scope.player.multiplier = $scope.player.multiplier.minus($scope.player.clickUpgradePrice[number]);
				$scope.player.cashPerClick = $scope.player.cashPerClick.plus($scope.clickUpgradePower[number]);
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
			$scope.player.multiplier = new Decimal($scope.player.multiplier);
			$scope.player.cashPerClick = new Decimal($scope.player.cashPerClick);
			for (i = 0; i < $scope.player.multiplierUpgradePrice.length; i++) { 
				$scope.player.multiplierUpgradePrice[i] = new Decimal($scope.player.multiplierUpgradePrice[i]);
			}
			$scope.loadPreferences();
		}
		
		$scope.reset = function reset() {
			var confirmation = confirm("Are you sure you want to permanently erase your savefile?");
			if(confirmation === true){
				init();
				generatePrestigePlayer($scope.player.prestige);
				generatePrestigeUpgrades($scope.player.prestige);
				localStorage.removeItem("playerStored");
			}
			$scope.loadPreferences();
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
				$scope.loadPreferences();
			}
		}
		
		$scope.updatePreferences = function updatePreferences(preference){
			$scope.player.preferences[preference] = $scope[preference];
		};
		
		$scope.loadPreferences = function loadPreferences(){
			for(preference in $scope.player.preferences){
				$scope[preference] = $scope.player.preferences[preference];
			}
		};
		
		$scope.prestige = function prestige(){
			$scope.player.prestige += 1;
			generatePrestigePlayer($scope.player.prestige);
			generatePrestigeUpgrades($scope.player.prestige);
			$scope.player.cashPerClick = new Decimal(1000);
			$scope.player.multiplier = new Decimal(1);
			$scope.player.currency = new Decimal(0);
			$scope.sprintFinished = false;
		};
		
        function update() {
            tempCurrency = $scope.player.currency.times($scope.player.multiplier);
			$scope.player.currency = adjustCurrency(tempCurrency);
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
			if($scope.player.versionNum < 0.7){
				if(ifImport){
					alert("This save is incompatible with the current version.");
					return;
				}
				alert("Your save has been wiped as part of an update. Sorry for the inconvenience.\n");
				init();
				localStorage.setItem("playerStored", JSON.stringify($scope.player));
				return;
			}
			if(typeof $scope.player.version == 'undefined'){
				init();
				$scope.player.version = $scope.version;
			}
		};
		
		function generatePrestigeUpgrades(prestigeLevel){
			multiplierUpgradeBasePrice = [];
			$scope.multiplierUpgradePower = [];
			$scope.clickUpgradePower = [];
			for (i = 0; i < prestigeLevel; i++) { 
				multiplierUpgradeBasePrice.push(new Decimal(Decimal.pow(10,Decimal.pow(2,i))));
				$scope.multiplierUpgradePower.push(0.0001*Math.pow(10,i));
				if(i > 0){
					$scope.clickUpgradePower.push(new Decimal(10*Decimal.pow(100,i-1)));
				}
			}
		};
		
		function generatePrestigePlayer(prestigeLevel){
			$scope.player.multiplierUpgradeLevel = [];
			$scope.player.multiplierUpgradePrice = [];
			$scope.player.clickUpgradeLevel = [];
			$scope.player.clickUpgradePrice = [];
			for (i = 0; i < prestigeLevel; i++) { 
				$scope.player.multiplierUpgradeLevel.push(0);
				$scope.player.multiplierUpgradePrice.push(new Decimal(Decimal.pow(10,Decimal.pow(2,i))));
				if(i > 0){
					$scope.player.clickUpgradeLevel.push(0);
					$scope.player.clickUpgradePrice.push(0.001*Math.pow(10,i-1));
				}
			}
		};
		
		function adjustCurrency(currency){
			if(currency.comparedTo($scope.prestigeGoal[$scope.player.prestige-1]) > 0){
				currency = $scope.prestigeGoal[$scope.player.prestige-1];
				$scope.sprintFinished = true;
			}
			return currency;
		}
		
		function init(){
			$scope.player = angular.copy(startPlayer);
		};
		
        $document.ready(function(){
			if(localStorage.getItem("playerStored") != null){
				$scope.load();
			}
			if(typeof $scope.player  === 'undefined'){
				init();
				generatePrestigePlayer($scope.player.prestige);
			}
			if(typeof $scope.lastSave  === 'undefined'){
				$scope.lastSave = "None";
			}
			versionControl(false);
			generatePrestigeUpgrades($scope.player.prestige);
            $interval(update,1000);
            $interval($scope.save,60000);
        });
}]);