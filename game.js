const prompt = require("prompt-sync")();
const fs = require("fs");
/*
*
*
*
* A simple turn-based action game.
* Try to defeat five rounds of enemies.
* To run, type 'node game.js' at the command line.
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
    */
    this.abilities = [["Heal",1,1],["Fireball",2,1],["Mana Burst",15,1]];
    this.alive = true;
    this.blocking = false;
}
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
    this.dummy = 0; //dummy value to be used for variables or other fun stuff (not yet used)
}
let player_name = prompt("Type your username: ");
let p1 = new Player(player_name,3,1);
let round = 0; //determines difficulty
let turn = 1;
let totalturns = 0;
let enemies = [];
let game_log = "";
let chosen_upgrade = "N/A";
//date the game log
let d = new Date();
let gamedate = (d.getMonth() + 1) + "/"
+ d.getDate()  + "/"
+ d.getFullYear() + " "
+ d.getHours() + ":"  
+ d.getMinutes();
//Makes sure the prompt is a valid number for array-related choices (abilities, enemy targeting).
function getprompt(string,arraylength){
    let result = prompt(string);
    while(Number.isNaN(Number(result)) || result < 1 || result > arraylength){
        console.log("Error: Invalid input, please try again.")
        result = prompt(string);
    }
    return result - 1;
}
//Alternate print function which saves the print statement. Used for logging game history.
function printlog(string){
    game_log += string + "\n";
    console.log(string);
}
//Standard attack method. Deals damage, half if target blocks. Optional params available.
function attack(attacker,target,changedmg = 0,blockAllowed = true){
    let attackdamage = attacker.dmg;
    if(changedmg != 0){
        attackdamage = changedmg;
    }
    if(target.blocking && blockAllowed){ //blocking reduces damage by half
        attackdamage = attackdamage/2;
    }
    target.health -= attackdamage;
    printlog(`-> ${attacker.username} dealt ${attackdamage} damage to ${target.username}!`);
    if(target == p1 && p1.blocking){
        heal(p1,1);
        printlog(`-> ${p1.username} healed 1 HP for blocking an attack!`);
    }
    if(target.health <= 0){
        target.health = 0;
        target.alive = false;
    }
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
            enemies.push(new Enemy("Healer",10,0,[["Heal", 2]],"caster"));
            enemies.push(new Enemy ("Shielder",10,5,[["Charge",1],["Defend"],["Defend"]],"defender"));
            // enemies.push(new Enemy("Enemy 2",1,1,[],"aggro"));
            break;
        case 4:
            //After Round 3, the player gets to upgrade one ability.
            //Doubles ability effectiveness.
            printlog(`Congratulations, ${p1.username}! You have earned an ability upgrade!`);
            console.log("List of abilities:");
            for(let i = 0; i < p1.abilities.length; i++){
                console.log(`${i + 1}: ${p1.abilities[i][0]}`);
            }
            let choice = getprompt('\nChoose an ability to upgrade by typing in the corresponding number: ',p1.abilities.length);
            chosen_upgrade = p1.abilities[choice][0];
            printlog('\n');
            if(p1.abilities[choice][0] == "Mana Burst"){
                p1.abilities[choice][2] += 1;
                printlog("-> Gained one charge of Mana Burst.")
            }
            p1.abilities[choice][1] = p1.abilities[choice][1] * 2;
            printlog(`-> ${p1.abilities[choice][0]} strength increased to ${p1.abilities[choice][1]}.`);
            enemies.push(new Enemy("Healer",20,0,[["Heal", 3],["Defend"]],"aggrocaster"));
            enemies.push(new Enemy("Wizard",20,0,[["Fireball",4]],"aggrocaster"));
            enemies.push(new Enemy("Shielder",20,5,[["Defend"]],"defender"));
            break;
        case 5:
            enemies.push(new Enemy("Boss",50,5,[["Fireball",5],["Fireball",5],["Charge",3],["Heal",10]],"spellsword"));
            break;
        default:
            printlog(`\n******Congratulations, ${p1.username}! You Win!******`)
            p1.alive = false;
    }
}
//Method which determines how an enemy behaves based on its AI_type keyword.
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
        //caster enemies will occasionally use abilities or take a defensive stance.
        //casters do not attack.
        case "caster":
            if(enemy.health < enemy.maxhealth / 2){
                block_prob = 0.2;
            } else {
                block_prob = 0;
            }
            cast_prob = 0.3;
            attacker = false;
            break;
        //aggrocasters use abilities much more often than casters.
        //They do not attack or block.
        case "aggrocaster":
            block_prob = 0;
            cast_prob = 0.7;
            attacker = false;
            break;
        //Summoners are a special class which casts abilities only on specific rounds.
        //They do not attack or block.
        //Not yet used.
        case "summoner":
            if(turn % 2 == 0){
                cast_prob = 1;
            }else{
                cast_prob = 0;
            }
            block_prob = 0;
            attacker = false;
            break;
        //spellswords can attack, block, and use abilities. They do not pass.
        case "spellsword":
            block_prob = 1/3;
            cast_prob = 1/2;
            break;
        //dummy AI for testing. Does nothing.
        case "none":
            attacker = false;
            cast_prob = 0;
            block_prob = 0;
            break;
        default:
            console.error("Warning: enemy AI missing or unknown.");
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
//Display method
function displayHealthBar(entity){
    process.stdout.write(`HP: ${entity.health}\n[`);
    let ratio = entity.health/entity.maxhealth;
    for(let i = 0; i < 20; i++){
        if(i/20 < ratio){
            process.stdout.write('\u2588');
        }else{
            process.stdout.write(" ");
        }
    }
    process.stdout.write(']\n');
}
//Display method
function displayEnemies(){
    for(let i = 0; i < enemies.length; i++){
        console.log(`${i + 1}: ${enemies[i].username}`);
        displayHealthBar(enemies[i]);
    }
    console.log();
}
//Display method
function displayEnemiesNoHealthBar(){
    for(let i = 0; i < enemies.length; i++){
        console.log(`${i + 1}: ${enemies[i].username}`);
    }
    console.log();
}
//Method for getting player's choice of enemy to target with an attack/ability.
function chooseTarget(){
    if(enemies.length == 1){
        return 0;
    }
    displayEnemiesNoHealthBar();
    return getprompt("Type the number of the enemy you wish to target: ",enemies.length);
}
//Performs the entity's chosen action based on a string keyword.
//Current keyword list: attack, defend, ability, ff, none
function inputCommand(entity,command){
    switch(command.toLowerCase()){
        //attack opponent
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
            break;
        //block
        case "block":
            entity.blocking = true;
            printlog(`-> ${entity.username} enters a defensive stance!`)
            break;
        //use an ability
        case "ability":
            useAbility(entity);
            break;
        //player surrender
        case "ff":
            p1.alive = false;
            printlog("X You surrendered.");
            break;
        //pass
        case "none":
            printlog(`-> ${entity.username} passed this turn!`)
            break;
        default:
            printlog("X Unknown command.");
            break;
    }
}
//Allows for ability usage by both player and enemies.
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
//Recognized ability names: Heal, Charge, Fireball, Defend, Mana Burst
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
                printlog(`-> ${target.username} blocked the Fireball!`);
            } else {
                attack(entity,target,entity.abilities[abilityUsed][1]);
                printlog(`-> ${entity.username} dealt ${entity.abilities[abilityUsed][1]} damage to ${target.username} with their Fireball!`);
            }
            break;
        //Entity passes the turn, but increases their attack damage permanently.
        case "Charge":
            entity.dmg += entity.abilities[abilityUsed][1];
            printlog(`-> ${entity.username} charges their attack!`);
            break;
        //Entity blocks for an ally. Enemy-only ability (since player has no allies).
        //Enemies will not use Defend on entities that are already blocking.
        //(they may still take the "block" action while defended, though.)
        case "Defend":
            do {
                target = enemies[Math.trunc(Math.random()*enemies.length)];
            } while(target.blocking);
            target.blocking = true;
            printlog(`-> ${entity.username} places a shield on ${target.username}!`);
            break;
        //Entity summons a minion to their aid. Enemy-only for now.
        case "Summon":
            //assumes second item in tuple is the entity to be summoned.
            enemies.push(entity.abilities[abilityUsed[1]]);
            console.log(`${entity.username} summons ${entity.abilities[abilityUsed[1]].username}!`)
            break;
        //Entity deals damage to a target which ignores resistances.
        //Has a limited number of uses (determined by the third value in the array).
        case "Mana Burst":
            if(entity.abilities[abilityUsed][2] > 0){
                if(entity == p1){
                    target = enemies[chooseTarget()];
                }else{
                    target = p1;
                }
                attack(entity,target,entity.abilities[abilityUsed][1],false);
                printlog(`-> ${entity.username} used a Mana Burst on ${target.username} for ${entity.abilities[abilityUsed][1]} damage!`);
                entity.abilities[abilityUsed][2] -= 1;
                printlog(`-> ${entity.username} has ${entity.abilities[abilityUsed][2]} Mana Bursts remaining.`);
            } else{
                printlog(`X No more Mana Bursts left for ${entity.username}.`);
            }
        case "none":
            break;
        default:
            printlog(`Warning: ${entity.username} has an unrecognized ability.`);
            break;
    }
}
//Method to heal a target entity. Can target self.
function heal(target,amt){
    target.health = target.health + amt >= target.maxhealth ? target.maxhealth : target.health + amt;
}
//game loop
let start = true
while(p1.alive){
    console.log(totalturns);
    //first round
    if(start){
        round += 1;
        spawn();
        start = false;
    }
    //new round
    if(enemies.length == 0 && !start){
        round += 1;
        console.log("Round complete. New wave starting shortly.\n");
        //at the beginning of each round, player's abilities grow stronger (except mana burst)
        printlog(`${p1.username}'s abilities grow stronger!`);
        for(let i = 0; i < p1.abilities.length; i++){
            if(p1.abilities[i][0] != "Mana Burst"){
                p1.abilities[i][1] += p1.abilities[i][2];
                printlog(`-> ${p1.abilities[i][0]} strength increased to ${p1.abilities[i][1]}.`);
            }
        }
        p1.maxhealth += round + 2;
        p1.dmg += 1;
        heal(p1,p1.maxhealth/2);
        spawn();
        if(!p1.alive) {continue;}
    }
    //display the field
    printlog(`\n~ROUND ${round} TURN ${turn}~\n`);
    console.log("Enemies:");
    displayEnemies();
    console.log(`You`);
    displayHealthBar(p1);
    //player turn
    let command = prompt("Choose your command: attack, block, ability, none, ff: ");
    console.log("\n");
    inputCommand(p1,command);
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
        if(enemies.length > 0){
            inputCommand(enemies[i],enemyAI(enemies[i]));
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
printlog(`\nGame Over. \nYou made it to Round ${round}.`);
console.log(`Total turns: ${totalturns}`);
let endd = new Date() - d; //total game time in milliseconds
let endgameminutes = Math.trunc(endd/60000);
let endgameseconds = Math.trunc((endd % 60000)/1000);
let endgamemillis = endd % 1000;
console.log(`Total Game Time: ${endgameminutes}:${endgameseconds}.${endgamemillis}`);

//create log file header
let logfile = "";
logfile += `game.js Game Log from ${gamedate}\n\n`;
logfile += `Username: ${p1.username}\n`;
logfile += `Chosen Ability Upgrade: ${chosen_upgrade}\n`;
logfile += `Total turns: ${totalturns}\n`;
logfile += `Total Game Time: ${endgameminutes}:${endgameseconds}.${endgamemillis}\n`;
logfile += "Game log begins below. \n\n" + game_log;
let dirnum = 1;
if(!fs.existsSync(__dirname + "/logs")){
    fs.mkdirSync(__dirname + "/logs");
}
let dirname = __dirname + "/logs/log_" + dirnum + ".txt";
while(fs.existsSync(dirname)){
    dirnum += 1;
    dirname = __dirname + "/logs/log_" + dirnum + ".txt";
}

//records game events in a log file
fs.writeFileSync(dirname,logfile);
console.log(`\n-> Game history recorded in ${dirname}.`);
console.log("\n~~THANKS FOR PLAYING~~\n");