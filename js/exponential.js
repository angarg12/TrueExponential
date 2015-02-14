angular.module('incremental',[])
    .controller('IncCtrl',['$scope','$document','$interval', '$sce',function($scope,$document,$interval,$sce) { 
		$scope.version = '0.8.2';
		$scope.Math = window.Math;
		
		var startPlayer = {
			cashPerClick: new Decimal(1),
			multiplier: new Decimal(10),
			multiplierUpgradeLevel: [],
			multiplierUpgradePrice: [],
			clickUpgradeLevel: [],
			clickUpgradePrice: [],
			currency: new Decimal(0),
			maxPrestige: 0,
			version: $scope.version,
			sprintFinished: false,
			sprintTimes: [],
			preferences: {logscale: $scope.logscale}
			};
		
        var multiplierUpgradeBasePrice = [];
        $scope.multiplierUpgradePower = [];
        $scope.clickUpgradePower = [];
		$scope.prestigeGoal = [new Decimal("1e4"),
							new Decimal("1e6"),
							new Decimal("1e16"),
							new Decimal("1e200"),
							new Decimal("1e1250"),
							new Decimal("1e2500"),
							new Decimal("1e5000"),
							new Decimal("1e12500"),
							new Decimal("1e25000"),
							new Decimal("1e50000"),
							new Decimal("1e100000"),
							new Decimal("1e9000000000000000")];
		$scope.currentPrestige = 0;
		var timer;
		var timerSeconds = 0;

		$scope.trustedPrettifyNumber = function(value) {
			return $sce.trustAsHtml(prettifyNumber(value));
		};
		
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
				var firstTerm = (1+0.2*(number+1)).toPrecision(15);
				var secondTerm = $scope.player.multiplierUpgradeLevel[number];
				var exponent = Decimal.pow(firstTerm,secondTerm);
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
			localStorage.setItem("timerSeconds", timerSeconds);
			var d = new Date();
			$scope.lastSave = d.toLocaleTimeString();
		}
		
		$scope.load = function load() {
			$scope.player = JSON.parse(localStorage.getItem("playerStored"));
			seconds = localStorage.getItem("timerSeconds");

			timerSet(seconds);
			$scope.player.currency = new Decimal($scope.player.currency);
			$scope.player.multiplier = new Decimal($scope.player.multiplier);
			$scope.player.cashPerClick = new Decimal($scope.player.cashPerClick);
			for (i = 0; i < $scope.player.multiplierUpgradePrice.length; i++) { 
				$scope.player.multiplierUpgradePrice[i] = new Decimal($scope.player.multiplierUpgradePrice[i]);
			}
			$scope.loadPreferences();
		}
		
		$scope.reset = function reset(ask) {
			var confirmation = true;
			if(ask){
				var confirmation = confirm("Are you sure you want to permanently erase your savefile?");
			}
			
			if(confirmation === true){
				init();
				timerReset();
				timerStart();
				generatePrestigePlayer($scope.player.maxPrestige);
				generatePrestigeUpgrades($scope.player.maxPrestige);
				localStorage.removeItem("playerStored");
				$scope.currentPrestige = 0;
			}
			$scope.loadPreferences();
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
			// Save the values of the player that persist between prestiges
			newPrestige = $scope.player.maxPrestige+1;
			preferences = $scope.player.preferences;
			version = $scope.player.version;
			sprintTimes = $scope.player.sprintTimes;
			
			// Reset the player
			init();
			
			// Reset the timer
			timerReset();
			timerStart();
			
			// Restore the values
			$scope.player.maxPrestige = newPrestige;
			$scope.player.preferences = preferences;
			$scope.player.version = version;
			$scope.player.sprintTimes = sprintTimes;
			
			// Generate the prestige values
			generatePrestigePlayer($scope.player.maxPrestige);
			generatePrestigeUpgrades($scope.player.maxPrestige);	
			$scope.currentPrestige++;
		};
		
        function update() {
            tempCurrency = $scope.player.currency.times($scope.player.multiplier);
			$scope.player.currency = adjustCurrency(tempCurrency);
        };
        
		function prettifyNumber(number){
			if(typeof number == 'undefined'){
				return;
			}
				
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
			versionComparison = versionCompare($scope.player.version,'0.8');
			if(versionComparison == -1 || versionComparison == false){
				if(ifImport){
					alert("This save is incompatible with the current version.");
					return;
				}
				alert("Your save has been wiped as part of an update. Sorry for the inconvenience.\n");
				$scope.reset(false);
				localStorage.setItem("playerStored", JSON.stringify($scope.player));
				
				return;
			}
			if(typeof $scope.player.version == 'undefined'){
				init();
				$scope.player.version = $scope.version;
			}
		};
		
		/**
		 * Simply compares two string version values.
		 * 
		 * Example:
		 * versionCompare('1.1', '1.2') => -1
		 * versionCompare('1.1', '1.1') =>  0
		 * versionCompare('1.2', '1.1') =>  1
		 * versionCompare('2.23.3', '2.22.3') => 1
		 * 
		 * Returns:
		 * -1 = left is LOWER than right
		 *  0 = they are equal
		 *  1 = left is GREATER = right is LOWER
		 *  And FALSE if one of input versions are not valid
		 *
		 * @function
		 * @param {String} left  Version #1
		 * @param {String} right Version #2
		 * @return {Integer|Boolean}
		 * @author Alexey Bass (albass)
		 * @since 2011-07-14
		 */
		versionCompare = function(left, right) {
			if (typeof left + typeof right != 'stringstring')
				return false;
			
			var a = left.split('.')
			,   b = right.split('.')
			,   i = 0, len = Math.max(a.length, b.length);
				
			for (; i < len; i++) {
				if ((a[i] && !b[i] && parseInt(a[i]) > 0) || (parseInt(a[i]) > parseInt(b[i]))) {
					return 1;
				} else if ((b[i] && !a[i] && parseInt(b[i]) > 0) || (parseInt(a[i]) < parseInt(b[i]))) {
					return -1;
				}
			}
			
			return 0;
		};

		function generatePrestigeUpgrades(prestigeLevel){
			multiplierUpgradeBasePrice = [];
			$scope.multiplierUpgradePower = [];
			$scope.clickUpgradePower = [];
			for (i = 0; i <= prestigeLevel; i++) { 
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
			for (i = 0; i <= prestigeLevel; i++) { 
				$scope.player.multiplierUpgradeLevel.push(0);
				$scope.player.multiplierUpgradePrice.push(new Decimal(Decimal.pow(10,Decimal.pow(2,i))));
				if(i > 0){
					$scope.player.clickUpgradeLevel.push(0);
					$scope.player.clickUpgradePrice.push(0.001*Math.pow(10,i-1));
				}
			}
		};
		
		function adjustCurrency(currency){
			if(currency.comparedTo($scope.prestigeGoal[$scope.player.maxPrestige]) >= 0){
				if($scope.player.sprintFinished == false){
					$scope.player.sprintFinished = true;
					timerStop();
					if($scope.player.sprintTimes.length < $scope.currentPrestige){
						throw new Error("Inconsistent prestige value: "+$scope.currentPrestige);
					}else if($scope.player.sprintTimes.length == $scope.currentPrestige){
						$scope.player.sprintTimes.push(timerSeconds);
					}else if(timerSeconds < $scope.player.sprintTimes[$scope.currentPrestige]){
						$scope.player.sprintTimes[$scope.currentPrestige] = timerSeconds;
					}
				}
				currency = $scope.prestigeGoal[$scope.player.maxPrestige];
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
				generatePrestigePlayer($scope.player.maxPrestige);
			}
			if(typeof $scope.lastSave  === 'undefined'){
				$scope.lastSave = "None";
			}
			versionControl(false);
			generatePrestigeUpgrades($scope.player.maxPrestige);
            $interval(update,1000);
            $interval($scope.save,60000);
			timerStart();
        });
			
		function timerSet(seconds){
			timerSeconds = seconds;
			if($scope.player.sprintFinished == true){
				timerStop();
			}
		}
			
		function timerAdd() {
			timerSeconds++;
		}
		
		function timerStart() {
			if(angular.isDefined(timer) || $scope.player.sprintFinished == true){
				return;
			}
			timer = $interval(timerAdd,1000);
		}
		
		function timerStop() {
			if (angular.isDefined(timer)) {
				$interval.cancel(timer);
				timer = undefined;
            }
		}
		
		function timerReset() {
			timerSeconds = 0;
		}
		
		$scope.getSprintTime = function getSprintTime(){
			return padCeroes(parseInt(timerSeconds/3600))+":"+
				padCeroes(parseInt((timerSeconds%3600)/60))+":"+
				padCeroes(timerSeconds%60);
		};
		
		function padCeroes(number){
			if(number <= 9){
				return "0"+number;
			}
			return number;
		};
}]);