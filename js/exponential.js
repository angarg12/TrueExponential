angular.module('incremental',['ngAnimate']).directive('onFinishRender', function ($timeout) {
    return {
        restrict: 'A',
        link: function (scope, element, attr) {
            if (scope.$last === true) {
                $timeout(function () {
                    scope.$emit('ngRepeatFinished',element);
                });
            }
        }
    }
}).filter('range', function() {
	return function(input, total) {
		intTotal = parseInt(total);
			for (var i=0; i<intTotal; i++)
				input.push(i);
		return input;
	};
}).controller('IncCtrl',['$scope','$document','$interval', '$sce', '$filter', '$timeout', function($scope,$document,$interval,$sce,$filter,$timeout) { 
		$scope.version = '0.11.2';
		$scope.Math = window.Math;
		
		const startPlayer = {
			clickMultiplier: new Decimal(1),
			multiplier: new Decimal(1),
			multiplierUpgradeLevel: [],
			multiplierUpgradePrice: [],
			n: new Decimal(1),
			maxPrestige: -1,
			version: $scope.version,
			sprintTimes: [],
			preferences: {logscale: false,
				abstractVisible: true}
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
		$scope.prestigeGoal = [new Decimal("1e3"),
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
			return $sce.trustAsHtml(prettifyNumberHTML(value));
		};
		
        $scope.click = function() {
			var tempN = $scope.player.n.plus($scope.player.clickMultiplier);
			$scope.player.n = adjustN(tempN);
        };
        
        $scope.buyMultiplierUpgrade = function(number) {
            if ($scope.player.n.comparedTo($scope.player.multiplierUpgradePrice[number]) >= 0) {
                $scope.player.n = $scope.player.n.div($scope.player.multiplierUpgradePrice[number]);
                $scope.player.multiplier = $scope.player.multiplier.plus($scope.multiplierUpgradePower[number]);
                $scope.player.multiplierUpgradeLevel[number]++;
				// The cost function is of the form 2^1.x^(upgradeLevel), where 1.x depends on the upgrade tier
				var firstTerm = (1+0.2*(number+1)).toPrecision(15);
				var secondTerm = $scope.player.multiplierUpgradeLevel[number];
				var exponent = Decimal.pow(firstTerm,secondTerm);
				$scope.player.multiplierUpgradePrice[number] = multiplierUpgradeBasePrice[number].
					times(Decimal.pow(2,exponent));
				refreshUpgradeLine(number, true);
            }
        };
        
        function refreshUpgradeLine(number, force){
        	// Update formula and typeset
			var upgradeDiv = document.getElementById('multiplierUpgrade'+number);
			if(upgradeDiv == null){
				return;
			}
			if(force || upgradeDiv.innerHTML.trim() == "placeholder"){
				upgradeDiv.innerHTML = "<b>Lemma "+(number+1)+".</b>$$^{"+$scope.player.multiplierUpgradeLevel[number]+"}\\quad \\frac{n(t)}{"+prettifyNumberTeX($scope.player.multiplierUpgradePrice[number])+"} \\Rightarrow\\; r(t) + "+prettifyNumberTeX($scope.multiplierUpgradePower[number])+"$$";
				MathJax.Hub.Queue(['Typeset',MathJax.Hub,upgradeDiv]);
			}
        };
        
        function refreshAllUpgradeLine(force){
        	for(var i = 0; i < $scope.multiplierUpgradePower.length; i++){
        		refreshUpgradeLine(i, force);
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
			try {
				$scope.player = JSON.parse(localStorage.getItem("playerStored"));
				var seconds = parseInt(localStorage.getItem("timerSeconds"));
				// Have to do this, otherwise is read as string
				$scope.sprintFinished = localStorage.getItem("sprintFinished") === "true";
				$scope.currentPrestige = parseInt(localStorage.getItem("currentPrestige"));
	
				timerSet(seconds);
				$scope.player.n = new Decimal($scope.player.n);
				$scope.player.multiplier = new Decimal($scope.player.multiplier);
				$scope.player.clickMultiplier = new Decimal($scope.player.clickMultiplier);
				for (var i = 0; i < $scope.player.multiplierUpgradePrice.length; i++) { 
					$scope.player.multiplierUpgradePrice[i] = new Decimal($scope.player.multiplierUpgradePrice[i]);
				}
			}catch(err){
				alert("Error loading savegame, reset forced.")
				$scope.reset(false);
			}
			versionControl(false);
		}
		
		$scope.reset = function reset(ask) {
			var confirmation = true;
			if(ask){
				confirmation = confirm("Are you sure you want to retire? This will permanently erase your progress.");
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
		}
		
		$scope.prestige = function prestige(level){
			// Save the values of the player that persist between prestiges
			var maxPrestige = $scope.player.maxPrestige;
			var preferences = $scope.player.preferences;
			var playerVersion = $scope.player.version;
			var sprintTimes = $scope.player.sprintTimes;
			
			// Reset the player
			init();
			
			// Reset the timer
			timerReset();
			timerStart();
			
			// Restore the values
			$scope.player.maxPrestige = maxPrestige;
			$scope.player.preferences = preferences;
			$scope.player.version = playerVersion;
			$scope.player.sprintTimes = sprintTimes;
			
			// Generate the prestige values
			$scope.currentPrestige = level;
			if($scope.isEndgame(level)){
				// For endgame, we begin from upgrades 0.
				generatePrestigePlayer(0,true);
				generatePrestigeUpgrades(0,true);
			}else{
				generatePrestigePlayer(level,true);
				generatePrestigeUpgrades(level,true);
			}
			
			// Render
			refreshAllUpgradeLine(true);
		};

        function update() {
            var tempN;
            if($scope.isEndgame($scope.currentPrestige)){
            	tempN = Decimal.pow($scope.player.n,$scope.player.multiplier);
            }else{
            	tempN = $scope.player.n.times($scope.player.multiplier);
            }
			$scope.player.n = adjustN(tempN);
        }
        
		function prettifyNumberHTML(number){
			if(typeof number == 'undefined'){
				return;
			}
				
			if(number.comparedTo(Infinity) == 0){
				return "&infin;";
			}
			if(number.comparedTo(1e21) >= 0){
				// Very ugly way to extract the mantisa and exponent from an exponential string
				var exponential = number.toSignificantDigits(6).toString().split("e");
				var exponent = new Decimal(exponential[1].split("+")[1]);
				// And it is displayed in with superscript
				if(exponential[0] == "1"){
					return  "10<sup>"+prettifyNumberHTML(exponent)+"</sup>";							
				}
				return  $filter('number')(exponential[0])+" &#215; 10<sup>"+prettifyNumberHTML(exponent)+"</sup>";						
			}
			return $filter('number')(number.toDecimalPlaces(5).toString());
		}
        
		function prettifyNumberTeX(number){
			if(typeof number == 'undefined'){
				return;
			}
				
			if(number.comparedTo(Infinity) == 0){
				return "\\infty";
			}
			if(number.comparedTo(1e21) >= 0){
				// Very ugly way to extract the mantisa and exponent from an exponential string
				var exponential = number.toSignificantDigits(6).toString().split("e");
				var exponent = new Decimal(exponential[1].split("+")[1]);
				// And it is displayed in with superscript
				if(exponential[0] == "1"){
					return "10^{"+prettifyNumberHTML(exponent)+"}";
				}
				return  $filter('number')(exponential[0])+" \\times 10^{"+prettifyNumberHTML(exponent)+"}";
			}
			return $filter('number')(number.toDecimalPlaces(5).toString());
		}
		
		function versionControl(ifImport){
			versionComparison = versionCompare($scope.player.version,'0.11.2');
			if(versionComparison === -1 || versionComparison === false){
				if($scope.currentPrestige == 11){
					$scope.prestige(11);
					$scope.player.version = '0.11.2';
				}
			}
			versionComparison = versionCompare($scope.player.version,'0.11.1');
			if(versionComparison === -1 || versionComparison === false){
				$scope.player.preferences = angular.copy(startPlayer.preferences);
			}
			versionComparison = versionCompare($scope.player.version,'0.11');
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
				$scope.multiplierUpgradePower.push(new Decimal(new Decimal(0.0001).times(Decimal.pow(10,i))));
			}
		}
		
		function adjustN(n){
			var newN = n;
			if(n.comparedTo($scope.prestigeGoal[$scope.currentPrestige]) >= 0){
				if($scope.sprintFinished == false){
					$scope.sprintFinished = true;
					timerStop();
					if($scope.player.sprintTimes.length < $scope.currentPrestige){
						throw new Error("Inconsistent prestige value: "+$scope.currentPrestige);
					}else if($scope.player.sprintTimes.length == $scope.currentPrestige){
						$scope.player.sprintTimes.push(timerSeconds);
						if($scope.currentPrestige > $scope.player.maxPrestige){
							$scope.player.maxPrestige = $scope.currentPrestige;
						}
					}else if(timerSeconds < $scope.player.sprintTimes[$scope.currentPrestige]){
						$scope.player.sprintTimes[$scope.currentPrestige] = timerSeconds;
					}
				}
				newN = $scope.prestigeGoal[$scope.currentPrestige];
			}
			return newN;
		}
		
		function init(){
			$scope.player = angular.copy(startPlayer);
			$scope.sprintFinished = false;
		}
		
		$scope.isEndgame = function isEndgame(level){
			return level == $scope.prestigeGoal.length-1;
		}
		
		$timeout(function(){
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
			if($scope.isEndgame($scope.currentPrestige)){
				generatePrestigeUpgrades(0,true);
			}else{
				generatePrestigeUpgrades($scope.currentPrestige,true);
			}
            $interval(update,1000);
            $interval($scope.save,60000);
			timerStart();
        });
			
		$scope.$on('ngRepeatFinished', function(ngRepeatFinishedEvent, element) {
			// If the element is an upgrade multiplier
			if(element[0].innerHTML.indexOf("multiplierUpgrade") > -1){
				refreshAllUpgradeLine(false);
			}
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
			return timerSeconds;
		};
		
		function padCeroes(number){
			if(number <= 9){
				return "0"+number;
			}
			return number;
		}
}]);