function startAutoClicker(){return autoClicker?void console.log("Autoclicker is already running!"):(autoClicker=setInterval(function(){if(gameRunning()){var e=Math.floor(Math.random()*autoClickerVariance*2)-autoClickerVariance,t=clicksPerSecond+e;g_Minigame.m_CurrentScene.m_nClicks+=t,g_msTickRate=1100;var a=g_Minigame.m_CurrentScene.m_rgGameData.lanes[g_Minigame.m_CurrentScene.m_rgPlayerData.current_lane].active_player_ability_gold_per_click,n=getTarget();if(n&&a>0&&n.m_data.hp>0){var r=n.m_data.gold*a*g_Minigame.m_CurrentScene.m_nClicks;g_Minigame.m_CurrentScene.ClientOverride("player_data","gold",g_Minigame.m_CurrentScene.m_rgPlayerData.gold+r),g_Minigame.m_CurrentScene.ApplyClientOverrides("player_data",!0)}var i=g_Minigame.m_CurrentScene.m_rgStoredCrits.length;if(g_Minigame.m_CurrentScene.m_rgStoredCrits=[],debug){i>1&&console.log("Clicking "+g_Minigame.m_CurrentScene.m_nClicks+" times this second. ("+i+" crits)."),console.log(1==i?"Clicking "+g_Minigame.m_CurrentScene.m_nClicks+" times this second. (1 crit).":"Clicking "+g_Minigame.m_CurrentScene.m_nClicks+" times this second.");var o=g_Minigame.m_CurrentScene.CalculateDamage(g_Minigame.m_CurrentScene.m_rgPlayerTechTree.damage_per_click*userMaxElementMultiiplier*g_Minigame.m_CurrentScene.m_nClicks),s="(unknown)";o>1e9?s=o/1e9+"B":o>1e6?s=o/1e6+"M":o>1e3&&(s=o/1e3+"K"),console.log("We did roughly "+s+" damage in the last second.")}}},autoClickerFreq),void console.log("autoClicker has been started."))}function startAutoUpgradeManager(){if(autoUpgradeManager)return void console.log("UpgradeManager is already running!");var e=30,t=[.4,.3,.2,.1],a=1,n=clicksPerSecond+Math.ceil(autoClickerVariance/2),r=g_Minigame.CurrentScene(),i=!1,o={id:-1,cost:0},s=[{id:0,level:1},{id:11,level:1},{id:2,level:10},{id:1,level:10}],l=[11,13,16,18,17,14,15,12],u=[0,8,20,23],g=[1,9,21,24],c=7,p=[2,10,22,25],m=[3,4,5,6],d=function(e){var t=null;return r.m_rgPlayerUpgrades&&r.m_rgPlayerUpgrades.some(function(a){return a.upgrade==e?(t=a,!0):void 0}),t},_=function(){var e=!1;return function(t){return(!e||t)&&(e=m.map(function(e){return{id:e,level:d(e).level}}).sort(function(e,t){return t.level-e.level})),e}}(),b=function(e){return e=e||_(),r.m_rgTuningData.upgrades[4].multiplier*e.reduce(function(e,a,n){return e+a.level*t[n]},0)},A=function(e){if(!r.bHaveUpgrade(e))return!1;var t=r.m_rgTuningData.upgrades[e],a=t.required_upgrade;if(void 0!==a){var n=t.required_upgrade_level||1;return n<=r.GetUpgradeLevel(a)}return!0},y=function(e,t){var a,n=r.m_rgTuningData.player.damage_per_click,i=r.m_rgTuningData.upgrades[e],o=0,s=0,l=d(e).level;void 0===t&&(t=l+1);for(var u=t-d(e).level;u>0;u--)o+=n*i.multiplier,s+=i.cost*Math.pow(i.cost_exponential_base,t-u);var g=i.required_upgrade;if(void 0!==g){var c=y(g,i.required_upgrade_level||1);c.cost>0&&(o+=c.boost,s+=c.cost,a=c.required||g)}return{boost:o,cost:s,required:a}},f=function(){for(var e,t,a,n={id:-1,cost:0};s.length>0;){if(e=s[0],t=e.id,a=d(t),a.level<e.level){var i=r.m_rgTuningData.upgrades[t];n={id:t,cost:i.cost*Math.pow(i.cost_exponential_base,a.level)};break}s.shift()}return n},h=function(){var e={id:-1,cost:0};return autoBuyAbilities&&l.some(function(t){return A(t)&&d(t).level<1?(e={id:t,cost:r.m_rgTuningData.upgrades[t].cost},!0):void 0}),e},w=function(){var e={id:-1,cost:0,hpg:0};return u.forEach(function(t){if(A(t)){var a=r.m_rgTuningData.upgrades[t],n=d(t),i=a.cost*Math.pow(a.cost_exponential_base,n.level),o=r.m_rgTuningData.player.hp*a.multiplier/i;o>=e.hpg&&(e={id:t,cost:i,hpg:o})}}),e},S=function(){var e,t,i,o,s={id:-1,cost:0,dpg:0},l=r.m_rgPlayerTechTree.damage_per_click,u=(r.m_rgTuningData.player.damage_per_click,r.m_rgPlayerTechTree.damage_multiplier_crit),m=r.m_rgPlayerTechTree.crit_percentage-r.m_rgTuningData.player.crit_percentage,f=_(),h=b(f);g.forEach(function(a){A(a)&&(e=r.m_rgTuningData.upgrades[a],t=e.cost*Math.pow(e.cost_exponential_base,d(a).level),i=r.m_rgPlayerTechTree.base_dps/n*e.multiplier/t,i>=s.dpg&&(s={id:a,cost:t,dpg:i}))}),A(c)&&(e=r.m_rgTuningData.upgrades[c],o=l*m*e.multiplier,t=e.cost*Math.pow(e.cost_exponential_base,d(c).level),i=o/t,i>=s.dpg&&(s={id:c,cost:t,dpg:i})),p.forEach(function(a){var n=y(a);o=n.boost*(m*u+(1-m)*h),t=n.cost,i=o/t,i>=s.dpg&&(n.required&&(a=n.required,e=r.m_rgTuningData.upgrades[a],t=e.cost*Math.pow(e.cost_exponential_base,d(a).level)),s={id:a,cost:t,dpg:i})}),e=r.m_rgTuningData.upgrades[4];var w=f.reduce(function(e,t){return e+t.level},1);t=e.cost*Math.pow(e.cost_exponential_base,w);var S=f.map(function(e){return{level:e.level}}),M=S[a-1].level;if(S[a-1].level++,a>1){var C=S[a-2].level;M>=C&&(S[a-2].level=M+1,S[a-1].level=C)}if(o=l*(1-m)*(b(S)-h),i=o/t,i>s.dpg){var v=f.filter(function(e){return e.level==M});v=v[Math.floor(Math.random()*v.length)].id,s={id:v,cost:t,dpg:i}}return s},M=function(){var e=!1;return function(t){if(e===!1||t){var a=r.m_rgPlayerTechTree.max_hp,n=r.m_rgGameData.lanes.reduce(function(e,t){return Math.max(e,t.enemies.reduce(function(e,t){return e+t.dps},0))},0);e=a/(n||4*r.m_rgGameData.level)}return e}}(),C=function(){if(o=f(),-1===o.id)if(M()<e)o=w();else{var t=S(),a=h();o=t.cost<a.cost||-1===a.id?t:a}-1!==o.id&&(debug&&console.log("next buy:",r.m_rgTuningData.upgrades[o.id].name,"("+FormatNumberForDisplay(o.cost)+")"),v(o.id))},v=function(e){r.m_rgPlayerUpgrades&&r.m_rgPlayerUpgrades.some(function(t){t.upgrade==e?$J("#upgr_"+t.upgrade).length&&$J("#upgr_"+t.upgrade+" a").css({"-webkit-box-shadow":"0px 0px 16px 2px rgba(140,237,125,0.75)","-moz-box-shadow":"0px 0px 16px 2px rgba(140,237,125,0.75)","box-shadow":"0px 0px 16px 2px rgba(140,237,125,0.75)"}):$J("#upgr_"+t.upgrade).length&&$J("#upgr_"+t.upgrade+" a").removeAttr("style")})},k=function(e,t,a){var n=t+"_upgradeManager";e.prototype[n]||(e.prototype[n]=e.prototype[t]),e.prototype[t]=function(){this[n].apply(this,arguments),a.apply(this,arguments)}};k(CSceneGame,"TryUpgrade",function(){this.m_bUpgradesBusy&&(o.id=-1)}),k(CSceneGame,"ChangeLevel",function(){M(!0)<e&&C()}),upgradeManagerPrefilter=function(e,t,a){e.url.match(/ChooseUpgrade/)?a.success(function(){window.setTimeout(autoUpgradeManager,0)}).fail(function(){r.m_bNeedTechTree=!0,i=!0}):e.url.match(/GetPlayerData/)&&i&&a.success(function(e){var t=g_Server.m_protobuf_GetPlayerDataResponse.decode(e).toRaw(!0,!0);t.tech_tree&&(i=!1,r.m_bUpgradesBusy=!1)})},autoUpgradeManager=setInterval(function(){debug&&console.log("Checking for worthwhile upgrades"),r=g_Minigame.CurrentScene(),r.m_bUpgradesBusy||(-1===o.id&&(_(!0),M(!0),C()),-1!==o.id&&o.cost<=r.m_rgPlayerData.gold&&$J(".link").each(function(){return $J(this).data("type")===o.id?(r.TryUpgrade(this),!1):void 0}))},upgradeManagerFreq),console.log("autoUpgradeManager has been started.")}function startAutoRespawner(){return autoRespawner?void console.log("autoRespawner is already running!"):(autoRespawner=setInterval(function(){debug&&console.log("Checking if the player is dead."),g_Minigame.m_CurrentScene.m_bIsDead&&(debug&&console.log("Player is dead. Respawning."),RespawnPlayer())},respawnCheckFreq),void console.log("autoRespawner has been started."))}function startAutoTargetSwapper(){return autoTargetSwapper?void console.log("autoTargetSwapper is already running!"):(updateUserElementMultipliers(),autoTargetSwapperElementUpdate=setInterval(updateUserElementMultipliers,elementUpdateRate),autoTargetSwapper=setInterval(function(){var e=null;g_Minigame.m_CurrentScene.m_rgEnemies.each(function(t){compareMobPriority(t,e)&&(e=t)});var t=getTarget();null==e||t&&e.m_data.id==t.m_data.id?null==e||t||e.m_data.id==t.m_data.id||g_Minigame.m_CurrentScene.m_rgPlayerData.current_lane==e.m_nLane||g_Minigame.m_CurrentScene.TryChangeLane(e.m_nLane):(debug&&null!=swapReason&&(console.log(swapReason),swapReason=null),g_Minigame.m_CurrentScene.m_rgPlayerData.current_lane!=e.m_nLane&&g_Minigame.m_CurrentScene.TryChangeLane(e.m_nLane),g_Minigame.m_CurrentScene.TryChangeTarget(e.m_nID))},targetSwapperFreq),void console.log("autoTargetSwapper has been started."))}function startAutoAbilityUser(){return autoAbilityUser?void console.log("autoAbilityUser is already running!"):(autoAbilityUser=setInterval(function(){debug&&console.log("Checking if it's useful to use an ability.");var e=g_Minigame.CurrentScene().m_rgPlayerData.hp/g_Minigame.CurrentScene().m_rgPlayerTechTree.max_hp*100,t=getTarget(),a=g_Minigame.m_CurrentScene.m_rgGameData.lanes[g_Minigame.CurrentScene().m_rgPlayerData.current_lane];if(t){var n=t.m_data.hp/t.m_data.max_hp*100,r=g_Minigame.m_CurrentScene.m_rgLaneData[g_Minigame.CurrentScene().m_rgPlayerData.current_lane].friendly_dps,i=t.m_data.hp/r,o=g_Minigame.m_CurrentScene.m_nCurrentLevel+1>=nukeBossesAfterLevel&&(g_Minigame.m_CurrentScene.m_nCurrentLevel+1)%farmGoldOnBossesLevelDiff==0;if(0==t.m_data.type&&!o||(t.m_data.type=2&&o)){var s=hasAbility(5),l=hasAbility(6),u=hasAbility(18)&&autoUseConsumables;if(n>=90&&autoUseConsumables)hasAbility(14)?castAbility(14):hasAbility(15)&&castAbility(15);else if(s||u||l){var g=abilityIsUnlocked(5),c=abilityIsUnlocked(6);if(!g&&!u||!c||(s||u)&&l){var p=currentLaneHasAbility(9);(n>=70||p&&n>=60)&&(p||hasAbility(9)||!abilityIsUnlocked(9)||abilityCooldown(9)>60)&&(hasAbility(9)&&!currentLaneHasAbility(9)?(debug&&console.log("Triggering Decrease Cooldown!"),castAbility(9)):(u?(debug&&console.log("Using Crit!"),castAbility(18)):s&&(debug&&console.log("Casting Morale Booster!"),castAbility(5)),l&&(debug&&console.log("Casting Good Luck Charm!"),castAbility(6))))}}hasAbility(10)&&(n>=useNukeOnSpawnerAbovePercent||2==t.m_data.type&&n>=useNukeOnBossAbovePercent)?(debug&&console.log("Nuclear launch detected."),castAbility(10)):0==t.m_data.type&&hasAbility(12)&&n>=useNukeOnSpawnerAbovePercent&&a.enemies.length>=4?(debug&&console.log("Triggering napalm!"),castAbility(12)):0==t.m_data.type&&hasAbility(11)&&n>=useNukeOnSpawnerAbovePercent&&a.enemies.length>=4&&(debug&&console.log("Triggering cluster bomb!"),castAbility(11))}else o||2!=t.m_data.type||hasAbility(17)&&autoUseConsumables&&n>useRainingGoldAbovePercent&&(debug&&console.log("Using Raining Gold on boss."),castAbility(17));var m=hasAbility(22)&&autoUseConsumables;(2==t.m_data.type||4==t.m_data.type)&&10>i&&(hasAbility(8)||m)&&(m?(debug&&console.log("Using Metal Detector via Treasure."),castAbility(22)):(debug&&console.log("Using Metal Detector."),castAbility(8)))}for(var d=0,_=0,b=1;10>b;b++){var A=10*(b-1)+5;d+=A*a.player_hp_buckets[b],_+=a.player_hp_buckets[b]}var y=d/_,f=_/(_+a.player_hp_buckets[0])*100;if((useMedicsAtPercent>=e||useMedicsAtLanePercent>=y&&f>useMedicsAtLanePercentAliveReq)&&!g_Minigame.m_CurrentScene.m_bIsDead){debug&&(useMedicsAtPercent>=e&&console.log("Health below threshold. Need medics!"),useMedicsAtLanePercent>=y&&f>useMedicsAtLanePercentAliveReq&&console.log("Average lane below threshold. Need medics!"));var h=hasAbility(19)&&autoUseConsumables,w=hasAbility(23)&&autoUseConsumables;!hasAbility(7)&&!h||currentLaneHasAbility(7)?w&&useMedicsAtPercent>=e?(debug&&console.log("Using Steal Health in place of Medics!"),castAbility(23)):debug&&console.log("No medics to unleash!"):h?(debug&&console.log("Using Medics via Pumped Up!"),castAbility(19)):(debug&&console.log("Using Medics!"),castAbility(7))}if(hasAbility(13)&&autoUseConsumables&&a.player_hp_buckets[0]<=useResurrectToSaveCount&&(debug&&console.log("Using resurrection to save "+a.player_hp_buckets[0]+" lane allies."),castAbility(13)),hasAbility(27)&&autoUseConsumables){for(var S=0,b=5;12>=b;b++)abilityIsUnlocked(b)&&(S+=abilityCooldown(b));1e3*S>=useLikeNewAboveCooldown&&(debug&&console.log("Using resurrection to save a total of "+S+" seconds of cooldown."),castAbility(27))}},abilityUseCheckFreq),void console.log("autoAbilityUser has been started."))}function startAutoItemUser(){autoUseConsumables=!0,console.log("Automatic use of consumables has been enabled.")}function startAllAutos(){startAutoClicker(),startAutoRespawner(),startAutoTargetSwapper(),startAutoAbilityUser(),startAutoUpgradeManager()}function stopAutoClicker(){autoClicker?(clearInterval(autoClicker),autoClicker=null,console.log("autoClicker has been stopped.")):console.log("No autoClicker is running to stop.")}function stopAutoRespawner(){autoRespawner?(clearInterval(autoRespawner),autoRespawner=null,console.log("autoRespawner has been stopped.")):console.log("No autoRespawner is running to stop.")}function stopAutoTargetSwapper(){autoTargetSwapper?(clearInterval(autoTargetSwapper),autoTargetSwapper=null,console.log("autoTargetSwapper has been stopped.")):console.log("No autoTargetSwapper is running to stop.")}function stopAutoAbilityUser(){autoAbilityUser?(clearInterval(autoAbilityUser),autoAbilityUser=null,console.log("autoAbilityUser has been stopped.")):console.log("No autoAbilityUser is running to stop.")}function stopAutoItemUser(){autoUseConsumables=!1,console.log("Automatic use of consumables has been disabled.")}function stopAutoUpgradeManager(){autoUpgradeManager?(clearInterval(autoUpgradeManager),autoUpgradeManager=null,g_Minigame.CurrentScene().m_rgPlayerUpgrades&&g_Minigame.CurrentScene().m_rgPlayerUpgrades.some(function(e){$J("#upgr_"+e.upgrade).length&&$J("#upgr_"+e.upgrade+" .upgrade a").removeAttr("style")}),console.log("autoUpgradeManager has been stopped.")):console.log("No autoUpgradeManager is running to stop.")}function stopAllAutos(){stopAutoClicker(),stopAutoRespawner(),stopAutoTargetSwapper(),stopAutoAbilityUser(),stopAutoItemUser(),stopAutoUpgradeManager()}function disableAutoNukes(){useNukeOnSpawnerAbovePercent=200,console.log("Automatic nukes have been disabled")}function castAbility(e){hasAbility(e)&&(12>=e&&null!=document.getElementById("ability_"+e)?g_Minigame.CurrentScene().TryAbility(document.getElementById("ability_"+e).childElements()[0]):null!=document.getElementById("abilityitem_"+e)&&g_Minigame.CurrentScene().TryAbility(document.getElementById("abilityitem_"+e).childElements()[0]))}function currentLaneHasAbility(e){return laneHasAbility(g_Minigame.CurrentScene().m_rgPlayerData.current_lane,e)}function laneHasAbility(e,t){return"undefined"==typeof g_Minigame.m_CurrentScene.m_rgLaneData[e].abilities[t]?0:g_Minigame.m_CurrentScene.m_rgLaneData[e].abilities[t]}function abilityIsUnlocked(e){return 12>=e?(1<<e&g_Minigame.CurrentScene().m_rgPlayerTechTree.unlocked_abilities_bitfield)>0:getAbilityItemQuantity(e)>0}function getAbilityItemQuantity(e){for(var t=0;t<g_Minigame.CurrentScene().m_rgPlayerTechTree.ability_items.length;++t){var a=g_Minigame.CurrentScene().m_rgPlayerTechTree.ability_items[t];if(a.ability==e)return a.quantity}return 0}function abilityCooldown(e){return g_Minigame.CurrentScene().GetCooldownForAbility(e)}function hasAbility(e){return abilityIsUnlocked(e)&&abilityCooldown(e)<=0}function updateUserElementMultipliers(){gameRunning()&&g_Minigame.m_CurrentScene.m_rgPlayerTechTree&&(userElementMultipliers[3]=g_Minigame.m_CurrentScene.m_rgPlayerTechTree.damage_multiplier_air,userElementMultipliers[4]=g_Minigame.m_CurrentScene.m_rgPlayerTechTree.damage_multiplier_earth,userElementMultipliers[1]=g_Minigame.m_CurrentScene.m_rgPlayerTechTree.damage_multiplier_fire,userElementMultipliers[2]=g_Minigame.m_CurrentScene.m_rgPlayerTechTree.damage_multiplier_water,userMaxElementMultiiplier=Math.max.apply(null,userElementMultipliers))}function getMobTypePriority(e){switch(mobType=e.m_data.type){case 0:return 0;case 3:return 1;case 2:return 2;case 4:return 3}return-Number.MAX_VALUE}function compareMobPriority(e,t){if(null==e)return!1;if(null==t)return swapReason="Swapping off a non-existent mob.",!0;var a=g_Minigame.CurrentScene().m_rgPlayerData.hp/g_Minigame.CurrentScene().m_rgPlayerTechTree.max_hp*100,n=laneHasAbility(e.m_nLane,7)||laneHasAbility(e.m_nLane,23),r=laneHasAbility(t.m_nLane,7)||laneHasAbility(t.m_nLane,23),i=laneHasAbility(e.m_nLane,17),o=laneHasAbility(t.m_nLane,17),s=getMobTypePriority(e),l=getMobTypePriority(t),u=userElementMultipliers[g_Minigame.m_CurrentScene.m_rgGameData.lanes[e.m_nLane].element],g=userElementMultipliers[g_Minigame.m_CurrentScene.m_rgGameData.lanes[t.m_nLane].element];laneHasAbility(e.m_nLane,16)&&(u=userMaxElementMultiiplier),laneHasAbility(t.m_nLane,16)&&(g=userMaxElementMultiiplier);var c=e.m_data.hp,p=t.m_data.hp;if(e.m_bIsDestroyed||0>=c)return!1;if(t.m_bIsDestroyed||0>=p)return swapReason="Swapping off a destroyed mob.",!0;if(seekHealingPercent>=a&&!g_Minigame.m_CurrentScene.m_bIsDead){if(n!=r&&n)return swapReason="Swapping to lane with active healing.",!0}else if(i!=o){if(i>o&&(3==t.m_data.type||1==t.m_data.type))return swapReason="Switching to target with Raining Gold.",!0}else if(s!=l){if(s>l)return swapReason="Switching to higher priority target.",!0}else if(u!=g){if(u>g)return swapReason="Switching to elementally weaker target.",!0}else if(c!=p&&p>c)return swapReason="Switching to lower HP target.",!0;return!1}function gameRunning(){try{return"object"==typeof g_Minigame&&2==g_Minigame.m_CurrentScene.m_rgGameData.status}catch(e){return!1}}function addPointer(){g_Minigame.m_CurrentScene.m_rgFingerTextures=[];for(var e=26,t=49,a=0;4>a;a++)for(var n=0;5>n;n++)g_Minigame.m_CurrentScene.m_rgFingerTextures.push(new PIXI.Texture(g_rgTextureCache.pointer.texture,{x:n*e,y:a*t,width:e,height:t}));g_Minigame.m_CurrentScene.m_nFingerIndex=0,g_Minigame.m_CurrentScene.m_spriteFinger=new PIXI.Sprite(g_Minigame.m_CurrentScene.m_rgFingerTextures[g_Minigame.m_CurrentScene.m_nFingerIndex]),g_Minigame.m_CurrentScene.m_spriteFinger.scale.x=g_Minigame.m_CurrentScene.m_spriteFinger.scale.y=2,g_Minigame.m_CurrentScene.m_containerParticles.addChild(g_Minigame.m_CurrentScene.m_spriteFinger)}function getTarget(){return g_Minigame.m_CurrentScene.GetEnemy(g_Minigame.m_CurrentScene.m_rgPlayerData.current_lane,g_Minigame.m_CurrentScene.m_rgPlayerData.target)}function updatePlayersInLane(){var e="???";g_Minigame.m_CurrentScene.m_rgLaneData[g_Minigame.m_CurrentScene.m_rgPlayerData.current_lane]&&(e=g_Minigame.m_CurrentScene.m_rgLaneData[g_Minigame.m_CurrentScene.m_rgPlayerData.current_lane].players),$J("#players_in_lane").html(e)}function updatePlayersInRoom(){var e="???";g_Minigame.m_CurrentScene.m_rgLaneData[0]&&(e=g_Minigame.m_CurrentScene.m_rgLaneData[0].players+g_Minigame.m_CurrentScene.m_rgLaneData[1].players+g_Minigame.m_CurrentScene.m_rgLaneData[2].players),$J("#players_in_room").html(e)}function addExtraUI(){addCustomButtons();var e=$J(".title_activity").html();$J(".title_activity").html(e+'&nbsp;[<span id="players_in_room">0</span> in room]')}function addCustomButtons(){$J('<div style="height: 52px; position: absolute; bottom: 85px; left: 828px; z-index: 12;" onclick="SmackTV();"><br><br><span style="font-size:10px; padding: 12px; color: gold;">Smack TV</span></div>').insertBefore("#row_bottom"),$J(".leave_game_btn").css({width:"125px","background-position":"-75px 0px",position:"absolute",bottom:"144px","z-index":"12",left:"340px"}),$J(".leave_game_helper").css({left:"150px",top:"-75px","z-index":"12"}),$J(".leave_game_btn").html('<span style="padding-right: 50px;">Close</span><br><span style="padding-right: 50px;">Game</span>'),$J(".toggle_music_btn").click(toggleMusic).attr("id","toggleMusicBtn"),$J("#toggleMusicBtn").html("<span>"+(WebStorage.GetLocal("minigame_mutemusic")?"Enable":"Disable")+" Music</span>"),$J(".toggle_sfx_btn").click(toggleSFX).attr("id","toggleSFXBtn"),$J("#toggleSFXBtn").html("<span>"+(WebStorage.GetLocal("minigame_mute")?"Enable":"Disable")+" SFX</span>"),$J("#toggleMusicBtn").after('<span id="toggleAllSoundBtn" class="toggle_music_btn" style="display:inline-block;"><span>'+(bIsMuted()?"Enable":"Disable")+" All Sound</span></span>"),$J("#toggleAllSoundBtn").click(toggleAllSound),$J(".game_options").after('<div class="game_options" id="auto_options"></div>'),$J("#auto_options").append('<span id="toggleAutoClickerBtn" class="toggle_music_btn" style="display:inline-block;margin-left:6px"><span>Disable AutoClicker</span></span>'),$J("#toggleAutoClickerBtn").click(toggleAutoClicker),$J("#auto_options").append('<span id="toggleAutoTargetSwapperBtn" class="toggle_music_btn" style="display:inline-block;"><span>Disable Target Swap</span></span>'),$J("#toggleAutoTargetSwapperBtn").click(toggleAutoTargetSwapper),$J("#auto_options").append('<span id="toggleAutoAbilityUserBtn" class="toggle_music_btn" style="display:inline-block;"><span>Disable Ability/Item Use</span></span>'),$J("#toggleAutoAbilityUserBtn").click(toggleAutoAbilityUser),$J("#auto_options").append('<span id="toggleAutoItemUserBtn" class="toggle_music_btn" style="display:inline-block;"><span>Disable Auto Consumable Use</span></span>'),$J("#toggleAutoItemUserBtn").click(toggleAutoItemUser),$J("#auto_options").append('<span id="toggleAutoUpgradeBtn" class="toggle_music_btn" style="display:inline-block;"><span>Disable Upgrader</span></span>'),$J("#toggleAutoUpgradeBtn").click(toggleAutoUpgradeManager),$J("#auto_options").append('<span id="toggleSpammerBtn" class="toggle_music_btn" style="display:inline-block;"><span>Enable Particle Spam</span></span>'),$J("#toggleSpammerBtn").click(toggleSpammer);var e=document.querySelector(".breadcrumbs");if(e){var t=document.createElement("span");t.textContent=" > ",e.appendChild(t),t=document.createElement("span"),t.style.color="#D4E157",t.style.textShadow="1px 1px 0px rgba( 0, 0, 0, 0.3 )",t.textContent="Room "+g_GameID,e.appendChild(t)}}function toggleSFX(){var e=WebStorage.GetLocal("minigame_mute");e?WebStorage.SetLocal("minigame_mute",!0):WebStorage.SetLocal("minigame_mute",!1),updateSoundBtnText()}function toggleMusic(){var e=WebStorage.GetLocal("minigame_mutemusic");e?(WebStorage.SetLocal("minigame_mutemusic",!0),g_AudioManager.m_eleMusic.pause()):(WebStorage.SetLocal("minigame_mutemusic",!1),g_AudioManager.m_eleMusic.play()),updateSoundBtnText()}function toggleAllSound(){bIsMuted()?(WebStorage.SetLocal("minigame_mute",!1),WebStorage.SetLocal("minigame_mutemusic",!1),g_AudioManager.m_eleMusic.play()):(WebStorage.SetLocal("minigame_mute",!0),WebStorage.SetLocal("minigame_mutemusic",!0),g_AudioManager.m_eleMusic.pause()),updateSoundBtnText()}function updateSoundBtnText(){$J("#toggleSFXBtn").html("<span>"+(WebStorage.GetLocal("minigame_mute")?"Enable":"Disable")+" SFX</span>"),$J("#toggleMusicBtn").html("<span>"+(WebStorage.GetLocal("minigame_mutemusic")?"Enable":"Disable")+" Music</span>"),$J("#toggleAllSoundBtn").html("<span>"+(bIsMuted()?"Enable":"Disable")+" All Sound</span>")}function toggleAutoClicker(){autoClicker?(stopAutoClicker(),$J("#toggleAutoClickerBtn").html("<span>Enable AutoClicker</span>")):(startAutoClicker(),$J("#toggleAutoClickerBtn").html("<span>Disable AutoClicker</span>"))}function toggleAutoTargetSwapper(){autoTargetSwapper?(stopAutoTargetSwapper(),$J("#toggleAutoTargetSwapperBtn").html("<span>Enable Target Swap</span>")):(startAutoTargetSwapper(),$J("#toggleAutoTargetSwapperBtn").html("<span>Disable Target Swap</span>"))}function toggleAutoAbilityUser(){autoAbilityUser?(stopAutoAbilityUser(),$J("#toggleAutoAbilityUserBtn").html("<span>Enable Ability/Item</span>")):(startAutoAbilityUser(),$J("#toggleAutoAbilityUserBtn").html("<span>Disable Ability/Item</span>"))}function toggleAutoItemUser(){autoUseConsumables?(stopAutoItemUser(),$J("#toggleAutoItemUserBtn").html("<span>Enable Auto Consumable Use</span>")):(startAutoItemUser(),$J("#toggleAutoItemUserBtn").html("<span>Disable Auto Consumable Use</span>"))}function toggleAutoUpgradeManager(){autoUpgradeManager?(stopAutoUpgradeManager(),$J("#toggleAutoUpgradeBtn").html("<span>Enable Upgrader</span>")):(startAutoUpgradeManager(),$J("#toggleAutoUpgradeBtn").html("<span>Disable Upgrader</span>"))}function spamNoClick(){var e=g_Minigame.m_CurrentScene.m_nClicks;g_Minigame.m_CurrentScene.DoClick({data:{getLocalPosition:function(){var e=getTarget(),t=440*e.m_nLane;return{x:e.m_Sprite.position.x-t,y:e.m_Sprite.position.y-52}}}}),g_Minigame.m_CurrentScene.m_nClicks=e}function toggleSpammer(){spammer?(clearInterval(spammer),spammer=null,$J("#toggleSpammerBtn").html("<span>Enable Particle Spam</span>")):confirm("Are you SURE you want to do this? This leads to massive memory leaks farly quickly.")&&(spammer=setInterval(spamNoClick,1e3/clicksPerSecond),$J("#toggleSpammerBtn").html("<span>Disable Particle Spam</span>"))}var debug=!1,clicksPerSecond=g_TuningData.abilities[1].max_num_clicks,autoClickerVariance=Math.floor(clicksPerSecond/10);clicksPerSecond-=Math.ceil(autoClickerVariance/2);var respawnCheckFreq=5e3,targetSwapperFreq=1e3,abilityUseCheckFreq=2e3,itemUseCheckFreq=5e3,seekHealingPercent=20,upgradeManagerFreq=5e3,autoBuyAbilities=!1,nukeBossesAfterLevel=1e3,farmGoldOnBossesLevelDiff=200,useNukeOnBossAbovePercent=25,useMedicsAtPercent=30,useMedicsAtLanePercent=40,useMedicsAtLanePercentAliveReq=40,useNukeOnSpawnerAbovePercent=75,useMetalDetectorOnBossBelowPercent=30,useStealHealthAtPercent=15,useRainingGoldAbovePercent=75,useLikeNewAboveCooldown=1422e4,useResurrectToSaveCount=150,autoClickerFreq=1e3,autoRespawner,autoClicker,autoTargetSwapper,autoTargetSwapperElementUpdate,autoAbilityUser,autoUpgradeManager,elementUpdateRate=6e4,autoUseConsumables=!0,userElementMultipliers=[1,1,1,1],userMaxElementMultiiplier=1,swapReason,upgradeManagerPrefilter;if(upgradeManagerPrefilter||$J.ajaxPrefilter(function(){void 0!==upgradeManagerPrefilter&&upgradeManagerPrefilter.apply(this,arguments)}),"undefined"!=typeof unsafeWindow){unsafeWindow.debug=debug,unsafeWindow.clicksPerSecond=clicksPerSecond,unsafeWindow.autoClickerVariance=autoClickerVariance,unsafeWindow.respawnCheckFreq=respawnCheckFreq,unsafeWindow.targetSwapperFreq=targetSwapperFreq,unsafeWindow.abilityUseCheckFreq=abilityUseCheckFreq,unsafeWindow.itemUseCheckFreq=itemUseCheckFreq,unsafeWindow.seekHealingPercent=seekHealingPercent,unsafeWindow.upgradeManagerFreq=upgradeManagerFreq,unsafeWindow.autoBuyAbilities=autoBuyAbilities,unsafeWindow.useMedicsAtPercent=useMedicsAtPercent,unsafeWindow.useMedicsAtLanePercent=useMedicsAtLanePercent,unsafeWindow.useMedicsAtLanePercentAliveReq=useMedicsAtLanePercentAliveReq,unsafeWindow.useNukeOnSpawnerAbovePercent=useNukeOnSpawnerAbovePercent,unsafeWindow.useMetalDetectorOnBossBelowPercent=useMetalDetectorOnBossBelowPercent,unsafeWindow.useStealHealthAtPercent=useStealHealthAtPercent,unsafeWindow.useRainingGoldAbovePercent=useRainingGoldAbovePercent,unsafeWindow.slaveWindowUICleanup=slaveWindowUICleanup,unsafeWindow.slaveWindowPeriodicRestart=slaveWindowPeriodicRestart,unsafeWindow.slaveWindowPeriodicRestartInterval=slaveWindowPeriodicRestartInterval,unsafeWindow.nukeBossesAfterLevel=nukeBossesAfterLevel,unsafeWindow.farmGoldOnBossesLevelDiff=farmGoldOnBossesLevelDiff,unsafeWindow.useNukeOnBossAbovePercent=useNukeOnBossAbovePercent,unsafeWindow.startAutoClicker=startAutoClicker,unsafeWindow.startAutoRespawner=startAutoRespawner,unsafeWindow.startAutoTargetSwapper=startAutoTargetSwapper,unsafeWindow.startAutoAbilityUser=startAutoAbilityUser,unsafeWindow.startAutoItemUser=startAutoItemUser,unsafeWindow.startAllAutos=startAllAutos,unsafeWindow.startAutoUpgradeManager=startAutoUpgradeManager,unsafeWindow.stopAutoClicker=stopAutoClicker,unsafeWindow.stopAutoRespawner=stopAutoRespawner,unsafeWindow.stopAutoTargetSwapper=stopAutoTargetSwapper,unsafeWindow.stopAutoAbilityUser=stopAutoAbilityUser,unsafeWindow.stopAutoItemUser=stopAutoItemUser,unsafeWindow.stopAutoUpgradeManager=stopAutoUpgradeManager,unsafeWindow.stopAllAutos=stopAllAutos,unsafeWindow.disableAutoNukes=disableAutoNukes,unsafeWindow.castAbility=castAbility,unsafeWindow.hasAbility=hasAbility,unsafeWindow.abilityIsUnlocked=abilityIsUnlocked,unsafeWindow.abilityCooldown=abilityCooldown,unsafeWindow.toggleAutoClicker=toggleAutoClicker,unsafeWindow.toggleAutoTargetSwapper=toggleAutoTargetSwapper,unsafeWindow.toggleAutoAbilityUser=toggleAutoAbilityUser,unsafeWindow.toggleAutoItemUser=toggleAutoItemUser,unsafeWindow.toggleAutoUpgradeManager=toggleAutoUpgradeManager,unsafeWindow.spamNoClick=spamNoClick,unsafeWindow.toggleSpammer=toggleSpammer;var varSetter=setInterval(function(){debug&&console.log("updating options"),debug=unsafeWindow.debug,clicksPerSecond=unsafeWindow.clicksPerSecond,autoClickerVariance=unsafeWindow.autoClickerVariance,respawnCheckFreq=unsafeWindow.respawnCheckFreq,targetSwapperFreq=unsafeWindow.targetSwapperFreq,abilityUseCheckFreq=unsafeWindow.abilityUseCheckFreq,itemUseCheckFreq=unsafeWindow.itemUseCheckFreq,seekHealingPercent=unsafeWindow.seekHealingPercent,upgradeManagerFreq=unsafeWindow.upgradeManagerFreq,autoBuyAbilities=unsafeWindow.autoBuyAbilities,useMedicsAtPercent=unsafeWindow.useMedicsAtPercent,useMedicsAtLanePercent=unsafeWindow.useMedicsAtLanePercent,useMedicsAtLanePercentAliveReq=unsafeWindow.useMedicsAtLanePercentAliveReq,useNukeOnSpawnerAbovePercent=unsafeWindow.useNukeOnSpawnerAbovePercent,useMetalDetectorOnBossBelowPercent=unsafeWindow.useMetalDetectorOnBossBelowPercent,useStealHealthAtPercent=unsafeWindow.useStealHealthAtPercent,useRainingGoldAbovePercent=unsafeWindow.useRainingGoldAbovePercent,nukeBossesAfterLevel=unsafeWindow.nukeBossesAfterLevel,farmGoldOnBossesLevelDiff=unsafeWindow.farmGoldOnBossesLevelDiff,useNukeOnBossAbovePercent=unsafeWindow.useNukeOnBossAbovePercent},5e3);unsafeWindow.getDebug=function(){return debug},unsafeWindow.setDebug=function(e){debug=e}}var startAll=setInterval(function(){gameRunning()&&(clearInterval(startAll),startAllAutos(),addPointer(),addExtraUI(),updatePlayersInLane(),updatePlayersInRoom(),setInterval(function(){updatePlayersInRoom()},1e4),$J(".leave_game_btn").mouseover(function(){$J(".leave_game_helper").show()}).mouseout(function(){$J(".leave_game_helper").hide()}),$J(".leave_game_helper").hide(),"function"==typeof runMaster&&(location.search.match(/slave/)?runSlave():runMaster()),CSceneGame.prototype.ClearNewPlayer=function(){if(this.m_spriteFinger){{WebStorage.SetLocal("mg_how2click",1)}$J("#newplayer").hide()}})},1e3),spammer;