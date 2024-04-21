const prompt = require("prompt-sync")();
const fs = require("fs");
/*
*
*
*
* A simple turn-based action game.
* Try to defeat seven rounds of enemies.
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
    this.abilities = [["Heal",1,1],["Fireball",1,3],["Mana Burst",10,1,3]];
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
let round = 0; //determines enemy spawns/difficulty
let turn = 1;
let totalturns = 0;
let enemies = [];
let game_log = "";
let chosen_upgrades = "N/A";
let win = false;
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
//Standard attack function. Deals damage, half if target blocks. Optional params available.
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
    if(target.health <= 0){
        target.health = 0;
        target.alive = false;
    }
}
//Function which handles player ability upgrades after rounds 3 and 5. Doubles a stat.
//If Mana Burst is chosen, grants an extra charge.
function abilityUpgrade(){
    printlog(`Congratulations, ${p1.username}! You have earned a stat upgrade!`);
    console.log("List of abilities:");
    let i = 0;
    for(i; i < p1.abilities.length; i++){
        console.log(`${i + 1}: ${p1.abilities[i][0]}`);
    }
    console.log(`${i + 1}: Increase HP`);
    console.log(`${i + 2}: Increase Attack Damage`);
    let choice = getprompt('\nChoose a stat to upgrade by typing in the corresponding number: ',p1.abilities.length + 2);
    if(choice == p1.abilities.length){
        p1.maxhealth = p1.maxhealth * 2;
        p1.health = p1.maxhealth;
        chosen_upgrades += "Maximum Health";
        printlog(`-> Maximum health increased to ${p1.maxhealth}.`)
        return;
    }
    if(choice == p1.abilities.length + 1){
        p1.dmg = p1.dmg * 2;
        chosen_upgrades += "Attack Damage";
        printlog(`-> Attack damage increased to ${p1.dmg}.`)
        return;
    }
    chosen_upgrades += p1.abilities[choice][0];
    printlog('\n');
    if(p1.abilities[choice][0] == "Mana Burst"){
        p1.abilities[choice][2] += 1;
        printlog("-> Gained one charge of Mana Burst.")
    }
    p1.abilities[choice][1] = p1.abilities[choice][1] * 2;
    printlog(`-> ${p1.abilities[choice][0]} strength increased to ${p1.abilities[choice][1]}.`);
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
            enemies.push(new Enemy("Healer",25,0,[["Heal", 3],["Defend"]],"aggrocaster"));
            enemies.push(new Enemy("Wizard",25,0,[["Fireball",4]],"aggrocaster"));
            enemies.push(new Enemy("Shielder",40,5,[["Defend"]],"defender"));
            break;
        case 5:
            enemies.push(new Enemy("Boss",50,5,[["Fireball",5],["Fireball",5],["Heal",5]],"spellsword"));
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
                ["Summon",new Enemy("Tank Minion",30,3,[["Defend"]],"defender")],
                ["Summon",new Enemy("Wizard Minion",15,0,[["Fireball",5],["Empower",5,2]],"aggrocaster")]],
                "summoner"));
            enemies.push(new Enemy("Minion",10,3,[],"defensive"));
            break;
        case 7:
            enemies.push(new Enemy("Wizard Lord",300,0,[["Fireball",3],["Fireball",3],["Heal",10],
            ["Summon",new Enemy("Mana Familiar",10,0,[["Mana Burst",10,3]],"aggrocaster")],
            ["Summon",new Enemy("Revitalizing Familiar",10,0,[["Heal",10]],"aggrocaster")]],"aggrocaster"))
            enemies.push(new Enemy("Book",150,5,[["Defend"],["Heal",5]],"spellsword"))
            break;
        default:
            printlog(`\n******Congratulations, ${p1.username}! You Win!******`);
            win = true;
            p1.alive = false;
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
        //aggrocasters use abilities much more often than casters.
        //They do not attack or block.
        case "aggrocaster":
            block_prob = 0;
            cast_prob = 1;
            attacker = false;
            break;
        //Summoners are a special class which casts abilities only on specific rounds.
        //They do not attack or pass.
        case "summoner":
            if(turn % 3 == 0){
                cast_prob = 1;
                block_prob = 0;
            }else{
                block_prob = 1;
                cast_prob = 0;
            }
            attacker = false;
            break;
        //spellswords can attack, block, and use abilities. They do not pass.
        case "spellsword":
            block_prob = 1/4;
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
//Display function
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
//Current keyword list: attack, defend, ability, ff, none
function inputCommand(entity,command){
    switch(command.toLowerCase()){
        //attack opponent
        case "a":
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
        case "b":
        case "block":
            entity.blocking = true;
            printlog(`-> ${entity.username} enters a defensive stance!`)
            break;
        //use an ability
        case "y":
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
            printlog("X Unknown command, please try again.")
            cmdprompt("Choose your command: [a]ttack, [b]lock, abilit[y], none, ff: ",entity);
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
//Recognized ability names: Heal, Charge, Fireball, Defend, Mana Burst, Summon, Empower
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
            } else {
                attack(entity,target,entity.abilities[abilityUsed][1]);
            }
            break;
        //Entity passes the turn, but increases their attack damage permanently.
        case "Charge":
            entity.dmg += entity.abilities[abilityUsed][1];
            printlog(`-> ${entity.username} charges their attack!`);
            printlog(`-> ${entity.username}'s attack increases by ${entity.abilities[abilityUsed][1]}!`);
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
                printlog(`X No more Mana Bursts left for ${entity.username}.`);
            }
            break;
        //Increase health, maximum health, and damage of an ally.
        //health and maxhealth are second value, damage is third.
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

        //ability that does nothing. Why would you ever use this?
        case "none":
            printlog(`-> ${entity.username} fizzled!`);
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
    //first round
    if(start){
        round += 1;
        spawn();
        start = false;
    }
    //new round
    if(enemies.length == 0 && !start){
        console.log(`Round ${round} complete!\n`);
        //at the beginning of each round, player's abilities grow stronger
        printlog(`${p1.username} grows stronger!`);
        p1.maxhealth += round + 2;
        p1.dmg += 2;
        heal(p1,p1.maxhealth/2);
        printlog(`-> Maximum health increased to ${p1.maxhealth}.`);
        printlog(`-> Attack damage increased to ${p1.dmg}.`)
        for(let i = 0; i < p1.abilities.length; i++){
            p1.abilities[i][1] += p1.abilities[i][0] == "Mana Burst" ? p1.abilities[i][3] : p1.abilities[i][2];
            printlog(`-> ${p1.abilities[i][0]} strength increased to ${p1.abilities[i][1]}.`);
        }
        printlog("\n");
        printlog("A new round begins...");
        round += 1;
        turn = 1;
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
    cmdprompt("Choose your command: [a]ttack, [b]lock, abilit[y], none, ff: ",p1);
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
logfile += `Outcome: ${win ? "Win" : "Loss"}\n`
logfile += `Chosen Ability Upgrades: ${chosen_upgrades}\n`;
logfile += `Total turns: ${totalturns}\n`;
logfile += `Total Game Time: ${endgameminutes}:${endgameseconds}.${endgamemillis}\n`;
logfile += "Game log begins below. \n\n" + game_log;
let dirnum = 1;
if(!fs.existsSync(__dirname + "/history/" + p1.username)){
    fs.mkdirSync(__dirname + "/history/" + p1.username, { recursive: true });
}
let dirname = __dirname + `/history/${p1.username}/game_${dirnum}.txt`;
while(fs.existsSync(dirname)){
    dirnum += 1;
    dirname = __dirname + `/history/${p1.username}/game_${dirnum}.txt`;
}
//records game events in a log file
fs.writeFileSync(dirname,logfile);
console.log(`\n-> Game history recorded in ${dirname}.`);
console.log("\n~~THANKS FOR PLAYING~~\n");
 
