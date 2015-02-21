angular.module('incremental',[])
    .controller('IncCtrl',['$scope','$document','$interval', '$sce',function($scope,$document,$interval,$sce) { 
		$scope.version = '0.10';
		$scope.Math = window.Math;
		
		const startPlayer = {
			clickMultiplier: new Decimal(1.001),
			multiplier: new Decimal(1),
			multiplierUpgradeLevel: [],
			multiplierUpgradePrice: [],
			currency: new Decimal(1),
			maxPrestige: 0,
			version: $scope.version,
			sprintTimes: [],
			preferences: {logscale: $scope.logscale}
			};
		
		// Procedurally generated
        var multiplierUpgradeBasePrice = [];
        $scope.multiplierUpgradePower = [];
		
		// Variables
		$scope.sprintFinished = false;
		$scope.currentPrestige = 0;
		var timer;
		var timerSeconds = 0;
		
		// Constants
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

		$scope.trustedPrettifyNumber = function(value) {
			return $sce.trustAsHtml(prettifyNumber(value));
		};
		
        $scope.click = function() {
			var tempCurrency = $scope.player.currency.times($scope.player.clickMultiplier);
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
				if($scope.player.multiplierUpgradeLevel[number] == 1){
					generatePrestigePlayer(number+1,false);
					generatePrestigeUpgrades(number+1,false);
				}
            }
        };

		$scope.save = function save() {
			localStorage.setItem("playerStored", JSON.stringify($scope.player));
			localStorage.setItem("timerSeconds", timerSeconds);
			localStorage.setItem("sprintFinished", $scope.sprintFinished);
			localStorage.setItem("currentPrestige", $scope.currentPrestige);
			var d = new Date();
			$scope.lastSave = d.toLocaleTimeString();
		}
		
		$scope.load = function load() {
			$scope.player = JSON.parse(localStorage.getItem("playerStored"));
			var seconds = parseInt(localStorage.getItem("timerSeconds"));
			// Have to do this, otherwise is read as string
			$scope.sprintFinished = localStorage.getItem("sprintFinished") === "true";
			$scope.currentPrestige = parseInt(localStorage.getItem("currentPrestige"));

			timerSet(seconds);
			$scope.player.currency = new Decimal($scope.player.currency);
			$scope.player.multiplier = new Decimal($scope.player.multiplier);
			$scope.player.clickMultiplier = new Decimal($scope.player.clickMultiplier);
			for (var i = 0; i < $scope.player.multiplierUpgradePrice.length; i++) { 
				$scope.player.multiplierUpgradePrice[i] = new Decimal($scope.player.multiplierUpgradePrice[i]);
			}
			$scope.loadPreferences();
		}
		
		$scope.reset = function reset(ask) {
			var confirmation = true;
			if(ask){
				confirmation = confirm("Are you sure you want to permanently erase your savefile?");
			}
			
			if(confirmation === true){
				init();
				timerReset();
				timerStart();
				generatePrestigePlayer(0,true);
				generatePrestigeUpgrades(0,true);
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
		
		$scope.prestige = function prestige(level){
			// Save the values of the player that persist between prestiges
			var newPrestige = $scope.player.maxPrestige;
			if(level > newPrestige){
				newPrestige = level;
			}
			preferences = $scope.player.preferences;
			playerVersion = $scope.player.version;
			sprintTimes = $scope.player.sprintTimes;
			
			// Reset the player
			init();
			
			// Reset the timer
			timerReset();
			timerStart();
			
			// Restore the values
			$scope.player.maxPrestige = newPrestige;
			$scope.player.preferences = preferences;
			$scope.player.version = playerVersion;
			$scope.player.sprintTimes = sprintTimes;
			
			// Generate the prestige values
			$scope.currentPrestige = level;
			if(isEndgame(level)){
				generatePrestigePlayer(0,true);
				generatePrestigeUpgrades(0,true);
			}else{
				generatePrestigePlayer(level,true);
				generatePrestigeUpgrades(level,true);
			}
		};
		
        function update() {
            var tempCurrency = $scope.player.currency.times($scope.player.multiplier);
			$scope.player.currency = adjustCurrency(tempCurrency);
        }
        
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
		}
		
		function versionControl(ifImport){
			versionComparison = versionCompare($scope.player.version,'0.10');
			if(versionComparison === -1 || versionComparison === false){
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
		}
		
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

		function generatePrestigePlayer(prestigeLevel, reset){
			if(reset === true){
				$scope.player.multiplierUpgradeLevel = [];
				$scope.player.multiplierUpgradePrice = [];
			}
			for (var i = $scope.player.multiplierUpgradeLevel.length; i <= prestigeLevel; i++) { 
				if(i == 0){
					$scope.player.multiplierUpgradePrice.push(new Decimal(1));
				}else{
					$scope.player.multiplierUpgradePrice.push(new Decimal(Decimal.pow(10,Decimal.pow(2,i-1))));
				}
				$scope.player.multiplierUpgradeLevel.push(0);
			}
		}
		
		function generatePrestigeUpgrades(prestigeLevel, reset){
			if(reset === true){
				multiplierUpgradeBasePrice = [];
				$scope.multiplierUpgradePower = [];
			}
			for (var i = multiplierUpgradeBasePrice.length; i <= prestigeLevel; i++) { 
				if(i == 0){
					multiplierUpgradeBasePrice.push(new Decimal(1));
				}else{
					multiplierUpgradeBasePrice.push(new Decimal(Decimal.pow(10,Decimal.pow(2,i-1))));
				}
				$scope.multiplierUpgradePower.push(0.0001*Math.pow(10,i));
			}
		}
		
		function adjustCurrency(currency){
			var newCurrency = currency;
			if(currency.comparedTo($scope.prestigeGoal[$scope.currentPrestige]) >= 0){
				if($scope.sprintFinished == false){
					$scope.sprintFinished = true;
					timerStop();
					if($scope.player.sprintTimes.length < $scope.currentPrestige){
						throw new Error("Inconsistent prestige value: "+$scope.currentPrestige);
					}else if($scope.player.sprintTimes.length == $scope.currentPrestige){
						$scope.player.sprintTimes.push(timerSeconds);
					}else if(timerSeconds < $scope.player.sprintTimes[$scope.currentPrestige]){
						$scope.player.sprintTimes[$scope.currentPrestige] = timerSeconds;
					}
				}
				newCurrency = $scope.prestigeGoal[$scope.currentPrestige];
			}
			return newCurrency;
		}
		
		function init(){
			$scope.player = angular.copy(startPlayer);
			$scope.sprintFinished = false;
		}
		
		function isEndgame(level){
			return level == $scope.prestigeGoal.length-1;
		}
		
        $document.ready(function(){
			if(localStorage.getItem("playerStored") != null){
				$scope.load();
			}
			if(typeof $scope.player  === 'undefined'){
				init();
				generatePrestigePlayer(0,true);
			}
			if(typeof $scope.lastSave  === 'undefined'){
				$scope.lastSave = "None";
			}
			versionControl(false);
			if(isEndgame($scope.currentPrestige)){
				generatePrestigeUpgrades($scope.player.multiplierUpgradeLevel.length-1,true);
			}else{
				generatePrestigeUpgrades($scope.currentPrestige,true);
			}
            $interval(update,1000);
            $interval($scope.save,60000);
			timerStart();
        });
			
		function timerSet(seconds){
			timerSeconds = seconds;
			if($scope.sprintFinished == true){
				timerStop();
			}
		}
			
		function timerAdd() {
			timerSeconds++;
		}
		
		function timerStart() {
			if(angular.isDefined(timer) || $scope.sprintFinished == true){
				return;
			}
			timer = $interval(timerAdd,1000);
		}
		
		function timerStop() {
			if(angular.isDefined(timer)) {
				$interval.cancel(timer);
				timer = undefined;
            }
		}
		
		function timerReset() {
			timerSeconds = 0;
		}
		
		$scope.formatTime = function formatTime(time){
			return padCeroes(parseInt(time/3600))+":"+
				padCeroes(parseInt((time%3600)/60))+":"+
				padCeroes(time%60);
		};
		
		$scope.getSprintTime = function getSprintTime(){
			return $scope.formatTime(timerSeconds);
		};
		
		function padCeroes(number){
			if(number <= 9){
				return "0"+number;
			}
			return number;
		}
}]);