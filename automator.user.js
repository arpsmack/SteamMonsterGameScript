// ==UserScript== 
// @name Steam Monster Game Script
// @namespace https://github.com/ensingm2/SteamMonsterGameScript
// @description A Javascript automator for the 2015 Summer Steam Monster Minigame
// @version 1.74
// @match http://steamcommunity.com/minigame/towerattack*
// @match http://steamcommunity.com//minigame/towerattack*
// @updateURL https://raw.githubusercontent.com/ensingm2/SteamMonsterGameScript/master/automator.user.js
// @downloadURL https://raw.githubusercontent.com/ensingm2/SteamMonsterGameScript/master/automator.user.js
// @require https://raw.githubusercontent.com/ensingm2/SteamMonsterGameScript/master/slaveWindows.js
// ==/UserScript==

// Compiled and customized by https://github.com/ensingm2
// See a (hopefully) full list of contributors over at https://github.com/ensingm2/SteamMonsterGameScript#contributors

// Custom variables
var debug = false;
var clicksPerSecond = g_TuningData.abilities[1].max_num_clicks;
var autoClickerVariance = Math.floor(clicksPerSecond / 10);
clicksPerSecond -= Math.ceil(autoClickerVariance / 2);
var respawnCheckFreq = 5000;
var targetSwapperFreq = 1000;
var abilityUseCheckFreq = 2000;
var itemUseCheckFreq = 5000;
var seekHealingPercent = 20;
var upgradeManagerFreq = 5000;
var autoBuyAbilities = false;

// Boss Nuke Variables
var nukeBossesAfterLevel = 1000;
var farmGoldOnBossesLevelDiff = 200;
var useNukeOnBossAbovePercent = 25;

//item use variables
var useMedicsAtPercent = 40;
var useMedicsAtLanePercent = 40;
var useMedicsAtLanePercentAliveReq = 40;
var useNukeOnSpawnerAbovePercent = 75;
var useMetalDetectorOnBossBelowPercent = 30;

var useStealHealthAtPercent = 15;
var useRainingGoldAbovePercent = 50;
var useLikeNewAboveCooldown = 14220000; // Need to save at least 14220s of cooldowns(60% of max)
var useResurrectToSaveCount = 150; // Use revive to save 150 people

// You shouldn't need to ever change this, you only push to server every 1s anyway
var autoClickerFreq = 1000;

// Internal variables, you shouldn't need to touch these
var autoRespawner, autoClicker, autoTargetSwapper, autoTargetSwapperElementUpdate, autoAbilityUser, autoUpgradeManager;
var elementUpdateRate = 60000;
var autoUseConsumables = true;
var userElementMultipliers = [1, 1, 1, 1];
var userMaxElementMultiiplier = 1;
var swapReason;
var lastLootLevel = 0;
var lastLootCache = [];

// ================ STARTER FUNCTIONS ================
function startAutoClicker() {
	if(autoClicker) {
		console.log("Autoclicker is already running!");
		return;
	}

	autoClicker = setInterval( function(){
		if(!gameRunning()) return;

		//Vary the number of clicks by up to the autoClickerVariance variable (plus or minus)
		var randomVariance = Math.floor(Math.random() * autoClickerVariance * 2) - (autoClickerVariance);
		var clicks = clicksPerSecond + randomVariance;
		
		// Set the variable to be sent to the server
		g_Minigame.m_CurrentScene.m_nClicks += clicks;
		
		// Anti-anti-clicker countermeasure
		g_msTickRate = 1100;
		
		// Update Gold Counter
		var nClickGoldPct = g_Minigame.m_CurrentScene.m_rgGameData.lanes[  g_Minigame.m_CurrentScene.m_rgPlayerData.current_lane ].active_player_ability_gold_per_click;
		var enemy = getTarget();
		if(enemy && nClickGoldPct > 0 && enemy.m_data.hp > 0) {
			var nClickGold = enemy.m_data.gold * nClickGoldPct * g_Minigame.m_CurrentScene.m_nClicks;
			g_Minigame.m_CurrentScene.ClientOverride('player_data', 'gold', g_Minigame.m_CurrentScene.m_rgPlayerData.gold + nClickGold );
			g_Minigame.m_CurrentScene.ApplyClientOverrides('player_data', true );
		}
			
		//Clear out the crits
		var numCrits =  g_Minigame.m_CurrentScene.m_rgStoredCrits.length;
		g_Minigame.m_CurrentScene.m_rgStoredCrits = [];
		
		if(debug) {
			if(numCrits > 1)
				console.log('Clicking ' + g_Minigame.m_CurrentScene.m_nClicks + ' times this second. (' + numCrits + ' crits).');
			if(numCrits == 1)
				console.log('Clicking ' + g_Minigame.m_CurrentScene.m_nClicks + ' times this second. (1 crit).');
			else
				console.log('Clicking ' + g_Minigame.m_CurrentScene.m_nClicks + ' times this second.');
			
			//Calculate Damage done
			var damage = g_Minigame.m_CurrentScene.CalculateDamage(g_Minigame.m_CurrentScene.m_rgPlayerTechTree.damage_per_click * userMaxElementMultiiplier * g_Minigame.m_CurrentScene.m_nClicks);
			var damageStr = "(unknown)";
			if (damage > 1000000000)
				damageStr = (damage / 1000000000) + "B";
			else if (damage > 1000000)
				damageStr = (damage / 1000000) + "M";
			else if (damage > 1000)
				damageStr = (damage / 1000) + "K";
			console.log('We did roughly ' + damageStr + ' damage in the last second.');
		}
		
	}, autoClickerFreq);

	console.log("autoClicker has been started.");
}

var upgradeManagerPrefilter;
if (!upgradeManagerPrefilter) {
	// add prefilter on first run
	$J.ajaxPrefilter(function() {
		// this will be defined by the end of the script
		if(upgradeManagerPrefilter !== undefined) {
			upgradeManagerPrefilter.apply(this, arguments);
		}
	});
}

function startAutoUpgradeManager() {
	if( autoUpgradeManager ) {
		console.log("UpgradeManager is already running!");
		return;
	}

	/************
	 * SETTINGS *
	 ************/
	// On each level, we check for the lane that has the highest enemy DPS.
	// Based on that DPS, if we would not be able to survive more than
	// `survivalTime` seconds, we should buy some armor.
	var survivalTime = 30;

	// Should we highlight the item we're going for next?
	var highlightNext = true;

	// Should we automatically by the next item?
	var autoBuyNext = true;

	// How many elements do you want to upgrade? If we decide to upgrade an
	// element, we'll try to always keep this many as close in levels as we
	// can, and ignore the rest.
	var elementalSpecializations = 1;

	// To estimate the overall boost in damage from upgrading an element,
	// we sort the elements from highest level to lowest, then multiply
	// each one's level by the number in the corresponding spot to get a
	// weighted average of their effects on your overall damage per click.
	// If you don't prioritize lanes that you're strongest against, this
	// will be [0.25, 0.25, 0.25, 0.25], giving each element an equal
	// scaling. However, this defaults to [0.4, 0.3, 0.2, 0.1] under the
	// assumption that you will spend much more time in lanes with your
	// strongest elements.
	var elementalCoefficients = [0.4, 0.3, 0.2, 0.1];

	// To include passive DPS upgrades (Auto-fire, etc.) we have to scale
	// down their DPS boosts for an accurate comparison to clicking. This
	// is approximately how many clicks per second we should assume you are
	// consistently doing. If you have an autoclicker, this is easy to set.
	var clickFrequency = clicksPerSecond + Math.ceil(autoClickerVariance / 2);

	/***********
	 * GLOBALS *
	 ***********/
	var scene = g_Minigame.CurrentScene();
	var waitingForUpdate = false;

	var next = {
		id: -1,
		cost: 0
	};

	var necessary = [
		{ id: 0, level: 1 }, // Light Armor
		{ id: 11, level: 1 }, // Medics
		{ id: 2, level: 10 }, // Armor Piercing Round
		{ id: 1, level: 10 }, // Auto-fire Cannon
	];

	var gAbilities = [
		11, // Medics
		13, // Good Luck Charms
		16, // Tactical Nuke
		18, // Napalm
		17, // Cluster Bomb
		14, // Metal Detector
		15, // Decrease Cooldowns
		12, // Morale Booster
	];

	var gLuckyShot = 7;
	var gElementalUpgrades = [3, 4, 5, 6]; // Fire, Water, Earth, Air

	var gHealthUpgrades = [];
	var gAutoUpgrades = [];
	var gDamageUpgrades = [];

	Object.keys(scene.m_rgTuningData.upgrades)
		.sort(function(a, b) { return a - b; }) // why is default sort string comparison
		.forEach(function(id) {
			var upgrade = scene.m_rgTuningData.upgrades[id];
			switch (upgrade.type) {
				case 0: gHealthUpgrades.push(+id); break;
				case 1: gAutoUpgrades.push(+id); break;
				case 2: gDamageUpgrades.push(+id); break;
			}
		});

	/***********
	 * HELPERS *
	 ***********/
	var getElementals = (function() {
		var cache = false;
		return function(refresh) {
			if (!cache || refresh) {
				cache = gElementalUpgrades
					.map(function(id) { return { id: id, level: scene.GetUpgradeLevel(id) }; })
					.sort(function(a, b) { return b.level - a.level; });
			}
			return cache;
		};
	})();

	var getElementalCoefficient = function(elementals) {
		elementals = elementals || getElementals();
		return scene.m_rgTuningData.upgrades[4].multiplier *
			elementals.reduce(function(sum, elemental, i) {
				return sum + elemental.level * elementalCoefficients[i];
			}, 0);
	};

	var canUpgrade = function(id) {
		// do we even have the upgrade?
		if (!scene.bHaveUpgrade(id)) return false;

		// does it have a required upgrade?
		var data = scene.m_rgTuningData.upgrades[id];
		var required = data.required_upgrade;
		if (required !== undefined) {
			// is it at the required level to unlock?
			var level = data.required_upgrade_level || 1;
			return (level <= scene.GetUpgradeLevel(required));
		}

		// otherwise, we're good to go!
		return true;
	};

	var calculateUpgradeTree = function(id, level) {
		var data = scene.m_rgTuningData.upgrades[id];
		var boost = 0;
		var cost = 0;
		var parent;

		var cur_level = scene.GetUpgradeLevel(id);
		if (level === undefined) level = cur_level + 1;

		// for each missing level, add boost and cost
		for (var level_diff = level - cur_level; level_diff > 0; level_diff--) {
			boost += data.multiplier;
			cost += data.cost * Math.pow(data.cost_exponential_base, level - level_diff);
		}

		// recurse for required upgrades
		var required = data.required_upgrade;
		if (required !== undefined) {
			var parents = calculateUpgradeTree(required, data.required_upgrade_level || 1);
			if (parents.cost > 0) {
				boost += parents.boost;
				cost += parents.cost;
				parent = parents.required || required;
			}
		}

		return { boost: boost, cost: cost, required: parent };
	};

	var necessaryUpgrade = function() {
		var best = { id: -1, cost: 0 };
		var wanted, id;
		while (necessary.length > 0) {
			wanted = necessary[0];
			id = wanted.id;
			if (scene.GetUpgradeLevel(id) < wanted.level) {
				best = { id: id, cost: scene.GetUpgradeCost(id) };
				break;
			}
			necessary.shift();
		}
		return best;
	};

	var nextAbilityUpgrade = function() {
		var best = { id: -1, cost: 0 };
		if (autoBuyAbilities) {
			gAbilities.some(function(id) {
				if (canUpgrade(id) && scene.GetUpgradeLevel(id) < 1) {
					best = { id: id, cost: scene.GetUpgradeCost(id) };
					return true;
				}
			});
		}
		return best;
	};

	var bestHealthUpgrade = function() {
		var best = { id: -1, cost: 0, hpg: 0 };
		var result, hpg;
		gHealthUpgrades.forEach(function(id) {
			result = calculateUpgradeTree(id);
			hpg = scene.m_rgTuningData.player.hp * result.boost / result.cost;
			if (hpg >= best.hpg) {
				if (result.required !== undefined) id = result.required;
				cost = scene.GetUpgradeCost(id);
				if (cost <= scene.m_rgPlayerData.gold || (best.cost === 0 || cost < best.cost)) { // TODO
					best = { id: id, cost: cost, hpg: hpg };
				}
			}
		});
		return best;
	};

	var bestDamageUpgrade = function() {
		var best = { id: -1, cost: 0, dpg: 0 };
		var result, data, cost, dpg, boost;

		var dpc = scene.m_rgPlayerTechTree.damage_per_click;
		var base_dpc = scene.m_rgTuningData.player.damage_per_click;
		var critmult = scene.m_rgPlayerTechTree.damage_multiplier_crit;
		var critrate = scene.m_rgPlayerTechTree.crit_percentage - scene.m_rgTuningData.player.crit_percentage;
		var elementals = getElementals();
		var elementalCoefficient = getElementalCoefficient(elementals);

		// check auto damage upgrades
		gAutoUpgrades.forEach(function(id) {
			result = calculateUpgradeTree(id);
			dpg = (scene.m_rgPlayerTechTree.base_dps * result.boost / clickFrequency) / result.cost;
			if (dpg >= best.dpg) {
				if (result.required !== undefined) id = result.required;
				best = { id: id, cost: scene.GetUpgradeCost(id), dpg: dpg };
			}
		});

		// check Lucky Shot
		if (canUpgrade(gLuckyShot)) { // lazy check because prereq is necessary upgrade
			data = scene.m_rgTuningData.upgrades[gLuckyShot];
			boost = dpc * critrate * data.multiplier;
			cost = scene.GetUpgradeCost(gLuckyShot);
			dpg = boost / cost;
			if (dpg >= best.dpg) {
				best = { id: gLuckyShot, cost: cost, dpg: dpg };
			}
		}

		// check click damage upgrades
		gDamageUpgrades.forEach(function(id) {
			result = calculateUpgradeTree(id);
			dpg = base_dpc * result.boost * (critrate * critmult + (1 - critrate) * elementalCoefficient) / result.cost;
			if (dpg >= best.dpg) {
				if (result.required !== undefined) id = result.required;
				best = { id: id, cost: scene.GetUpgradeCost(id), dpg: dpg };
			}
		});

		// check elementals
		data = scene.m_rgTuningData.upgrades[4];
		var elementalLevels = elementals.reduce(function(sum, elemental) {
			return sum + elemental.level;
		}, 1);
		cost = data.cost * Math.pow(data.cost_exponential_base, elementalLevels);

		// - make new elementals array for testing
		var testElementals = elementals.map(function(elemental) { return { level: elemental.level }; });
		var upgradeLevel = testElementals[elementalSpecializations - 1].level;
		testElementals[elementalSpecializations - 1].level++;
		if (elementalSpecializations > 1) {
			// swap positions if upgraded elemental now has bigger level than (originally) next highest
			var prevElem = testElementals[elementalSpecializations - 2].level;
			if (prevElem <= upgradeLevel) {
				testElementals[elementalSpecializations - 2].level = upgradeLevel + 1;
				testElementals[elementalSpecializations - 1].level = prevElem;
			}
		}

		// - calculate stats
		boost = dpc * (1 - critrate) * (getElementalCoefficient(testElementals) - elementalCoefficient);
		dpg = boost / cost;
		if (dpg > best.dpg) { // give base damage boosters priority
			// find all elements at upgradeLevel and randomly pick one
			var match = elementals.filter(function(elemental) { return elemental.level == upgradeLevel; });
			match = match[Math.floor(Math.random() * match.length)].id;
			best = { id: match, cost: cost, dpg: dpg };
		}

		return best;
	};

	var timeToDie = (function() {
		var cache = false;
		return function(refresh) {
			if (cache === false || refresh) {
				var maxHp = scene.m_rgPlayerTechTree.max_hp;
				var enemyDps = scene.m_rgGameData.lanes.reduce(function(max, lane) {
					return Math.max(max, lane.enemies.reduce(function(sum, enemy) {
						return sum + enemy.dps;
					}, 0));
				}, 0);
				cache = maxHp / (enemyDps || scene.m_rgGameData.level * 4);
			}
			return cache;
		};
	})();

	var updateNext = function() {
		next = necessaryUpgrade();
		if (next.id === -1) {
			if (timeToDie() < survivalTime) {
				next = bestHealthUpgrade();
			} else {
				var damage = bestDamageUpgrade();
				var ability = nextAbilityUpgrade();
				next = (damage.cost < ability.cost || ability.id === -1) ? damage : ability;
			}
		}
		if (next.id !== -1) {
			if (highlightNext) {
				$J('.next_upgrade').removeClass('next_upgrade');
				$J(document.getElementById('upgr_' + next.id)).addClass('next_upgrade');
			}
			if (debug) {
				console.log(
					'next buy:',
					scene.m_rgTuningData.upgrades[next.id].name,
					'(' + FormatNumberForDisplay(next.cost) + ')'
				);
			}
		}
	};

	var hook = function(base, method, func) {
		var original = method + '_upgradeManager';
		if (!base.prototype[original]) base.prototype[original] = base.prototype[method];
		base.prototype[method] = function() {
			this[original].apply(this, arguments);
			func.apply(this, arguments);
		};
	};

	/********
	 * MAIN *
	 ********/
	// ---------- JS hooks ----------
	hook(CSceneGame, 'TryUpgrade', function() {
		// if it's a valid try, we should reevaluate after the update
		if (this.m_bUpgradesBusy) {
			if (highlightNext) $J(document.body).addClass('upgrade_waiting');
			next.id = -1;
		}
	});
	
	hook(CSceneGame, 'ChangeLevel', function() {
		// recalculate enemy DPS to see if we can survive this level
		if (timeToDie(true) < survivalTime) updateNext();
	});

	upgradeManagerPrefilter = function(opts, origOpts, xhr) {
		if (/ChooseUpgrade/.test(opts.url)) {
			xhr
			.success(function() {
				// wait as short a delay as possible
				// then we re-run to figure out the next item to queue
				window.setTimeout(upgradeManager, 0);
			 })
			.fail(function() {
				// we're desynced. wait til data refresh
				// m_bUpgradesBusy was not set to false
				scene.m_bNeedTechTree = true;
				waitingForUpdate = true;
			});
		} else if (/GetPlayerData/.test(opts.url)) {
			if (waitingForUpdate) {
				xhr.success(function(result) {
					var message = g_Server.m_protobuf_GetPlayerDataResponse.decode(result).toRaw(true, true);
					if (message.tech_tree) {
						// done waiting! no longer busy
						waitingForUpdate = false;
						scene.m_bUpgradesBusy = false;
						window.setTimeout(upgradeManager, 0);
					}
				});
			}
		}
	};

	// ---------- CSS ----------
	$J(document.body).removeClass('upgrade_waiting');
	$J('.next_upgrade').removeClass('next_upgrade');
	if (highlightNext) {
		var cssPrefix = function(property, value) {
			return '-webkit-' + property + ': ' + value + '; ' + property + ': ' + value + ';';
		};

		var css =
			'.next_upgrade { ' + cssPrefix('filter', 'brightness(1.5) contrast(2)') + ' }\n' +
			'.next_upgrade.cantafford { ' + cssPrefix('filter', 'contrast(1.3)') + ' }\n' +
			'.next_upgrade .info .name, .next_upgrade.element_upgrade .level { color: #e1b21e; }\n' +
			'#upgrades .next_upgrade .link { ' + cssPrefix('filter', 'brightness(0.8) hue-rotate(120deg)') + ' }\n' +
			'#elements .next_upgrade .link { ' + cssPrefix('filter', 'hue-rotate(120deg)') + ' }\n' +
			'.next_upgrade .cost { ' + cssPrefix('filter', 'hue-rotate(-120deg)') + ' }\n' +
			'.upgrade_waiting .next_upgrade { ' + cssPrefix('animation', 'blink 1s infinite alternate') + ' }\n' +
			'@-webkit-keyframes blink { to { opacity: 0.5; } }\n' +
			'@keyframes blink { to { opacity: 0.5; } }';

		var style = document.getElementById('upgradeManagerStyles');
		if (!style) {
			style = document.createElement('style');
			$J(style).attr('id', 'upgradeManagerStyles').appendTo('head');
		}
		$J(style).html(css);
	}

	// ---------- Timer ----------
	function upgradeManager() {
		if(debug)
			console.log('Checking for worthwhile upgrades');

		scene = g_Minigame.CurrentScene();

		// tried to buy upgrade and waiting for reply; don't do anything
		if (scene.m_bUpgradesBusy) return;

		// no item queued; refresh stats and queue next item
		if (next.id === -1) {
			if (highlightNext) $J(document.body).removeClass('upgrade_waiting');
			getElementals(true);
			timeToDie(true);
			updateNext();
		}

		// item queued; buy if we can afford it
		if (next.id !== -1 && autoBuyNext) {
			if (next.cost <= scene.m_rgPlayerData.gold) {
				var link = $J('.link', document.getElementById('upgr_' + next.id)).get(0);
				if (link) {
					scene.TryUpgrade(link);
				} else {
					console.error('failed to find upgrade');
				}
			}
		}
	}

	autoUpgradeManager = setInterval( upgradeManager, upgradeManagerFreq );

	console.log("autoUpgradeManager has been started.");
}

function startAutoRespawner() {
	if(autoRespawner) {
		console.log("autoRespawner is already running!");
		return;
	}
	
	autoRespawner = setInterval( function(){
		if(debug)
			console.log('Checking if the player is dead.');

		// Credit to /u/kolodz for base code. http://www.reddit.com/r/SteamMonsterGame/comments/39joz2/javascript_auto_respawn/
		if(g_Minigame.m_CurrentScene.m_bIsDead) {
			if(debug)
				console.log('Player is dead. Respawning.');

			RespawnPlayer();
		}
	}, respawnCheckFreq);
	
	console.log("autoRespawner has been started.");
}

function startAutoTargetSwapper() {
	if(autoTargetSwapper) {
		console.log("autoTargetSwapper is already running!");
		return;
	}

	
	updateUserElementMultipliers();
	autoTargetSwapperElementUpdate = setInterval(updateUserElementMultipliers, elementUpdateRate);
	
	autoTargetSwapper = setInterval(function() {

		if(debug)
			console.log('Looking for a new target.');
		
		var currentTarget = getTarget();
		g_Minigame.m_CurrentScene.m_rgEnemies.each(function(potentialTarget){
			if(compareMobPriority(potentialTarget, currentTarget)) {
				//console.log(currentTarget, getMobTypePriority(currentTarget), swapReason, getMobTypePriority(currentTarget), potentialTarget);
				currentTarget = potentialTarget;
			}
		});
			
		//Switch to that target
		var oldTarget = getTarget();
		if(currentTarget.m_data && oldTarget.m_data && currentTarget.m_data.id != oldTarget.m_data.id) {
			if(debug && swapReason !== null) {
				console.log(swapReason);
				swapReason = null;
			}
			
			if(g_Minigame.m_CurrentScene.m_rgPlayerData.current_lane != currentTarget.m_nLane)
				g_Minigame.m_CurrentScene.TryChangeLane(currentTarget.m_nLane);
			g_Minigame.m_CurrentScene.TryChangeTarget(currentTarget.m_nID);

		}
		//Move back to lane if still targetting
		else if(currentTarget.m_data && g_Minigame.m_CurrentScene.m_rgPlayerData.current_lane != currentTarget.m_nLane) {
			g_Minigame.m_CurrentScene.TryChangeLane(currentTarget.m_nLane);
		}
		
	}, targetSwapperFreq);
	
	console.log("autoTargetSwapper has been started.");
}

function startAutoAbilityUser() {
	if(autoAbilityUser) {
		console.log("autoAbilityUser is already running!");
		return;
	}

	autoAbilityUser = setInterval(function() {
		
		if(debug)
			console.log("Checking if it's useful to use an ability.");
		
		var percentHPRemaining = g_Minigame.CurrentScene().m_rgPlayerData.hp  / g_Minigame.CurrentScene().m_rgPlayerTechTree.max_hp * 100;
		var target = getTarget();
		
		var currentLane = g_Minigame.m_CurrentScene.m_rgGameData.lanes[g_Minigame.CurrentScene().m_rgPlayerData.current_lane];
		
		// Abilities only used on targets
		if(target) {
			
			var targetPercentHPRemaining = target.m_data.hp / target.m_data.max_hp * 100;
			var laneDPS = g_Minigame.m_CurrentScene.m_rgLaneData[g_Minigame.CurrentScene().m_rgPlayerData.current_lane].friendly_dps;
			var timeToTargetDeath = target.m_data.hp / laneDPS;
				
			// First priority since it can use Decrease Cooldowns
			
			//Nuke bosses after the 1000th level and not every 200th level thereafter
			var nukeBosses = (g_Minigame.m_CurrentScene.m_nCurrentLevel+1 >= nukeBossesAfterLevel) && ((g_Minigame.m_CurrentScene.m_nCurrentLevel+1) % farmGoldOnBossesLevelDiff === 0);
			
			// Abilities only used when targeting Spawners (sub lvl 1000) or nuking bosses (above level 1k)
			if((target.m_data.type === 0 && g_Minigame.m_CurrentScene.m_nCurrentLevel+1 >= nukeBossesAfterLevel) || (target.m_data.type = 2 && nukeBosses)) {
				// Morale Booster, Good Luck Charm, and Decrease Cooldowns
				var moraleBoosterReady = hasAbility(5);
				var goodLuckCharmReady = hasAbility(6);
				var critReady = (hasAbility(18) && autoUseConsumables);
				
				// Only use items on targets that are spawners and have nearly full health
				if(targetPercentHPRemaining >= 90  && autoUseConsumables) {
					// Check to see if Cripple Spawner and Cripple Monster items are ready to use
					if(hasAbility(14)){
						castAbility(14);
					}else if(hasAbility(15)){
						castAbility(15);
					}
				}
				else if(moraleBoosterReady || critReady || goodLuckCharmReady) {
					// If we have both we want to combo them
					var moraleBoosterUnlocked = abilityIsUnlocked(5);
					var goodLuckCharmUnlocked = abilityIsUnlocked(6);

					// "if Moral Booster isn't unlocked or Good Luck Charm isn't unlocked, or both are ready"
					if((!moraleBoosterUnlocked  && !critReady) || !goodLuckCharmUnlocked || ((moraleBoosterReady || critReady ) && goodLuckCharmReady)) {
						var currentLaneHasCooldown = currentLaneHasAbility(9);
						// Only use on targets that are spawners and have nearly full health
						if(targetPercentHPRemaining >= 70 || (currentLaneHasCooldown && targetPercentHPRemaining >= 60)) {
							// Combo these with Decrease Cooldowns ability

							// If Decreased Cooldowns will be available soon, wait
							if(
							   currentLaneHasCooldown || // If current lane already has Decreased Cooldown, or
							   hasAbility(9) ||			 // If we have the ability ready
							   !abilityIsUnlocked(9) ||  // if we haven't unlocked the ability yet, or
							   (abilityCooldown(9) > 60) // if cooldown > 60
							  ) {
								if(hasAbility(9) && !currentLaneHasAbility(9)) {
									// Other abilities won't benifit if used at the same time
									if(debug)
										console.log('Triggering Decrease Cooldown!');
									castAbility(9);
								}
								else {
									// Use these abilities next pass
									
									//Use crit if one's available
									if(critReady) {
										if(debug)
											console.log("Using Crit!");
										castAbility(18);
									}
									else if (moraleBoosterReady) {
										if(debug)
											console.log("Casting Morale Booster!");
										castAbility(5);
									}
									
									if(goodLuckCharmReady) {
										if(debug)
											console.log("Casting Good Luck Charm!");
										castAbility(6);
									}
								}
							}
						}
					}
				}

				// Tactical Nuke
				if(hasAbility(10) && (targetPercentHPRemaining >= useNukeOnSpawnerAbovePercent || (target.m_data.type == 2 && targetPercentHPRemaining >= useNukeOnBossAbovePercent))) {
					if(debug)
						console.log('Nuclear launch detected.');
					
					castAbility(10);
				}

		
				// Napalm
				else if(target.m_data.type === 0 && hasAbility(12) && targetPercentHPRemaining >= useNukeOnSpawnerAbovePercent && currentLane.enemies.length >= 4) { 
				
					if(debug)
						console.log('Triggering napalm!');
					
					castAbility(12);
				}
				
				// Cluster Bomb
				else if(target.m_data.type === 0 && hasAbility(11) && targetPercentHPRemaining >= useNukeOnSpawnerAbovePercent && currentLane.enemies.length >= 4) {
					
					if(debug)
						console.log('Triggering cluster bomb!');
					
					castAbility(11);
				}

			}
			
			//Use cases for bosses
			else if(!nukeBosses && target.m_data.type == 2) {
				//Raining Gold
				if(hasAbility(17) && autoUseConsumables && targetPercentHPRemaining > useRainingGoldAbovePercent) {
					
					if(debug)
						console.log('Using Raining Gold on boss.');
					
					castAbility(17);
				}
			}
			
			
			// Metal Detector
			var  treasureReady = hasAbility(22) && autoUseConsumables;
			if((target.m_data.type == 2 || target.m_data.type == 4) && timeToTargetDeath < 10) {
				if(hasAbility(8) || treasureReady) {
					if(treasureReady){
						if(debug)
							console.log('Using Metal Detector via Treasure.');
						castAbility(22);
					}
					else {
						if(debug)
							console.log('Using Metal Detector.');
						castAbility(8);
					}
				}
			}
		}
		
		//Estimate average player HP Percent in lane
		var laneTotalPctHP = 0;
		var laneTotalCount = 0;
		for(var i=1; i<10; i++) {
			var HPGuess = ((i-1)*10 + 5);
			laneTotalPctHP += HPGuess * currentLane.player_hp_buckets[i];
			laneTotalCount += currentLane.player_hp_buckets[i];
		}
		var avgLanePercentHP = laneTotalPctHP / laneTotalCount;
		var percentAlive = laneTotalCount / (laneTotalCount + currentLane.player_hp_buckets[0]) * 100;
		
		// Medics
		if((percentHPRemaining <= useMedicsAtPercent || (avgLanePercentHP <= useMedicsAtLanePercent && percentAlive > useMedicsAtLanePercentAliveReq)) && !g_Minigame.m_CurrentScene.m_bIsDead) {
			if(debug) {
				if(percentHPRemaining <= useMedicsAtPercent)
					console.log("Health below threshold. Need medics!");
				if(avgLanePercentHP <= useMedicsAtLanePercent && percentAlive > useMedicsAtLanePercentAliveReq)
					console.log("Average lane below threshold. Need medics!");
			}
			
			// Only use if there isn't already a Medics active?
			var pumpedUpReady = hasAbility(19) && autoUseConsumables;
			var stealHealthReady = hasAbility(23) && autoUseConsumables;
			if((hasAbility(7) || pumpedUpReady) && currentLaneHasAbility(7) < 2) {
				
				if(pumpedUpReady){
					if(debug)
						console.log("Using Medics via Pumped Up!");
					castAbility(19);
				}
				else {
					if(debug)
						console.log("Using Medics!");
					castAbility(7);
				}
			}
			else if(stealHealthReady && percentHPRemaining <= useMedicsAtPercent) {
					if(debug)
						console.log("Using Steal Health in place of Medics!");
					castAbility(23);
			}
			else if(debug)
				console.log("No medics to unleash!");
		}
		
		// Resurrect
		if(hasAbility(13) && autoUseConsumables) {
			if(currentLane.player_hp_buckets[0] >= useResurrectToSaveCount) {
				if(debug)
					console.log('Using resurrection to save ' + currentLane.player_hp_buckets[0] + ' lane allies.');
				castAbility(13);
			}
		}
		
		// Like New
		if(hasAbility(27) && autoUseConsumables) {
			var totalCD = 0;
			for(var i=5; i <= 12; i++){
				if(abilityIsUnlocked(i))
					totalCD += abilityCooldown(i);
			}
				
			if(totalCD * 1000 >= useLikeNewAboveCooldown) {
				if(debug)
					console.log('Using resurrection to save a total of ' + totalCD + ' seconds of cooldown.');
				castAbility(27);
			}
		}
			
	}, abilityUseCheckFreq);
	
	console.log("autoAbilityUser has been started.");
}

function startAutoItemUser() {
	autoUseConsumables = true;
	console.log("Automatic use of consumables has been enabled.");
}

function startAllAutos() {
	startAutoClicker();
	startAutoRespawner();
	startAutoTargetSwapper();
	startAutoAbilityUser();
	startAutoUpgradeManager();
}

// ================ STOPPER FUNCTIONS ================
function stopAutoClicker() {
	if(autoClicker) {
		clearInterval(autoClicker);
		autoClicker = null;
		console.log("autoClicker has been stopped.");
	}
	else
		console.log("No autoClicker is running to stop.");
}
function stopAutoRespawner() {
	if(autoRespawner) {
		clearInterval(autoRespawner);
		autoRespawner = null;
		console.log("autoRespawner has been stopped.");
	}
	else
		console.log("No autoRespawner is running to stop.");
		
}
function stopAutoTargetSwapper() {
	if(autoTargetSwapper){
		clearInterval(autoTargetSwapper);
		autoTargetSwapper = null;
		console.log("autoTargetSwapper has been stopped.");
	}
	else
		console.log("No autoTargetSwapper is running to stop.");
}
function stopAutoAbilityUser() {
	if(autoAbilityUser){
		clearInterval(autoAbilityUser);
		autoAbilityUser = null;
		console.log("autoAbilityUser has been stopped.");
	}
	else
		console.log("No autoAbilityUser is running to stop.");
}

function stopAutoItemUser() {
	autoUseConsumables = false;
	console.log("Automatic use of consumables has been disabled.");
}

function stopAutoUpgradeManager() {
	if(autoUpgradeManager){
		clearInterval(autoUpgradeManager);
		autoUpgradeManager = null;

		//Remove hooks
		var removeHook = function removeHook(base, method) {
			base.prototype[method] = base.prototype[method + '_upgradeManager'] || base.prototype[method];
		}
		removeHook(CSceneGame, 'TryUpgrade');
		removeHook(CSceneGame, 'ChangeLevel');

		//Clear the visual
		$J(document.body).removeClass('upgrade_waiting');
		$J('.next_upgrade').removeClass('next_upgrade');
		
		console.log("autoUpgradeManager has been stopped.");
	}
	else
		console.log("No autoUpgradeManager is running to stop.");
}

function stopAllAutos() {
	stopAutoClicker();
	stopAutoRespawner();
	stopAutoTargetSwapper();
	stopAutoAbilityUser();
	stopAutoItemUser();
	stopAutoUpgradeManager();
}

function disableAutoNukes() {
	useNukeOnSpawnerAbovePercent = 200;
	console.log('Automatic nukes have been disabled');
}

// ================ HELPER FUNCTIONS ================
function castAbility(abilityID) {
	if(hasAbility(abilityID)) {
		if(abilityID <= 12 && document.getElementById('ability_' + abilityID) !== null)
			g_Minigame.CurrentScene().TryAbility(document.getElementById('ability_' + abilityID).childElements()[0]);
		else if(document.getElementById('abilityitem_' + abilityID) !== null)
			g_Minigame.CurrentScene().TryAbility(document.getElementById('abilityitem_' + abilityID).childElements()[0]);
	}
}

function currentLaneHasAbility(abilityID) {
	return laneHasAbility(g_Minigame.CurrentScene().m_rgPlayerData.current_lane, abilityID);
}

function laneHasAbility(lane, abilityID) {
	try {
		return g_Minigame.m_CurrentScene.m_rgLaneData[lane].abilities[abilityID];
	}
	catch(e){
		return 0;
	}	
}

function abilityIsUnlocked(abilityID) {
		if(abilityID <= 12)
			return ((1 << abilityID) & g_Minigame.CurrentScene().m_rgPlayerTechTree.unlocked_abilities_bitfield) > 0;
		else
			return getAbilityItemQuantity(abilityID) > 0;
}

function getAbilityItemQuantity(abilityID) {
	for ( var i = 0; i < g_Minigame.CurrentScene().m_rgPlayerTechTree.ability_items.length; ++i ) {
		var abilityItem = g_Minigame.CurrentScene().m_rgPlayerTechTree.ability_items[i];

		if(abilityItem.ability == abilityID)
			return abilityItem.quantity;
	}

	return 0;
}

// Ability cooldown time remaining (in seconds)
function abilityCooldown(abilityID) {
	return g_Minigame.CurrentScene().GetCooldownForAbility(abilityID);
}

// thanks to /u/mouseasw for the base code: https://github.com/mouseas/steamSummerMinigame/blob/master/autoPlay.js
function hasAbility(abilityID) {
	// each bit in unlocked_abilities_bitfield corresponds to an ability.
	// the above condition checks if the ability's bit is set or cleared. I.e. it checks if
	// the player has purchased the specified ability.
	return abilityIsUnlocked(abilityID) && abilityCooldown(abilityID) <= 0;
}

function updateUserElementMultipliers() {
	if(!gameRunning() || !g_Minigame.m_CurrentScene.m_rgPlayerTechTree) return;
	
	userElementMultipliers[3] = g_Minigame.m_CurrentScene.m_rgPlayerTechTree.damage_multiplier_air;
	userElementMultipliers[4] = g_Minigame.m_CurrentScene.m_rgPlayerTechTree.damage_multiplier_earth;
	userElementMultipliers[1] = g_Minigame.m_CurrentScene.m_rgPlayerTechTree.damage_multiplier_fire;
	userElementMultipliers[2] = g_Minigame.m_CurrentScene.m_rgPlayerTechTree.damage_multiplier_water;
	
	userMaxElementMultiiplier = Math.max.apply(null, userElementMultipliers);
 }

// Return a value to compare mobs' priority (lower value = less important)
//  (treasure > boss > miniboss > spawner > creep)
function getMobTypePriority(potentialTarget) {
	//console.log('test', potentialTarget.m_data)
	
	//Just assume 'false' is a flag for highest priority
	if(potentialTarget.m_data === false) {
		console.log('test', potentialTarget)
		return 4;
	}
	
	if(!potentialTarget || !potentialTarget.m_data)
		return -1;
	
	mobType = potentialTarget.m_data.type;
	
	switch(mobType) {
		case 1: // Creep
			return 0;
		case 0: // Spawner
			return 1;
		case 3: // Miniboss
			return 2;
		case 2: // Boss
			return 3;
		case 4: // Treasure
			return 4;
		default:
			return -1;
	}
}

// Compares two mobs' priority. Returns a negative number if A < B, 0 if equal, positive if A > B
function compareMobPriority(mobA, mobB) {
	if(!mobA)
		return false;
	if(!mobB) {
		swapReason = "Swapping off a non-existent mob.";
		return true;
	}
	
	var percentHPRemaining = g_Minigame.CurrentScene().m_rgPlayerData.hp  / g_Minigame.CurrentScene().m_rgPlayerTechTree.max_hp * 100;
	var aHasHealing = laneHasAbility(mobA.m_nLane, 7) || laneHasAbility(mobA.m_nLane, 23);
	var bHasHealing = laneHasAbility(mobB.m_nLane, 7) || laneHasAbility(mobB.m_nLane, 23);

	var aIsGold = laneHasAbility(mobA.m_nLane, 17);
	var bIsGold = laneHasAbility(mobB.m_nLane, 17);
	
	var aTypePriority = getMobTypePriority(mobA);
	var bTypePriority = getMobTypePriority(mobB);
	
	var aElemMult = userElementMultipliers[g_Minigame.m_CurrentScene.m_rgGameData.lanes[mobA.m_nLane].element];
	var bElemMult = userElementMultipliers[g_Minigame.m_CurrentScene.m_rgGameData.lanes[mobB.m_nLane].element];

	//check for Max Elemental Damage Ability
	if(laneHasAbility(mobA.m_nLane, 16))
		aElemMult = userMaxElementMultiiplier;
	if(laneHasAbility(mobB.m_nLane, 16))
		bElemMult = userMaxElementMultiiplier;
	
	var aHP = mobA.m_data.hp;
	var bHP = mobB.m_data.hp;

	//First, make sure they're alive
	if(mobA.m_bIsDestroyed || aHP <= 0)
		return false;
	else if(mobB.m_bIsDestroyed || bHP <= 0) {
		swapReason = "Swapping off a destroyed mob.";
		return true;
	}

	//ignore in the weird case that mob priority isn't set to any type (usually set to 'false') (I've seen it sometimes)
	/*if(aTypePriority !== -1) {
		//if(debug)
		//	console.log('wtf, unknown mobType.', [mobA.m_nLane, mobA.m_nID, aTypePriority], [mobB.m_nLane, mobB.m_nID, bTypePriority]);
		return false;
	}
	else if(bTypePriority !== -1)
		return true;
	*/
	
	else if(aIsGold != bIsGold) {
		if(aIsGold > bIsGold && (mobB.m_data.type == 3 || mobB.m_data.type == 1)) {
			swapReason = "Switching to target with Raining Gold.";
			return true;
		}
	}
	
	else if(aTypePriority != bTypePriority) {		
		if(aTypePriority > bTypePriority) {
			swapReason = "Switching to higher priority target.";
			return true;
		}
	}
	
	//Run to a medic lane if needed
	else if(percentHPRemaining <= seekHealingPercent && !g_Minigame.m_CurrentScene.m_bIsDead) {
		if(aHasHealing != bHasHealing) {
			if(aHasHealing) {
				swapReason = "Swapping to lane with active healing.";
				return true;
			}
		}
	}
	
	else if(aElemMult != bElemMult) {
		if(aElemMult > bElemMult) {
			swapReason = "Switching to elementally weaker target.";
			return true;
		}
	}
	else if(aHP != bHP) {
		if(aHP < bHP) {
			swapReason = "Switching to lower HP target.";
			return true;
		}
	}
	return false;
}

function gameRunning() {
	try {
		return (typeof g_Minigame === "object" && g_Minigame.m_CurrentScene.m_rgGameData.status == 2);
	}
	catch (e) {
		return false;
	}
}

function addPointer() {
	g_Minigame.m_CurrentScene.m_rgFingerTextures = [];
	var w = 26;
	var h = 49;


	for( var y = 0; y < 4; y++)
	{
		for( var x = 0; x < 5; x++ )

		{
			g_Minigame.m_CurrentScene.m_rgFingerTextures.push( new PIXI.Texture( g_rgTextureCache.pointer.texture, {
				x: x * w,
				y: y * h,
				width: w,
				height: h
			} )
			);
		}
	}

	g_Minigame.m_CurrentScene.m_nFingerIndex = 0;

	g_Minigame.m_CurrentScene.m_spriteFinger = new PIXI.Sprite( g_Minigame.m_CurrentScene.m_rgFingerTextures[g_Minigame.m_CurrentScene.m_nFingerIndex] );
	g_Minigame.m_CurrentScene.m_spriteFinger.scale.x = g_Minigame.m_CurrentScene.m_spriteFinger.scale.y = 2;

	g_Minigame.m_CurrentScene.m_containerParticles.addChild( g_Minigame.m_CurrentScene.m_spriteFinger );
}

function getTarget() {
	try {
		var target = g_Minigame.m_CurrentScene.GetEnemy(g_Minigame.m_CurrentScene.m_rgPlayerData.current_lane, g_Minigame.m_CurrentScene.m_rgPlayerData.target);
		return target;
	} catch(e) {
		return null;
	}
}
		

//Expose functions if running in userscript
if(typeof unsafeWindow != 'undefined') {
	// Variables
	unsafeWindow.debug = debug;
	unsafeWindow.clicksPerSecond = clicksPerSecond;
	unsafeWindow.autoClickerVariance = autoClickerVariance;
	unsafeWindow.respawnCheckFreq = respawnCheckFreq;
	unsafeWindow.targetSwapperFreq = targetSwapperFreq;
	unsafeWindow.abilityUseCheckFreq = abilityUseCheckFreq;
	unsafeWindow.itemUseCheckFreq = itemUseCheckFreq;
	unsafeWindow.seekHealingPercent = seekHealingPercent;
	unsafeWindow.upgradeManagerFreq = upgradeManagerFreq;
	unsafeWindow.autoBuyAbilities = autoBuyAbilities;

	//item use variables
	unsafeWindow.useMedicsAtPercent = useMedicsAtPercent;
	unsafeWindow.useMedicsAtLanePercent = useMedicsAtLanePercent;
	unsafeWindow.useMedicsAtLanePercentAliveReq = useMedicsAtLanePercentAliveReq;
	unsafeWindow.useNukeOnSpawnerAbovePercent = useNukeOnSpawnerAbovePercent;
	unsafeWindow.useMetalDetectorOnBossBelowPercent = useMetalDetectorOnBossBelowPercent;
	unsafeWindow.useStealHealthAtPercent = useStealHealthAtPercent;
	unsafeWindow.useRainingGoldAbovePercent = useRainingGoldAbovePercent;
	unsafeWindow.autoUseConsumables = autoUseConsumables;
	unsafeWindow.useResurrectToSaveCount = useResurrectToSaveCount;
	
	//Slave window variables
	unsafeWindow.slaveWindowUICleanup = slaveWindowUICleanup;
	unsafeWindow.slaveWindowPeriodicRestart = slaveWindowPeriodicRestart;
	unsafeWindow.slaveWindowPeriodicRestartInterval = slaveWindowPeriodicRestartInterval;
	
	//Boss nuke vars
	unsafeWindow.nukeBossesAfterLevel = nukeBossesAfterLevel;
	unsafeWindow.farmGoldOnBossesLevelDiff = farmGoldOnBossesLevelDiff;
	unsafeWindow.useNukeOnBossAbovePercent = useNukeOnBossAbovePercent;
	
	// Functions
	unsafeWindow.startAutoClicker = startAutoClicker;
	unsafeWindow.startAutoRespawner = startAutoRespawner;
	unsafeWindow.startAutoTargetSwapper = startAutoTargetSwapper;
	unsafeWindow.startAutoAbilityUser = startAutoAbilityUser;
	unsafeWindow.startAutoItemUser = startAutoItemUser;
	unsafeWindow.startAllAutos = startAllAutos;
	unsafeWindow.startAutoUpgradeManager = startAutoUpgradeManager;
	unsafeWindow.stopAutoClicker = stopAutoClicker;
	unsafeWindow.stopAutoRespawner = stopAutoRespawner;
	unsafeWindow.stopAutoTargetSwapper = stopAutoTargetSwapper;
	unsafeWindow.stopAutoAbilityUser = stopAutoAbilityUser;
	unsafeWindow.stopAutoItemUser = stopAutoItemUser;
	unsafeWindow.stopAutoUpgradeManager = stopAutoUpgradeManager;
	unsafeWindow.stopAllAutos = stopAllAutos;
	unsafeWindow.disableAutoNukes = disableAutoNukes;
	unsafeWindow.castAbility = castAbility;
	unsafeWindow.hasAbility = hasAbility;
	unsafeWindow.abilityIsUnlocked = abilityIsUnlocked;
	unsafeWindow.abilityCooldown = abilityCooldown;
	unsafeWindow.toggleAutoClicker = toggleAutoClicker;
	unsafeWindow.toggleAutoTargetSwapper = toggleAutoTargetSwapper;
	unsafeWindow.toggleAutoAbilityUser = toggleAutoAbilityUser;
	unsafeWindow.toggleAutoItemUser = toggleAutoItemUser;
	unsafeWindow.toggleAutoUpgradeManager = toggleAutoUpgradeManager;
	unsafeWindow.spamNoClick = spamNoClick;
	unsafeWindow.toggleSpammer = toggleSpammer;
	unsafeWindow.getTarget = getTarget;
	unsafeWindow.currentLaneHasAbility = currentLaneHasAbility;
	unsafeWindow.getMobTypePriority = getMobTypePriority;
	
	
	//Hacky way to let people change vars using userscript before I set up getter/setter fns tomorrow
	var varSetter = setInterval(function() {
		if(debug)
			console.log('updating options');
		
		// Main vars
		debug = unsafeWindow.debug;
		clicksPerSecond = unsafeWindow.clicksPerSecond;
		autoClickerVariance = unsafeWindow.autoClickerVariance;
		respawnCheckFreq = unsafeWindow.respawnCheckFreq;
		targetSwapperFreq = unsafeWindow.targetSwapperFreq;
		abilityUseCheckFreq = unsafeWindow.abilityUseCheckFreq;
		itemUseCheckFreq = unsafeWindow.itemUseCheckFreq;
		seekHealingPercent = unsafeWindow.seekHealingPercent;
		upgradeManagerFreq = unsafeWindow.upgradeManagerFreq;
		autoBuyAbilities = unsafeWindow.autoBuyAbilities;

		//item use variables
		useMedicsAtPercent = unsafeWindow.useMedicsAtPercent;
		useMedicsAtLanePercent = unsafeWindow.useMedicsAtLanePercent;
		useMedicsAtLanePercentAliveReq = unsafeWindow.useMedicsAtLanePercentAliveReq;
		useNukeOnSpawnerAbovePercent = unsafeWindow.useNukeOnSpawnerAbovePercent;
		useMetalDetectorOnBossBelowPercent = unsafeWindow.useMetalDetectorOnBossBelowPercent;
		useStealHealthAtPercent = unsafeWindow.useStealHealthAtPercent;
		useRainingGoldAbovePercent = unsafeWindow.useRainingGoldAbovePercent;
		useResurrectToSaveCount = unsafeWindow.useResurrectToSaveCount;
		
		//Boss nuke vars
		nukeBossesAfterLevel = unsafeWindow.nukeBossesAfterLevel;
		farmGoldOnBossesLevelDiff = unsafeWindow.farmGoldOnBossesLevelDiff;
		useNukeOnBossAbovePercent = unsafeWindow.useNukeOnBossAbovePercent;
		
	}, 5000)
	
	//Add closure 'debug' getter and setter
	unsafeWindow.getDebug = function() { return debug; };
	unsafeWindow.setDebug = function(state) { debug = state; };
}

function updatePlayersInLane() {
	// update players in lane
	var players = "???";
	if(g_Minigame.m_CurrentScene.m_rgLaneData[g_Minigame.m_CurrentScene.m_rgPlayerData.current_lane])
		players = g_Minigame.m_CurrentScene.m_rgLaneData[g_Minigame.m_CurrentScene.m_rgPlayerData.current_lane].players;
	
	$J("#players_in_lane").html(players);
}

function updatePlayersInRoom() {
	//Update players in room
	var players = "???";
	if(g_Minigame.m_CurrentScene.m_rgLaneData[0])
		players = (g_Minigame.m_CurrentScene.m_rgLaneData[0].players + g_Minigame.m_CurrentScene.m_rgLaneData[1].players + g_Minigame.m_CurrentScene.m_rgLaneData[2].players);
	$J("#players_in_room").html(players);
}

//Keep trying to start every second till success
var startAll = setInterval(function() { 
		if(!gameRunning())
			return;
		
		clearInterval(startAll);
		
		startAllAutos();
		addPointer();
		addExtraUI();

		//Update current players in lane/room count
		updatePlayersInLane();
		updatePlayersInRoom();
		setInterval(function() { updatePlayersInLane(); updatePlayersInRoom(); }, 10000);

		//Hide the stupid "Leave game" tooltip
		$J('.leave_game_btn').mouseover(function(){
				$J('.leave_game_helper').show();
			})
			.mouseout(function(){
				$J('.leave_game_helper').hide();
			});
		$J('.leave_game_helper').hide();
		
		
		if(typeof runMaster == 'function'){
			//Setup for slave windows
			if(location.search.match(/slave/))
				runSlave();
			else
				runMaster();
		}

		// Overwrite this function so it doesn't delete our sexy pointer
		CSceneGame.prototype.ClearNewPlayer = function() {
			if( this.m_spriteFinger )  {
				var bPlayedBefore = WebStorage.SetLocal('mg_how2click', 1);
				$J('#newplayer').hide();
			}
		}

		// Overwrite this function so our loot notifications do not repeat until we actually have a new one
		CUI.prototype.UpdateLootNotification = function() {
			if (this.m_Game.m_rgPlayerData.loot && this.m_Game.m_rgPlayerData.loot.length != 0 && this.m_Game.m_rgGameData.level >= lastLootLevel + 10 && (lastLootCache.length == 0 || lastLootCache.toString() !== this.m_Game.m_rgPlayerData.loot.toString())) {
				$J("#loot_notification").show();

				var abilities = this.m_Game.m_rgTuningData.abilities;
				var strLootNames = "";
				for (var i = 0; i < this.m_Game.m_rgPlayerData.loot.length; ++i) {
					var loot = this.m_Game.m_rgPlayerData.loot[i];
					if (i != 0) { strLootNames += ", "; }
					strLootNames += abilities[loot.ability].name;
				}
				$J("#loot_name").text( strLootNames );
				setTimeout(function() { $J("#loot_notification").fadeOut(1000); }, 5000);
				lastLootLevel = this.m_Game.m_rgGameData.level;
				lastLootCache = this.m_Game.m_rgPlayerData.loot;
				this.m_Game.m_rgPlayerData.loot = [];
			}
		}

	}, 1000);

function addExtraUI() {
	addCustomButtons();

	//Add in player count for current room
	var old = $J(".title_activity").html();
	$J(".title_activity").html(old+'&nbsp;[<span id="players_in_room">0</span> in room]');

	customCSS();
}

function addCustomButtons() {
	//Smack the TV Easter Egg
	$J('<div style="height: 52px; position: absolute; bottom: 85px; left: 828px; z-index: 12;" onclick="SmackTV();"><br><br><span style="font-size:10px; padding: 12px; color: gold;">Smack TV</span></div>').insertBefore('#row_bottom');
	
	//Reformat current buttons
	$J(".leave_game_btn").css({"width": "125px", "background-position": "-75px 0px", "position": "absolute", "bottom": "144px", "z-index": "12", "left": "340px"});
	$J(".leave_game_helper").css({"left": "150px", "top": "-75px", "z-index": "12"});
	$J(".leave_game_btn").html('<span style="padding-right: 50px;">Close</span><br><span style="padding-right: 50px;">Game</span>');
	
	//Overwrite their functions
	$J(".toggle_music_btn").click(toggleMusic).attr('id', 'toggleMusicBtn');
	$J('#toggleMusicBtn').html('<span>' + (WebStorage.GetLocal('minigame_mutemusic') ? 'Enable' : 'Disable') + ' Music</span>');
	$J(".toggle_sfx_btn").click(toggleSFX).attr('id', 'toggleSFXBtn');
	$J('#toggleSFXBtn').html('<span>' + (WebStorage.GetLocal('minigame_mute') ? 'Enable' : 'Disable') + ' SFX</span>');

	$J("#toggleMusicBtn").after('<span id="toggleAllSoundBtn" class="toggle_music_btn" style="display:inline-block;"><span>' + (bIsMuted() ? 'Enable' : 'Disable') + ' All Sound' + '</span></span>');
	$J("#toggleAllSoundBtn").click (toggleAllSound);
    
	//Automator buttons
	$J(".game_options").after('<div class="game_options" id="auto_options"></div>'); // background

	$J("#auto_options").append('<span id="toggleAutoClickerBtn" class="toggle_music_btn toggle_btn enabled" style="display:inline-block;margin-left:6px"><span>AutoClicker</span><br /><span class="status">Enabled</span></span>');
	$J("#toggleAutoClickerBtn").click (toggleAutoClicker);
	
	$J("#auto_options").append('<span id="toggleAutoTargetSwapperBtn" class="toggle_music_btn toggle_btn enabled" style="display:inline-block;"><span>Target Swap</span><br /><span class="status">Enabled</span></span>');
	$J("#toggleAutoTargetSwapperBtn").click (toggleAutoTargetSwapper);
	
	$J("#auto_options").append('<span id="toggleAutoAbilityUserBtn" class="toggle_music_btn toggle_btn enabled" style="display:inline-block;"><span>Ability/Item Use</span><br /><span class="status">Enabled</span></span>');
	$J("#toggleAutoAbilityUserBtn").click (toggleAutoAbilityUser);
	
	$J("#auto_options").append('<span id="toggleAutoItemUserBtn" class="toggle_music_btn toggle_btn enabled" style="display:inline-block;"><span>Auto Consumable Use</span><br /><span class="status">Enabled</span></span>');
	$J("#toggleAutoItemUserBtn").click (toggleAutoItemUser);
	
	$J("#auto_options").append('<span id="toggleAutoUpgradeBtn" class="toggle_music_btn toggle_btn enabled" style="display:inline-block;"><span>Upgrader</span><br /><span class="status">Enabled</span></span>');
	$J("#toggleAutoUpgradeBtn").click (toggleAutoUpgradeManager);
	
	$J("#auto_options").append('<span id="toggleSpammerBtn" class="toggle_music_btn toggle_btn disabled" style="display:inline-block;"><span>Particle Spam</span><br /><span class="status">Disabled</span></span>');
	$J("#toggleSpammerBtn").click (toggleSpammer);

	// Append gameid to breadcrumbs
	var breadcrumbs = document.querySelector('.breadcrumbs');

	if(breadcrumbs) {
		var element = document.createElement('span');
		element.textContent = ' > ';
		breadcrumbs.appendChild(element);

		element = document.createElement('span');
		element.style.color = '#D4E157';
		element.style.textShadow = '1px 1px 0px rgba( 0, 0, 0, 0.3 )';
		element.textContent = 'Room ' + g_GameID;
		breadcrumbs.appendChild(element);
      
		if(typeof GM_info != 'undefined') {
			element = document.createElement('span');
			element.style.float = 'right';
			element.style.color = '#D4E157';
			element.style.textShadow = '1px 1px 0px rgba( 0, 0, 0, 0.3 )';
			element.textContent = GM_info.script.name + ' v' + GM_info.script.version;
			breadcrumbs.appendChild(element);
		}
	}
}

function addGlobalStyle(css) {
    $J('head').append('<style>'+css+'</style>');
}

function customCSS() {
	addGlobalStyle(".game_options .toggle_btn { background: url('https://raw.githubusercontent.com/ensingm2/SteamMonsterGameScript/master/button_icons.png');background-repeat: no-repeat;background-position: 0px 0px;cursor: pointer;width: 150px;height: 21px;}");
	addGlobalStyle(".game_options .toggle_btn.enabled {background: url('https://raw.githubusercontent.com/ensingm2/SteamMonsterGameScript/master/button_icons.png');background-repeat: no-repeat;background-position: 0px -56px;cursor: pointer;height: 21px;}");
	addGlobalStyle(".game_options .toggle_btn.disabled {background: url('https://raw.githubusercontent.com/ensingm2/SteamMonsterGameScript/master/button_icons.png');background-repeat: no-repeat;background-position: 0px -112px;cursor: pointer;height: 21px; }");

	addGlobalStyle(".game_options .toggle_btn:hover { background: url('https://raw.githubusercontent.com/ensingm2/SteamMonsterGameScript/master/button_icons.png');background-repeat: no-repeat;background-repeat: no-repeat;background-position: -150px 0px;color: #fff;}");
	addGlobalStyle(".game_options .toggle_btn.enabled:hover { background: url('https://raw.githubusercontent.com/ensingm2/SteamMonsterGameScript/master/button_icons.png');background-repeat: no-repeat;background-position: -150px -56px;color: #fff; }");
	addGlobalStyle(".game_options .toggle_btn.disabled:hover { background: url('https://raw.githubusercontent.com/ensingm2/SteamMonsterGameScript/master/button_icons.png');background-repeat: no-repeat;background-position: -150px -112px;color: #fff;}");

	addGlobalStyle(".game_options .toggle_btn span { position: relative; top: -20px; }");
}


function toggleSFX() {
	var disable = WebStorage.GetLocal('minigame_mute');
	if(disable)
		WebStorage.SetLocal('minigame_mute', true);
	else
		WebStorage.SetLocal('minigame_mute', false);
		
	updateSoundBtnText();
}
function toggleMusic() {
	var disable = WebStorage.GetLocal('minigame_mutemusic');
	if(disable){
		WebStorage.SetLocal('minigame_mutemusic', true);
		g_AudioManager.m_eleMusic.pause();
	}
	else {
		WebStorage.SetLocal('minigame_mutemusic', false);
		g_AudioManager.m_eleMusic.play();
	}
	
	updateSoundBtnText();
}

function toggleAllSound() {
	// Enable
	if(bIsMuted()){
		WebStorage.SetLocal('minigame_mute', false);
		WebStorage.SetLocal('minigame_mutemusic', false);
		g_AudioManager.m_eleMusic.play();
	}
	// Disable
	else {
		WebStorage.SetLocal('minigame_mute', true);
		WebStorage.SetLocal('minigame_mutemusic', true);
		g_AudioManager.m_eleMusic.pause();
	}
	
	updateSoundBtnText();
}

function updateSoundBtnText() {
	$J('#toggleSFXBtn').html('<span>' + (WebStorage.GetLocal('minigame_mute') ? 'Enable' : 'Disable') + ' SFX</span>');
	$J('#toggleMusicBtn').html('<span>' + (WebStorage.GetLocal('minigame_mutemusic') ? 'Enable' : 'Disable') + ' Music</span>');
	$J("#toggleAllSoundBtn").html("<span>"+(bIsMuted() ? "Enable" : "Disable")+" All Sound</span>");
}

function toggleAutoClass(id, isOn) {
	if (isOn) {
		$J(id).addClass("enabled");
		$J(id).removeClass("disabled");
		$J(id+' .status').html('Enabled');
	} else {
		$J(id).removeClass("enabled");
		$J(id).addClass("disabled");
		$J(id+' .status').html('Disabled');
	}
}

function toggleAutoClicker() {
	if(autoClicker) {
		stopAutoClicker();
		toggleAutoClass('#toggleAutoClickerBtn', false);
	}
	else {
		startAutoClicker();
		toggleAutoClass('#toggleAutoClickerBtn', true);
	}
}
function toggleAutoTargetSwapper() {
	if(autoTargetSwapper) {
		stopAutoTargetSwapper();
		toggleAutoClass('#toggleAutoTargetSwapperBtn', false);
	}
	else {
		startAutoTargetSwapper();
		toggleAutoClass('#toggleAutoTargetSwapperBtn', true);
	}
}
function toggleAutoAbilityUser(){
	if(autoAbilityUser) {
		stopAutoAbilityUser();
		toggleAutoClass('#toggleAutoAbilityUserBtn', false);
	}
	else {
		startAutoAbilityUser();
		toggleAutoClass('#toggleAutoAbilityUserBtn', true);
	}
}
function toggleAutoItemUser(){
	if(autoUseConsumables) {
		stopAutoItemUser();
		toggleAutoClass('#toggleAutoItemUserBtn', false);
	}
	else {
		startAutoItemUser();
		toggleAutoClass('#toggleAutoItemUserBtn', true);
	}
}
function toggleAutoUpgradeManager(){
	if(autoUpgradeManager) {
		stopAutoUpgradeManager();
		toggleAutoClass('#toggleAutoUpgradeBtn', false);
	}
	else {
		startAutoUpgradeManager();
		toggleAutoClass('#toggleAutoUpgradeBtn', true);
	}
}

var spammer;
function spamNoClick() {
	// Save the click count
	var clickCount = g_Minigame.m_CurrentScene.m_nClicks;
	
	// Perform default click
	g_Minigame.m_CurrentScene.DoClick(
		{
			data: {
				getLocalPosition: function() {
					var enemy = getTarget(),
					laneOffset = enemy.m_nLane * 440;

					return {
						x: enemy.m_Sprite.position.x - laneOffset,
						y: enemy.m_Sprite.position.y - 52
					}
				}
			}
		}
	);
	
	// Restore the click count
	g_Minigame.m_CurrentScene.m_nClicks = clickCount;
}
function toggleSpammer() {
	if(spammer) {
		clearInterval(spammer);
		spammer = null;
		//$J("#toggleSpammerBtn").html('<span>Particle Spam</span><br /><span class="status">Disabled</span>');
		toggleAutoClass('#toggleSpammerBtn', false);
	}
	else {
		if(confirm("Are you SURE you want to do this? This leads to massive memory leaks fairly quickly.")) {
			spammer = setInterval(spamNoClick, 1000 / clicksPerSecond);
			//$J("#toggleSpammerBtn").html('<span>Particle Spam</span><br /><span class="status">Disabled</span>');
			toggleAutoClass('#toggleSpammerBtn', true);
		}
	}
		
}
