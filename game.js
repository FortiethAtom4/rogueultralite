const prompt = require("prompt-sync")();
const fs = require("fs");
 
/*
*
*
*
* A turn-based text action game made in Javascript.
* Try to beat all eight rounds of enemies.
* To run, type 'node game.js' at the command line while in this directory.
* Good luck!
*
*
*
*
*/
 
//Player entity.
function Player(pname,health,dmg){
    this.username = pname;
    this.health = health;
    this.maxhealth = health;
    this.dmg = dmg;
    /* 3-tuple legend for player abilities:
    0: Name, string
    1: Value, number (damage amt, heal amt, etc)
    2: Option (scaling number for heal/fireball, charges for mana burst)
    3+: Other options
    */
    this.abilities = [["Heal",1,1.5],["Fireball",1,3],["Mana Burst",10,1,3],["Entropy",5,0,2]];
    this.alive = true;
    this.blocking = false;
    this.block_power = 2; //block power = 1/block_value
    this.thorns = 0; //damage enemy takes for hitting a blocked player
}
thorns_increase = 4; //amount to increase thorns by with upgrades. Increases over time.
//Enemy entity.
function Enemy(ename, health, dmg, abilities, AI_type){
    this.username = ename;
    this.health = health;
    this.maxhealth = health;
    this.dmg = dmg;
    this.abilities = abilities;
    this.AI_type = AI_type;
    this.alive = true;
    this.blocking = false;
    this.dummy = 0; //dummy value to be used for variables or other fun stuff (right now only used by summoners)
    this.block_power = 2;
    this.thorns = 0;
}
console.log("CONTROLS:")
console.log("Q: Attack \nW: Block \nE: Ability \nR: Pass (don't pass)")
let player_name = prompt("Type your username: ");
let p1 = new Player(player_name,3,1);
 
//global variables (cringe)
let round = 0; //determines enemy spawns/difficulty
let turn = 1;
let totalturns = 0;
let enemies = [];
let game_log = "";
let chosen_upgrades = "N/A";
let upgrade_array = [0,0,0,0,0]; //heal, fireball, mana burst, attack, block
let win = false;
 
if(p1.username == "godmode"){
    p1.health = p1.maxhealth = 20000;
    p1.dmg = 1000;
}
//date the game log
let d = new Date();
let mm = d.getMinutes();
if(d.getMinutes() < 10){
    mm = "0" + d.getMinutes();
}
let gamedate = (d.getMonth() + 1) + "/"
+ d.getDate()  + "/"
+ d.getFullYear() + " "
+ d.getHours() + ":"  
+ mm;
//Makes sure the prompt is a valid number for array-related choices (abilities, enemy targeting).
function getprompt(string,arraylength){
    let result = prompt(string);
    while(Number.isNaN(Number(result)) || result < 1 || result > arraylength){
        console.log("Error: Invalid input, please try again.")
        result = prompt(string);
    }
    return result - 1;
}
//Recognize player error for inputting commands
function cmdprompt(string,entity){
    let command = prompt(string);
    console.log("\n");
    inputCommand(entity,command);
}
//Alternate print function which saves the print statement. Used for logging game history.
function printlog(string){
    game_log += string + "\n";
    console.log(string);
}
 
//function for thorns damage received by enemy when attacking blocking player.
function attackThorns(attacker,target){
    attacker.health -= target.thorns;
    printlog(`-> ${attacker.username} took ${target.thorns} damage for attacking a blocking target!`);
    if(attacker.health <= 0){
        attacker.health = 0;
        attacker.alive = false;
    }
}
 
//Standard attack function. Deals damage, less (1/2 by default) if target blocks.
// Optional params available.
function attack(attacker,target,changedmg = 0,blockAllowed = true){
    let attackdamage = attacker.dmg;
    if(changedmg != 0){
        attackdamage = changedmg;
    }
    //blocking reduces damage by half
    if(target.blocking && blockAllowed){
        attackdamage = attackdamage/target.block_power;
    }
    attackdamage = Math.round(attackdamage*2)/2;
    target.health -= attackdamage;
 
    //probably a better way to do this logically. But fine. Another if condition.
    printlog(`-> ${attacker.username} dealt ${attackdamage} damage to ${target.username}!`);
    if(target.blocking && blockAllowed && target.thorns != 0){
        attackThorns(attacker,target);
    }
 
    if(target.health <= 0){
        target.health = 0;
        target.alive = false;
    }
 
}
 
//add Entropy for using offensive abilities.
//used for generating Mana Bursts.
//for the player, entropyIndex is 3.
function gainEntropy(entity = p1, entropyIndex = 3, manaBurstIndex = 2, add = 1){
    //structure: ["Entropy",[damage],[curCharges],[manaBurstIndex]]
    entity.abilities[entropyIndex][2] += add;
    printlog(`-> ${entity.username}'s Entropy rose by ${add}!`);
 
    //if entropy reaches 10, subtract 10 and add a charge of Mana Burst.
    if(entity.abilities[entropyIndex][2] >= 10){
        entity.abilities[entropyIndex][2] -= 10;
        entity.abilities[manaBurstIndex][2] += 1;
 
        console.log(`${entity.username}'s Entropy overflowed!`);
        printlog(`-> ${entity.username} gained a charge of Mana Burst! Total charges: ${entity.abilities[manaBurstIndex][2]}`);
    }
 
}
//Function which handles player ability upgrades after rounds 3 and 5. Doubles a stat.
//If Mana Burst is chosen, grants an extra charge.
//Entropy cannot be upgraded.
//An upgrade to a specific stat/ability can only chosen twice max.
function abilityUpgrade(){
    printlog(`Congratulations, ${p1.username}! You have earned a stat upgrade!`);
    console.log("Upgrade Options:");
    let i = 0;
    for(i; i < p1.abilities.length; i++){
        if(p1.abilities[i][0] == "Entropy"){continue;}
        console.log(`${i + 1}: Empowered ${p1.abilities[i][0]} ${(upgrade_array[i] > 1) ? "MAX LEVEL" : ""}`);
    }
    console.log(`${i}: Stronger Attacks ${(upgrade_array[i - 1] > 1) ? "MAX LEVEL" : ""}`);
    console.log(`${i + 1}: Increased Resistances ${(upgrade_array[i] > 1) ? "MAX LEVEL" : ""}`);
    let choice = getprompt('\nChoose an upgrade by typing in the corresponding number: ',p1.abilities.length + 2);
    while(upgrade_array[choice] > 1){
        console.log("That upgrade is max level and can not be upgraded further.");
        choice = getprompt('\nChoose an upgrade by typing in the corresponding number: ',p1.abilities.length + 2);
    }
    upgrade_array[choice] += 1;
    if(choice == 3){
        p1.dmg = p1.dmg * 2;
        chosen_upgrades += "Stronger Attacks";
        printlog(`-> ++ Attack damage increased to ${p1.dmg}.`)
        return;
    }
    if(choice == 4){
        p1.maxhealth = p1.maxhealth * 2;
        p1.health = p1.maxhealth;
        chosen_upgrades += "Increased Resistances";
        printlog(`-> ++ Maximum health increased to ${p1.maxhealth}.`);
        p1.block_power += 1;
        printlog(`-> ++ Blocking damage reduction increased to ${Math.round((1-(1/p1.block_power))*100)}%.`)
        p1.thorns += thorns_increase;
        thorns_increase += 2;
        printlog(`-> ++ Successfully blocking now deals ${p1.thorns} damage to the attacker.`)
        return;
    }
    chosen_upgrades += "Empowered " + p1.abilities[choice][0];
    printlog('\n');
    if(p1.abilities[choice][0] == "Mana Burst"){
        p1.abilities[choice][2] += 1;
        printlog(`-> Gained one charge of Mana Burst. Total charges: ${p1.abilities[choice][2]}`)
    }
    p1.abilities[choice][1] = p1.abilities[choice][1] * 2;
    printlog(`-> ++ ${p1.abilities[choice][0]} strength increased to ${p1.abilities[choice][1]}.`);
}
//Spawns a specific set of enemies for each round.
function spawn(){
    switch(round){
        case 1:
            enemies.push(new Enemy("Grunt",1,1,[],"aggro"));
            break;
        case 2:
            enemies.push(new Enemy("Defensive Enemy",5,1,[],"defensive"));
            enemies.push(new Enemy("Grunt",3,1,[],"aggro"));
            break;
        case 3:
            enemies.push(new Enemy("Healer",15,0,[["Heal", 2]],"caster"));
            enemies.push(new Enemy ("Shielder",15,5,[["Charge",1],["Defend"],["Defend"]],"defender"));
            break;
        case 4:
            chosen_upgrades = "";
            abilityUpgrade();
            enemies.push(new Enemy("Wizard",25,0,[["Fireball",4]],"aggrocaster"));
            enemies.push(new Enemy("Healer",25,0,[["Heal", 3],["Defend"]],"aggrocaster"));
            enemies.push(new Enemy("Shielder",40,5,[["Defend"]],"defender"));
            break;
 
        case 5:
            enemies.push(new Enemy("Boss",60,5,[["Fireball",5],["Fireball",5],["Heal",10]],"spellsword"));
            break;
 
        case 6:
            //another ability upgrade after round 5.
            chosen_upgrades += ", ";
            abilityUpgrade();
            console.log("It only gets harder from here...");
            // summonenemy = new Enemy("Minion",5,1,[],"defensive"); - template for minion
            enemies.push(new Enemy("Minion",10,3,[],"defensive"));
            enemies.push(new Enemy("Summoner",200,0,[
                ["Summon",new Enemy("Minion",15,5,[],"aggro")],
                ["Summon",new Enemy("Minion",15,5,[],"aggro")],
                ["Summon",new Enemy("Tank Minion",30,3,[["Defend"]],"defender")],
                ["Summon",new Enemy("Wizard Minion",15,0,[["Fireball",5]],"aggrocaster")]],
                "summoner"));
            enemies.push(new Enemy("Minion",10,3,[],"defensive"));
            break;
 
        case 7:
            //The multiple Fireballs in the Apprentice's ability array will make him much more likely
            //to cast Fireball than Summon. (for the sake of avoiding frustrating encounters.)
            enemies.push(new Enemy("Wizard Lord",300,0,[["Empower",10,1],["Fireball",10],["Magecraft",2],
            ["Summon",new Enemy("Wizard's Familiar",10,0,[["Magecraft",2]],"aggrocaster")]],"summoner"))
            enemies.push(new Enemy("Wizard Lord's Apprentice",200,5,[["Fireball",1],["Fireball",1],["Fireball",1],["Fireball",1],
            ["Summon", new Enemy("Apprentice's Familiar",5,0,[["Magecraft",1],["Empower",5,1]],"aggrosummoner")]],"spellsword"))
            break;
 
        case 8:
            chosen_upgrades += ", ";
            abilityUpgrade();
            //The two identical Magecrafts in Augury's ability array will, in practice,
            //make it prefer to cast Magecraft over its other abilities.
            //Its massive Fireball will be that much more of a surprise...
            enemies.push(new Enemy("Apathy",300,0,[["Fireball",10],["Mana Burst",5,5],["Entropy",5,0,1]],"aggrosummoner"));
            enemies.push(new Enemy("Augury",300,0,[["Magecraft",3],["Magecraft",3],["Fireball",30]],"summoner"));
            enemies.push(new Enemy("Empathy",300,0,[["Defend"],["Defend"],["Magecraft",1]],"aggrosummoner"));
            enemies[2].dummy += 1; //Offsets Empathy's loop from the other bosses' loops. Spices up gameplay.
            break;
 
        case 9:
            //https://eddmann.com/posts/ten-ways-to-reverse-a-string-in-javascript/
            function reverse(s) {
                return (s === '') ? '' : reverse(s.substr(1)) + s.charAt(0);
            }
            enemies.push(new Enemy(reverse(p1.username),p1.maxhealth,p1.dmg,structuredClone(p1.abilities),"mirror"));
            enemies[0].block_power = p1.block_power;
            enemies[0].thorns = p1.thorns;
 
            console.log("")
            console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n"+
                        "~~~~~~~~~~ Beware. Your greatest opponent approaches. ~~~~~~~~~~\n"+
                        "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
            break;
 
        default:
            win = true;
    }
}
//Function which determines how an enemy behaves based on its AI_type keyword.
function enemyAI(enemy){
    let block_prob; //decimal percent chance to block
    let cast_prob; //decimal percent chance to cast an ability
    let choice;
    let attacker = true;
    switch (enemy.AI_type){
        //aggro enemies will only attack.
        case "aggro":
            block_prob = 0;
            cast_prob = 0;
            break;
        //defensive enemies will occasionally block instead of attacking.
        case "defensive":
            if(enemy.health < enemy.maxhealth / 2){
                block_prob = 0.5;
            } else {
                block_prob = 0.25;
            }
            cast_prob = 0;
            break;
        //defender enemies block and cast abilities often. They rarely attack.
        case "defender":
            cast_prob = 0.5;
            block_prob = 0.4;
            break;
        //caster enemies will use abilities or occasionally take a defensive stance.
        //casters do not attack.
        case "caster":
            if(enemy.health < enemy.maxhealth / 2){
                block_prob = 0.2;
            } else {
                block_prob = 0;
            }
            cast_prob = 0.5;
            attacker = false;
            break;
        //aggrocasters only use abilities.
        case "aggrocaster":
            block_prob = 0;
            cast_prob = 1;
            attacker = false;
            break;
        //Summoners are a special class which casts abilities only on specific turns.
        //They do not attack or pass.
        case "summoner":
            enemy.dummy += 1;
            if(enemy.dummy % 3 == 0){
                cast_prob = 1;
                block_prob = 0;
            }else{
                block_prob = 1;
                cast_prob = 0;
            }
            attacker = false;
            break;
 
        //Aggrosummoners cast spells much faster than summoners,
        //but on a similar fixed cycle of turns.
        //They do not attack or block.
        case "aggrosummoner":
            enemy.dummy += 1;
            block_prob = 0;
            cast_prob = 0;
            if(enemy.dummy % 2 == 0){
                cast_prob = 1;
            }
            attacker = false;
            break;
        //spellswords can attack, block, and use abilities. They do not pass.
        case "spellsword":
            block_prob = 1/4;
            cast_prob = 1/2;
            break;
 
        //The mirror AI is set aside for the final fight.
        //The player's upgrade choices during the game determine mirror's move probabilities.
        //Max probabilities:
        //Attacking: 53.333% chance (max 2 attack upgrades chosen)
        //Spellcasting: 80% chance (any 3 ability upgrades chosen)
        //Blocking: 53.333% (max 2 resistance upgrades chosen)
        //This AI does not pass.
        case "mirror":
            //get total number of upgrades player has made so far (3 max as of 5/2/24)
            printlog(`-[@] ${enemy.username} has adapted to your fighting style...`)
            let total_upgrades = upgrade_array.reduce((a,b) => a + b,0);
            //[heal,fireball,mana burst,attack,block]
            cast_prob = (upgrade_array[0] + upgrade_array[1] + upgrade_array[2])/(total_upgrades * 1.25);
            block_prob = upgrade_array[4]/(total_upgrades * 1.25);
            break
 
        //dummy AI for testing. Does nothing.
        case "none":
            attacker = false;
            cast_prob = 0;
            block_prob = 0;
            break;
        default:
            console.error("Warning: enemy AI not recognized.");
            attacker = false;
            cast_prob = 0;
            block_prob = 0;
            break;
    }
    //choose what the enemy does based on their "AI" probabilities.
    choice = Math.random();
    if(choice < block_prob){
        return "block";
    }
    if(choice > 1 - cast_prob){
        return "ability";
    }
    if(attacker){
        return "attack";
    }
    return "none";
}
//Display function
function displayHealthBar(entity){
    process.stdout.write(`HP: ${entity.health}\n[`);
    let ratio = entity.health/entity.maxhealth;
    for(let i = 0; i < 30; i++){
        if(i/30 < ratio){
            process.stdout.write('\u2588');
        }else{
            process.stdout.write(" ");
        }
    }
    process.stdout.write(']\n');
}
//Display function
function displayEnemies(){
    for(let i = 0; i < enemies.length; i++){
        console.log(`${i + 1}: ${enemies[i].username}`);
        displayHealthBar(enemies[i]);
    }
    console.log();
}
//Display function
function displayEnemiesNoHealthBar(){
    for(let i = 0; i < enemies.length; i++){
        console.log(`${i + 1}: ${enemies[i].username}`);
    }
    console.log();
}
//Function for getting player's choice of enemy to target with an attack/ability.
function chooseTarget(){
    if(enemies.length == 1){
        return 0;
    }
    displayEnemiesNoHealthBar();
    return getprompt("Type the number of the enemy you wish to target: ",enemies.length);
}
//Performs the entity's chosen action based on a string keyword.
//Current keyword list: attack, block, ability, ff, none
function inputCommand(entity,command){
    switch(command.toLowerCase()){
        //attack opponent
        case "q":
        case "attack":
            let target;
            if(entity != p1){
                target = p1;
            }else{
                let choseEnemy = enemies[chooseTarget()];
                target = choseEnemy;
            }
            printlog(`-> ${entity.username} attacked ${target.username}!`);
            attack(entity,target);
            if(entity == p1 || (target == p1 && p1.blocking)){gainEntropy();}
            break;
        //block
        case "w":
        case "block":
            entity.blocking = true;
            printlog(`-> ${entity.username} enters a defensive stance!`)
            break;
        //use an ability
        case "e":
        case "ability":
            useAbility(entity);
            break;
        //player surrender
        case "ff":
            p1.alive = false;
            printlog("X You surrendered.");
            break;
        //pass
        case "r":
        case "none":
            printlog(`-> ${entity.username} passed this turn!`)
            break;
        default:
            console.log("X Unknown command, please try again.")
            cmdprompt("Choose your command: attack [Q], block [W], ability [E], none [R], ff: ",entity);
            break;
    }
}
//Ability choice function for player and enemies.
//Ability effects are resolved in method abilityEffect().
function useAbility(entity){
    if(entity != p1){ //enemies use random abilities.
        let abilityUsed = Math.trunc(Math.random()*entity.abilities.length);
        abilityEffect(entity,abilityUsed);
    } else{ //prompt for player to choose an ability to use.
        let p1choice;
        if(p1.abilities.length == 1){
            p1choice = 0;
        }else{
            console.log("List of abilities:");
            for(let i = 0; i < p1.abilities.length; i++){
                console.log(`${i + 1}: ${p1.abilities[i][0]}`);
            }
            p1choice = getprompt('\nChoose an ability by typing in the corresponding number: ',p1.abilities.length)
        }
        abilityEffect(p1,p1choice);
    }
}
//Processes ability effects.
//Recognized ability names: Heal, Charge, Fireball, Entropy, Defend, Mana Burst, Summon, Empower, Magecraft
function abilityEffect(entity,abilityUsed){
    let target; //entity the ability targets.
    switch(entity.abilities[abilityUsed][0]){
 
        //Entity chooses a target to regain hitpoints.
        //Target is self if used by player.
        case "Heal":
            if(entity === p1){
                target = p1;
            }else{
                target = Math.random()*enemies.length;
                // console.log(target); //check if rand works properly
                target = Math.trunc(target);
                target = enemies[target];
            }
            heal(target,entity.abilities[abilityUsed][1]);
            printlog(`-> ${entity.username} healed ${target.username} ${entity.abilities[abilityUsed][1]} HP!`)
            break;
        //Entity casts a Fireball, which deals 0 damage if the target blocks.
        case "Fireball":
            if(entity == p1){
                target = enemies[chooseTarget()];
            }else{
                target = p1;
            }
            printlog(`-> ${entity.username} casts a Fireball!`);
            if(target.blocking){
                heal(target,1);
                printlog(`-> ${target.username} blocked the Fireball!`);
                printlog(`-> ${target.username} gained 1 HP for blocking the attack!`)
                if(target.thorns != 0){attackThorns(entity,target);}
                if(target == p1){gainEntropy();}
            } else {
                attack(entity,target,entity.abilities[abilityUsed][1]);
                if(entity == p1) {gainEntropy();}
            }
            break;
        //Entity passes the turn, but increases their attack damage permanently.
        //Enemy-only; player can easily exploit this to gain infinite attack on certain rounds.
        case "Charge":
            entity.dmg += entity.abilities[abilityUsed][1];
            printlog(`-> ${entity.username} charges their attack!`);
            printlog(`-> ${entity.username}'s attack increases by ${entity.abilities[abilityUsed][1]}!`);
            break;
 
        //Entity blocks for an ally. Enemy-only ability (since player has no allies).
        //Enemies will try not to use Defend on entities that are already blocking.
        //Should their attempts fail, they will simply Defend a random enemy regardless
        //of whether they are blocking or not.
        case "Defend":
            let i = 0;
            do {
                target = enemies[Math.trunc(Math.random()*enemies.length)];
                i += 1
            } while(target.blocking && i < 10);
            target.blocking = true;
            printlog(`-> ${entity.username} places a shield on ${target.username}!`);
            break;
 
        //Entity summons a minion to their aid. Enemy-only for now.
        case "Summon":
            //assumes second item in tuple is the entity to be summoned.
            //creates a copy of enemy to summon
            let summonentity = structuredClone(entity.abilities[abilityUsed][1]);
            enemies.push(summonentity);
            printlog(`-> ${entity.username} summons ${summonentity.username}!`)
            break;
 
        //Entity deals damage to a target which ignores blocking.
        //Has a limited number of uses (determined by the third value in the array).
        case "Mana Burst":
            if(entity.abilities[abilityUsed][2] > 0){
                if(entity == p1){
                    target = enemies[chooseTarget()];
                }else{
                    target = p1;
                }
                printlog(`-> ${entity.username} used a Mana Burst on ${target.username}!`);
                attack(entity,target,entity.abilities[abilityUsed][1],false);
                entity.abilities[abilityUsed][2] -= 1;
                printlog(`-> ${entity.username} has ${entity.abilities[abilityUsed][2]} Mana Bursts remaining.`);
            } else{
                printlog(`-X ${entity.username} attempted to use a Mana Burst, but had none left.`);
            }
            break;
 
        //Increase health, maximum health, and damage of an ally.
        //health and maxhealth are second value, damage is third.
        //Enemy-only (for the same reasons as Charge).
        case "Empower":
            if(entity == p1){
                target = p1;
            }else{
                target = enemies[Math.trunc(Math.random()*enemies.length)];
            }
            target.maxhealth += entity.abilities[abilityUsed][1];
            heal(target,entity.abilities[abilityUsed][1]);
            target.dmg += entity.abilities[abilityUsed][2];
            printlog(`-> ${entity.username} empowers ${target.username}!`);
            printlog(`-> ${target.username} health and maximum health increased by ${entity.abilities[abilityUsed][1]}.`);
            printlog(`-> ${target.username} damage increased by ${entity.abilities[abilityUsed][2]}.`);
            break;
 
        //A special attack which generates Entropy twice as fast. Cannot be blocked.
        case "Entropy":
            //structure: ["Entropy",[damage],[curCharges],[manaBurstIndex]]
            if(entity == p1){
                target = enemies[chooseTarget()];
            }else{
                target = p1;
            }
            printlog(`-> ${entity.username} used Entropy on ${target.username}!`);
            attack(entity,target,entity.abilities[abilityUsed][1],false);
            //entity = p1, entropyIndex = 3, manaBurstIndex = 2, add = 1
            gainEntropy(entity,abilityUsed,entity.abilities[abilityUsed][3],2);
            break;
       
        //Ability which increases effectiveness of ALL abilities of ALL living enemies.
        //Enemy-only ability. Extremely powerful; be wary when implementing this.
        case "Magecraft":
            printlog(`-> ${entity.username} used Magecraft!`);
 
            //list of abilities Magecraft will not affect.
            let nonUpgradeAbilities = ["None","Defend","Magecraft","Summon","Entropy"];
 
            //Seems bad computation-wise, since its a nested for loop,
            //but enemy ability arrays are fixed at lengths < 5, making
            //computation speeds satisfactory in practice.
            let priorability = "";
            for(let i = 0; i < enemies.length; i++){
                for(let j = 0; j < enemies[i].abilities.length; j++){
                    (j > 0) ? priorability = enemies[i].abilities[j - 1][0] : priorability = "";
                    if(nonUpgradeAbilities.indexOf(enemies[i].abilities[j][0]) === -1){
                        enemies[i].abilities[j][1] += entity.abilities[abilityUsed][1];
                        if(priorability != enemies[i].abilities[j][0]){ //for the sake of not seeing Fireball 5 times.
                            printlog(`-> ++ ${enemies[i].username}'s ${enemies[i].abilities[j][0]} strength increased to ${enemies[i].abilities[j][1]}!`)
                        }
                    }
                }
            }
            break;
 
        //ability that does nothing. Used for testing or
        //for making aggressive spellcasting enemies more passive
        //(i.e. enemies with an "aggrocaster" or "aggrosummoner" AI).
        case "None":
            printlog(`-> ${entity.username} fizzled!`);
            break;
        default:
            printlog(`Warning: ${entity.username} has an unrecognized ability.`);
            break;
    }
}
//One-line function to heal a target entity.
function heal(target,amt){
    target.health = target.health + amt >= target.maxhealth ? target.maxhealth : target.health + amt;
}
//game loop
let start = true
while(p1.alive && !win){
    //first round
    if(start){
        round += 1;
        spawn();
        start = false;
    }
    //new round
    if(enemies.length == 0 && !start){
        console.log(`Round ${round} complete!\n`);
        round += 1;
        turn = 1;
 
        //at the beginning of each round, player's abilities grow stronger
        printlog(`${p1.username} grows stronger!`);
        p1.maxhealth += ((round - 1) * 2) + 1; //3, 6, 11, 18, 27, 38, 51
        p1.dmg += 2; //1, 3, 5, 7, 9, 11, 13 without upgrades
        heal(p1,p1.maxhealth/2);
        printlog(`-> ++ Maximum health increased to ${p1.maxhealth}.`);
        printlog(`-> ++ Attack damage increased to ${p1.dmg}.`)
        for(let i = 0; i < p1.abilities.length; i++){
            if(p1.abilities[i][0] == "Entropy"){continue;}
            //maybe change number order of Mana Burst so this condition isn't necessary
            p1.abilities[i][1] += p1.abilities[i][0] == "Mana Burst" ? p1.abilities[i][3] : p1.abilities[i][2];
            printlog(`-> ++ ${p1.abilities[i][0]} strength increased to ${p1.abilities[i][1]}.`);
        }
        spawn();
        if(win) {continue;}
        printlog("\n");
        printlog("A new round begins...");
 
    }
    //display the field
    printlog(`\n~ROUND ${round} TURN ${turn}~\n`);
    console.log("Enemies:");
    displayEnemies();
    console.log(`${p1.username}:`);
    displayHealthBar(p1);
    console.log(`Current Entropy: ${p1.abilities[3][2]}`)
    console.log(`Mana Burst charges remaining: ${p1.abilities[2][2]}`)
    //player turn
    cmdprompt("Choose your command: attack [Q], block [W], ability [E], none [R], ff: ",p1);
    if(!p1.alive) {continue;} //end game immediately on surrender
    //enemy turn
    for(let i = 0; i < enemies.length; i++){
        if(enemies[i].blocking){
            enemies[i].blocking = false;
        }
        if(!enemies[i].alive){
            printlog(`-> You defeated ${enemies[i].username}!`);
            enemies.splice(i,1);
            continue;
        }
    }
    //Yes I have to separate these into two loops. Yes I know it sucks. No I wont change it until I find something better.
    for(let i = 0; i < enemies.length; i++){
        inputCommand(enemies[i],enemyAI(enemies[i]));
 
        //need another check for enemies killed by thorns. Will have to improve logic later
        if(!enemies[i].alive){
            printlog(`-> You defeated ${enemies[i].username}!`);
            enemies.splice(i,1);
            continue;
        }
    }
 
    //Prepare for next turn
    if(p1.blocking){
        p1.blocking = false;
    }
    turn += 1;
    totalturns += 1;
}
//Game end
win ? printlog(`\n******Congratulations, ${p1.username}! You Win!******\n`) : printlog(`\nGame Over. \nYou made it to Round ${round}.\n`);
console.log(`Total turns: ${totalturns}`);
let endd = new Date() - d; //total game time in milliseconds
let endgameminutes = Math.trunc(endd/60000);
let endgameseconds = Math.trunc((endd % 60000)/1000);
//time formatting, adding 0s to make more readable
if(endgameseconds < 10){
    endgameseconds = "0" + endgameseconds;
}
let endgamemillis = endd % 1000;
if(endgamemillis < 100){
    endgamemillis = "0" + endgamemillis;
}
if(endgamemillis < 10){
    endgamemillis = "0" + endgamemillis; //theres got to be a better way to add these 0s
}
console.log(`Total Game Time: ${endgameminutes}:${endgameseconds}.${endgamemillis}`);
//create log file header
let logfile = "";
logfile += `game.js Game Log from ${gamedate}\n\n`;
logfile += `Username: ${p1.username}\n`;
logfile += `Outcome: ${win ? "Win" : "Loss"}\n`;
logfile += `Chosen Upgrades: ${chosen_upgrades}\n`;
logfile += `Total turns: ${totalturns}\n`;
logfile += `Total Game Time: ${endgameminutes}:${endgameseconds}.${endgamemillis}\n`;
logfile += `Game log begins below. \n\n${game_log}`;
if(!fs.existsSync(__dirname + "/history/" + p1.username)){
    fs.mkdirSync(__dirname + "/history/" + p1.username, { recursive: true });
}
let dirnum = 0;
let dirname = "";
do{
    dirnum += 1;
    dirname = __dirname + `/history/${p1.username}/game_${dirnum}.txt`;
}while(fs.existsSync(dirname));
//records game events in a log file
fs.writeFileSync(dirname,logfile);
console.log(`\n-> Game history recorded in ${dirname}.`);
console.log("\n-----THANKS FOR PLAYING-----\n");