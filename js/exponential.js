angular.module('incremental',['ngAnimate']).directive('onFinishRender', function ($timeout) {
    return {
        restrict: 'A',
        link: function (scope, element, attr) {
            $timeout(function () {
                scope.$emit('ngRepeatFinished',element);
            });
        }
    }
}).filter('range', function() {
  return function(input, total) {
	    intTotal = parseInt(total);
	    for (var i=0; i<intTotal; i++)
	      input.push(i);
	    return input;
	  };
	}).
	controller('IncCtrl',['$scope','$document','$interval', '$sce', '$filter', '$timeout', '$compile', function($scope,$document,$interval,$sce,$filter,$timeout,$compile) { 
		$scope.version = '1.2';
		$scope.Math = window.Math;
		
		const startPlayer = {
			multiplier: new Decimal(1),
			multiplierUpgradeLevel: [],
			multiplierUpgradePrice: [],			
			producerUpgradeLevel: [],	
			producerUpgradeManual: [],
			producerUpgradePrice: [],
			n: new Decimal(1),
			maxPrestige: -1,
			maxSecondPrestige: -1,
			version: $scope.version,
			sprintTimes: [],
			sprintSecondTimes: [],
			preferences: {logscale: false,
				abstractVisible: true},
			lastLogin: null
			};
		
		// Procedurally generated
        var multiplierUpgradeBasePrice = [];
        $scope.multiplierUpgradePower = [];
		
		// Variables
		$scope.sprintFinished = false;
		$scope.currentPrestige = 0;
		var timer;
		var timerSeconds = 0;
		
		$scope.loading = false;
		$scope.offlineProgress = 0;
		/*		 
		balance the goals
		*/
		// Constants
		$scope.prestigeGoal = [new Decimal("1e2"),
							new Decimal("1e5"),
							new Decimal("1e15"),
							new Decimal("1e200"),
							new Decimal("1e1250"),
							new Decimal("1e2500"),
							new Decimal("1e5000"),
							new Decimal("1e12500"),
							new Decimal("1e25000"),
							new Decimal("1e50000"),
							new Decimal("1e100000"),
							new Decimal("1e9000000000000000")];
		
		$scope.prestigeTier = 0;
		// Constants
		$scope.secondPrestigeGoal = [new Decimal("1e4"),
			 							new Decimal("1e500"),
										new Decimal("1e3000"),
										new Decimal("1e10000"),
										new Decimal("1e25000"),
										new Decimal("1e50000"),
										new Decimal("1e125000"),
										new Decimal("1e250000"),
										new Decimal("1e500000"),
										new Decimal("1e1000000"),
										new Decimal("1e2500000")];
		
		var producerUpgradeBasePrice = [];
						
		$scope.getGoal = function(){
			if($scope.prestigeTier == 0){
				return $scope.prestigeGoal[$scope.currentPrestige];
			}
			return $scope.secondPrestigeGoal[$scope.currentPrestige];			
		}
		
		$scope.buyProducerUpgrade = function(number) {
			if(typeof number == "undefined"){
				return;
			}
            if ($scope.player.n.comparedTo($scope.player.producerUpgradePrice[number]) >= 0) {
                $scope.player.n = $scope.player.n.div($scope.player.producerUpgradePrice[number]);
                //$scope.player.multiplier = $scope.player.multiplier.plus($scope.multiplierUpgradePower[number]);
                $scope.player.producerUpgradeLevel[number] = $scope.player.producerUpgradeLevel[number].plus(1);
                $scope.player.producerUpgradeManual[number] = $scope.player.producerUpgradeManual[number].plus(1);
				// The cost function is of the form 2^1.x^(upgradeLevel), where 1.x depends on the upgrade tier
				var firstTerm = (1+0.2*(number+1)).toPrecision(15);
				var secondTerm = $scope.player.producerUpgradeManual[number];
				var exponent = Decimal.pow(firstTerm,secondTerm);
				$scope.player.producerUpgradePrice[number] = producerUpgradeBasePrice[number].
					times(Decimal.pow(2,exponent));
				refreshUpgradeLine(number, true);
            }
        };
		
		$scope.trustedPrettifyNumber = function(value) {
			return $sce.trustAsHtml(prettifyNumberHTML(value));
		};
		
        $scope.getFlatIncome = function() {
			if($scope.prestigeTier === 0 && $scope.currentPrestige < 11){
				return new Decimal($scope.currentPrestige+1).times(new Decimal($scope.currentPrestige+1));
				//return Decimal.pow(new Decimal(2), new Decimal($scope.currentPrestige));
			}else{
				return new Decimal(1);
			}
        };
        
        $scope.buyMultiplierUpgrade = function(number) {
        	if(typeof number == "undefined"){
        		return;
        	}
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
        
		function refreshEntirePage(){
			MathJax.Hub.Queue(['Typeset',MathJax.Hub]);
		};
		
        function refreshUpgradeLine(number, force){
        	// Update formula and typeset
			var upgradeDiv = document.getElementById('multiplierUpgrade'+number);
			if(upgradeDiv == null){
				upgradeDiv = document.getElementById('producerUpgrade'+number);
				if(upgradeDiv == null){
					return;					
				}
			}
			if(force || upgradeDiv.innerHTML.trim() == "placeholder"){
				if($scope.prestigeTier == 0){
					upgradeDiv.innerHTML = "<b>Lemma "+(number+1)+".</b>$$^{"+$scope.player.multiplierUpgradeLevel[number]+"}\\quad \\frac{n(t)}{"+prettifyNumberTeX($scope.player.multiplierUpgradePrice[number])+"} \\Rightarrow\\; r(t) + "+prettifyNumberTeX($scope.multiplierUpgradePower[number])+"$$";
				}
				if($scope.prestigeTier == 1){
					if(number == 0){
						upgradeDiv.innerHTML = "<b>Corollary "+(number+1)+".</b>" +
								"<span class=\"supsub\">" +
									"<span class=\"superscript\">" +
										"<span class=\"ng-binding\" ng-bind-html=\"trustedPrettifyNumber(player.producerUpgradeLevel["+number+"])\"></span>" +
										"<span class=\"mathjax_corollary\">$$\\quad \\frac{n(t)}{"+prettifyNumberTeX($scope.player.producerUpgradePrice[number])+"} \\Rightarrow\\; r(t+1) = r(t) + 0.0001$$</span>" +
									"</span>" +
									"<span class=\"subscript\" class=\"ng-binding\" ng-bind-html=\"trustedPrettifyNumber(player.producerUpgradeManual["+number+"])\"></span>" +
								"</span>";
					}else{						
						upgradeDiv.innerHTML = "<b>Corollary "+(number+1)+".</b>" +
						"<span class=\"supsub\">" +
							"<span class=\"superscript\">" +
								"<span class=\"ng-binding\" ng-bind-html=\"trustedPrettifyNumber(player.producerUpgradeLevel["+number+"])\"></span>" +
								"<span class=\"mathjax_corollary\">$$\\quad \\frac{n(t)}{"+prettifyNumberTeX($scope.player.producerUpgradePrice[number])+"} \\Rightarrow\\; $$ Corollary "+(number)+"$$(t+1) = $$ Corollary "+(number)+"$$(t) + 1$$</span>" +
							"</span>" +
							"<span class=\"subscript\" class=\"ng-binding\" ng-bind-html=\"trustedPrettifyNumber(player.producerUpgradeManual["+number+"])\"></span>" +
						"</span>";
						
					}					
				}
				var linkingFunction = $compile(upgradeDiv);
				upgradeDiv = linkingFunction($scope)[0];
				MathJax.Hub.Queue(['Typeset',MathJax.Hub,upgradeDiv]);
			}
        }
        
        function refreshAllUpgradeLine(force){
        	for(var i = 0; i < $scope.multiplierUpgradePower.length; i++){
        		refreshUpgradeLine(i, force);
        	}
        }

		$scope.save = function save() {
			localStorage.setItem("playerStored", JSON.stringify($scope.player));
			localStorage.setItem("timerSeconds", timerSeconds);
			localStorage.setItem("sprintFinished", $scope.sprintFinished);
			localStorage.setItem("currentPrestige", $scope.currentPrestige);
			localStorage.setItem("prestigeTier", $scope.prestigeTier);
			var d = new Date();
			$scope.lastSave = d.toLocaleTimeString();
			$scope.player.lastLogin = Math.floor(Date.now()/1000);
		}
		
		$scope.load = function load() {
			try {
				$scope.player = JSON.parse(localStorage.getItem("playerStored"));
				var seconds = parseInt(localStorage.getItem("timerSeconds"));
				// Have to do this, otherwise is read as string
				$scope.sprintFinished = localStorage.getItem("sprintFinished") === "true";
				$scope.currentPrestige = parseInt(localStorage.getItem("currentPrestige"));
				$scope.prestigeTier = parseInt(localStorage.getItem("prestigeTier"));

				versionControl(false);
				
				timerSet(seconds);
				$scope.player.n = new Decimal($scope.player.n);
				$scope.player.multiplier = new Decimal($scope.player.multiplier);
				
				for (var i = 0; i < $scope.player.multiplierUpgradePrice.length; i++) { 
					$scope.player.multiplierUpgradePrice[i] = new Decimal($scope.player.multiplierUpgradePrice[i]);
				}
				for (var i = 0; i < $scope.player.producerUpgradePrice.length; i++) { 
					$scope.player.producerUpgradePrice[i] = new Decimal($scope.player.producerUpgradePrice[i]);					
				}
				for (var i = 0; i < $scope.player.producerUpgradeLevel.length; i++) { 
					$scope.player.producerUpgradeLevel[i] = new Decimal($scope.player.producerUpgradeLevel[i]);					
				}
				for (var i = 0; i < $scope.player.producerUpgradeManual.length; i++) { 
					$scope.player.producerUpgradeManual[i] = new Decimal($scope.player.producerUpgradeManual[i]);					
				}
			}catch(err){
				alert("Error loading savegame, reset forced.")
				$scope.reset(false);
			}
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
				$scope.prestigeTier = 0;
				refreshAllUpgradeLine(true);
			}
		}
		
		$scope.prestige = function prestige(level, tier){
			// Save the values of the player that persist between prestiges
			var maxPrestige = $scope.player.maxPrestige;
			var maxSecondPrestige = $scope.player.maxSecondPrestige;
			var preferences = $scope.player.preferences;
			var playerVersion = $scope.player.version;
			var sprintTimes = $scope.player.sprintTimes;
			var sprintSecondTimes = $scope.player.sprintSecondTimes;
			
			// Reset the player
			init();
			
			// Reset the timer
			timerReset();
			timerStart();
			
			// Restore the values
			$scope.player.maxPrestige = maxPrestige;
			$scope.player.maxSecondPrestige = maxSecondPrestige;
			$scope.player.preferences = preferences;
			$scope.player.version = playerVersion;
			$scope.player.sprintTimes = sprintTimes;
			$scope.player.sprintSecondTimes = sprintSecondTimes;
			$scope.prestigeTier = tier;
			
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
			$scope.player.n = $scope.player.n.plus($scope.getFlatIncome());
            var tempN;
            if($scope.isEndgame($scope.currentPrestige)){
            	tempN = Decimal.pow($scope.player.n,$scope.player.multiplier);
            }else{
            	tempN = $scope.player.n.times($scope.player.multiplier);
            }
			$scope.player.n = adjustN(tempN);
			
			if($scope.prestigeTier == 1 && $scope.sprintFinished == false){
				$scope.player.multiplier = $scope.player.multiplier.plus($scope.player.producerUpgradeLevel[0].times(0.0001));
				for(var i = 1; i < $scope.player.producerUpgradeLevel.length; i++){
					$scope.player.producerUpgradeLevel[i-1] = $scope.player.producerUpgradeLevel[i-1].plus($scope.player.producerUpgradeLevel[i]);
				}
			}
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
			versionComparison = versionCompare($scope.player.version,'1.2');
			if(versionComparison === -1 || versionComparison === false){
				$scope.player.lastLogin = Math.floor(Date.now()/1000);		
				$scope.player.version = '1.2';	
			}
			versionComparison = versionCompare($scope.player.version,'1.0');
			if(versionComparison === -1 || versionComparison === false){
				$scope.player.producerUpgradeLevel = [];	
				$scope.player.producerUpgradeManual = [];
				$scope.player.producerUpgradePrice = [];
				$scope.player.maxSecondPrestige = 0;
				$scope.player.sprintSecondTimes = [];
				$scope.prestigeTier = 0;
				$scope.player.version = '1.0';				
			}
			versionComparison = versionCompare($scope.player.version,'0.11.2');
			if(versionComparison === -1 || versionComparison === false){
				if($scope.currentPrestige == 11){
					$scope.prestige(11,0);
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
				$scope.player.producerUpgradeLevel = [];
				$scope.player.producerUpgradeManual = [];
				$scope.player.producerUpgradePrice = [];
			}
			for (var i = $scope.player.multiplierUpgradeLevel.length; i <= prestigeLevel; i++) { 
				if(i == 0){
					$scope.player.multiplierUpgradePrice.push(new Decimal(1));
					$scope.player.producerUpgradePrice.push(new Decimal(1));
				}else{
					$scope.player.multiplierUpgradePrice.push(new Decimal(Decimal.pow(10,Decimal.pow(2,i-1))));
					$scope.player.producerUpgradePrice.push(new Decimal(Decimal.pow(10,Decimal.pow(2,i-1))));
				}
				$scope.player.multiplierUpgradeLevel.push(0);
				$scope.player.producerUpgradeLevel.push(new Decimal(0));
				$scope.player.producerUpgradeManual.push(new Decimal(0));
			}
		}
		
		function generatePrestigeUpgrades(prestigeLevel, reset){
			if(reset === true){
				multiplierUpgradeBasePrice = [];
				$scope.multiplierUpgradePower = [];
				producerUpgradeBasePrice = []; 
			}
			for (var i = multiplierUpgradeBasePrice.length; i <= prestigeLevel; i++) { 
				if(i == 0){
					multiplierUpgradeBasePrice.push(new Decimal(1));
					producerUpgradeBasePrice.push(new Decimal(1));
				}else{
					multiplierUpgradeBasePrice.push(new Decimal(Decimal.pow(10,Decimal.pow(2,i-1))));
					producerUpgradeBasePrice.push(new Decimal(Decimal.pow(10,Decimal.pow(2,i-1))));
				}
				$scope.multiplierUpgradePower.push(new Decimal(new Decimal(0.0001).times(Decimal.pow(10,i))));
			}
		}
		
		function adjustN(n){
        	if(typeof n == "undefined"){
        		return;
        	}
			var newN = n;
			var goal;
			if($scope.prestigeTier == 0){
				goal = $scope.prestigeGoal[$scope.currentPrestige];
			}else{
				goal = $scope.secondPrestigeGoal[$scope.currentPrestige]
			}
			if(n.comparedTo(goal) >= 0){
				if($scope.sprintFinished == false){
					$scope.sprintFinished = true;
					timerStop();

					if($scope.prestigeTier == 0){
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
					if($scope.prestigeTier == 1){
						if($scope.player.sprintSecondTimes.length < $scope.currentPrestige){
							throw new Error("Inconsistent prestige value: "+$scope.currentPrestige);
						}else if($scope.player.sprintSecondTimes.length == $scope.currentPrestige){
							$scope.player.sprintSecondTimes.push(timerSeconds);
							if($scope.currentPrestige > $scope.player.maxSecondPrestige){
								$scope.player.maxSecondPrestige = $scope.currentPrestige;
							}
						}else if(timerSeconds < $scope.player.sprintSecondTimes[$scope.currentPrestige]){
							$scope.player.sprintSecondTimes[$scope.currentPrestige] = timerSeconds;
						}
					}					
				}
				newN = goal;
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
		
		$scope.isMultiplierDisabled = function(index) {
			return $scope.player.n && 
					$scope.player.multiplierUpgradePrice[index] &&
					$scope.player.n.comparedTo($scope.player.multiplierUpgradePrice[index]) < 0;
		};
		
		$scope.isProducerDisabled = function(index) {
			return $scope.player.n && 
					$scope.player.producerUpgradePrice[index] &&
					$scope.player.n.comparedTo($scope.player.producerUpgradePrice[index]) < 0;
		};
		
		function turnOffOfflineMessage() {
			$scope.loading = false;
			$timeout(refreshEntirePage);
		}
		
		function processOffline(secondsElapsed, total){
			if(secondsElapsed <= 0) {
				$timeout(turnOffOfflineMessage, 1000);
				
				$interval(update,1000);
				$interval($scope.save,60000);
			}else{
				var iters = 10000;
				for(var i = 0; i < Math.min(secondsElapsed, iters); i++){
					update();
					timerSeconds++;
				}
				var afterSeconds = secondsElapsed-Math.min(secondsElapsed, iters);
				$scope.offlineProgress = Math.round((1-afterSeconds/total)*100);
				$timeout(function(){processOffline(afterSeconds, total)});
			}
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
			
			var currentTime = Math.floor(Date.now()/1000);
			var secondsElapsed = Math.min(currentTime-$scope.player.lastLogin, 3600);
			$scope.loading = true;
			
			timerStart();
			$timeout(function(){processOffline(secondsElapsed, secondsElapsed)});
        });
			
		$scope.$on('ngRepeatFinished', function(ngRepeatFinishedEvent, element) {
			// If the element is an upgrade multiplier
			if(element[0].innerHTML.indexOf("Upgrade") > -1){
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