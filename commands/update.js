var path = require("path");
const git = require('simple-git')(path.resolve(__dirname,"../"));
var util = require('../utilities.js');

module.exports = {
    desc:"This is a description",
    execute(client, message, param){
        message.delete();

        message.channel.send("Downloading changes.....").then(m=>{
            git.pull((err,res)=>{               
                if(err){
                    util.log(client,err);
                    return m.edit("Git pull failed!")
                }
                
                if(res.files.length>0){
                    m.edit(`Git pull successful!
                    Modified files: ${res.files.join(" ,")}
                    Summary: ${JSON.stringify(res.summary).split("{ ")[1].split(" }")[0]}
                    `);
                }else{
                    m.edit("Already up to date!");
                }
            })
        })      
    }
}