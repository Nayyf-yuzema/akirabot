var reactionNumbers = ["1⃣","2⃣","3⃣","4⃣","5⃣","6⃣","7⃣","8⃣","9⃣", "🔟"];
var reactions = ["rage","thinking","blush","stuck_out_tongue_closed_eyes","heart_eyes"];
var emojis = [/(☕)/,/(🍜)/,/(🍰)/,/(🍪)/,/(🔰)/];
var cooldown = {};

const Discord = require('discord.js');
var levels = require("../data/levels.json");

var config = require("../data/config.json");
var fs = require("fs");
var json = require("jsonfile");


module.exports = {
	permCheck:function(message, commandName){
		var perms = json.readFileSync("../data/perms.json");

		if(perms[commandName] == undefined){return true}
		var allowedChannel = true;
		var allowed = false;

		if(perms[commandName].channel.length>0){
			allowedChannel = false;
			perms[commandName].channel.forEach(function(channel){
				if(channel == message.channel.name){allowedChannel = true}
			})
		}
		if(allowedChannel){
			if(perms[commandName].role.length==0 && perms[commandName].user.length==0){return true};

			if(perms[commandName].role.length>0){
				for(var i=0;i<perms[commandName].role.length;i++){
					var role = message.member.guild.roles.find("name", perms[commandName].role[i]);
					if(role != null && message.member.roles.has(role.id)){
						return true;
						i=perms[commandName].role.length;
					}
				}
			}

			if(!allowed && perms[commandName].user.length>0){
				for(var i=0;i<perms[commandName].user.length;i++){
					if(perms[commandName].user[i] == message.author.id){
						return true;
						i=perms[commandName].user.length;
					}
				}
			}

		}
		return false;
	},

	react:function(number,limit,poll){
		if(number<limit){
			poll.react(reactionNumbers[number]).then(function(){
				module.exports.react(number+1,limit,poll);
			})
		};
	},

	/*findEmoji:function(emoji){
        for(var i=0;i<10;i++){
            if(reactions[i]==emoji){
                return i+1;
            }
        }
    },*/

	emojiCount:function(reactionR,user){
		let count = 0;
		reactionR.message.reactions.forEach(function(reaction){
			if(reaction.users.has(user.id)){
				count++;
			}
		});
		return count
	},

	checkReact:function(reactionR,user,points){
		var count = module.exports.emojiCount(reactionR,user);
		if(count>=2){
			reactionR.remove(user);
		}else{
			points.score += module.exports.findEmoji(reactionR.emoji.name);
			art.save(points);
		}
	},

	stripEmoji:function(text){
		return text.split(emojis[0])[0].split(emojis[1])[0].split(emojis[2])[0].split(emojis[3])[0].split(emojis[4])[0];
	},

	exp:function(msg){
		var exp = json.readFileSync("../data/exp.json");
		if(cooldown[msg.author.id] == undefined && !msg.author.bot){ //checks if the user is not on cooldown and filters bots out
			if(exp[msg.author.id] == undefined){
				exp[msg.author.id] = {"lvl":0,"exp":0,"money":0,"lastDaily":"Not Collected"}
				msg.member.addRole(msg.member.guild.roles.find("name",`[${exp[msg.member.id].lvl}]`),"Added level role");
			}; //if the user is not on exp.json, adds it

			//adds random amount (15-25) of exp to the user
			var randomExp = Math.floor(Math.random() * ((15-8)+1) + 8);
			exp[msg.author.id].exp += randomExp;

			if(exp[msg.author.id].exp > levels[exp[msg.author.id].lvl].exp){ //checks if the user has reached enough exp
				var levelroles = msg.member.roles.filter(r=>r.name.startsWith("[")); //finds all roles that start with [
				if(levelroles.size==1){
					msg.member.removeRole(levelroles.first(),"Removed current level role"); //removes current lvl role
				}else if(levelroles.size>1){
					msg.member.removeRoles(levelroles,"Removed level roles"); //removes all lvl roles
				}

				exp[msg.author.id].lvl += 1;

				msg.member.addRole(msg.guild.roles.find("name",`[${exp[msg.author.id].lvl}]`),"Added new level role") //adds new level role
				//module.exports.send(`>add-money bank <@${msg.author.id}> ${(exp[msg.author.id].lvl + 1)* 1000}`);

				exp[msg.author.id].money += exp[msg.author.id].lvl * 1000 //adds money reward for leveling up
				msg.author.send(`You just got ${exp[msg.author.id].lvl * 1000} for reaching level ${exp[msg.author.id].lvl}`);

				if(levels[exp[msg.author.id].lvl].rewards != undefined){
					levels[exp[msg.author.id].lvl].rewards.forEach(function(reward){ //checks every reward
						switch(reward.type){
							case "role":
								if(!msg.member.nickname.endsWith("🔰")){
									var nicks = json.readFileSync("../data/nicks.json");

									msg.member.addRole(msg.guild.roles.find("name",reward.name),"Added reward role"); //adds the rewarded role

									var nick = message.member.nickname.split(" ");
									nick.pop();

									var newNick = module.exports.stripEmoji(nick.join(" "))[0] + " " + reward.name.split(" ")[0];
									msg.member.setNickname(newNick,"Changed nickname emoji");
									nicks[msg.member.id] = newNick;
									module.exports.save(nicks,"nicks");
								}
								break;
						}
					})
				}

			}

			module.exports.save(exp,"exp");

			cooldown[msg.author.id] = true; //sets the user on cooldown and will remove it in 60000 ms (1 minute)
			setTimeout(function(){
				delete cooldown[msg.author.id];
			},90000)
		}
	},

	talk:function(client,msg){
		if(msg.mentions.channels.size>0){
			client.channels.resolve(msg.mentions.channels.first()).send(msg.content.split(`<#${msg.mentions.channels.first().id}>`).join(""));
		}
	},

	typing:function(client,channelName){
		client.on("typingStart",(channel,user)=>{
			if(channel.name == channelName){
				client.channels.find("name",channelName).startTyping();
			}
		});
		client.on("typingStop",(channel,user)=>{
			if(channel.name == channelName){
				client.channels.find("name",channelName).stopTyping();
			}
		});
	},

	save:function(data,name){
		json.writeFile("../data/" + name + ".json", data, function (err) {})
	},


	log:function(client,log){
		if(client.status == 0){
			client.channels.find("name","bot-logs").send(new Discord.MessageEmbed().setTimestamp().setDescription(log));
		}
	}
}

