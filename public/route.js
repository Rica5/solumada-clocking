const express = require("express");
const routeExp = express.Router();
const mongoose = require("mongoose");
const UserSchema = require("../models/User");
const StatusSchema = require("../models/status");
const LateSchema = require("../models/Late");
const nodemailer = require("nodemailer");
const crypto = require('crypto');
const moment = require("moment");
const ExcelFile = require("sheetjs-style");
const fs = require('fs');
var date_data = [];
var data = [];
var num_file = 1;
var hours = 0;
var minutes = 0;
var ip = "";
var dns = require('dns');
ip = dns.getServers();
//Mailing
var transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "developpeur.solumada@gmail.com",
    pass: "S0!um2d2",
  },
});
//Page login
routeExp.route("/").get(async function (req, res) {
    session = req.session;
    if (session.occupation_u == "User") {
      res.redirect("/employee");
    } else if (session.occupation_a == "Admin") {
      res.redirect("/home");
    } else {
      res.render("Login.html", { erreur: "" });
    }
});

routeExp.route("/latelist").get(async function (req, res) {
  session = req.session;
  if (session.occupation_a == "Admin") {
  mongoose
    .connect(
      "mongodb+srv://Rica:ryane_jarello5@cluster0.z3s3n.mongodb.net/Pointage?retryWrites=true&w=majority",
      {
        useUnifiedTopology: true,
        UseNewUrlParser: true,
      }
    )
    .then(async () => {
      var latelist = await LateSchema.find({validation:true,reason:{$ne:""}});
      res.render("latelist.html",{latelist:latelist});
    });
  }
  else{
  res.redirect("/");
  }
});
//Login post
routeExp.route("/login").post(async function (req, res) {
  session = req.session;
  await login(req.body.username,req.body.pwd,session,res);
});
async function login(username,pwd,session,res){
  mongoose
    .connect(
      "mongodb+srv://Rica:ryane_jarello5@cluster0.z3s3n.mongodb.net/Pointage?retryWrites=true&w=majority",
      {
        useUnifiedTopology: true,
        UseNewUrlParser: true,
      }
    )
    .then(async () => {
      let hash = crypto.createHash('md5').update(pwd).digest("hex");
      var logger = await UserSchema.findOne({
        username: username,
        password: hash,
      });
      if (logger) {
        if (logger.change != "n"){
          if (logger.occupation == "User") {
            session.occupation_u = logger.occupation;
            session.m_code = logger.m_code;
            session.shift = logger.shift;
            session.name = logger.first_name + " " + logger.last_name;
            session.num_agent = logger.num_agent;
            var late = await LateSchema.findOne({m_code:logger.m_code,date:moment().format("YYYY-MM-DD"),reason:""});
            if (late){
              session.time = late.time + " minutes";
              res.redirect("/employee");
          }
          else{
            var already = await LateSchema.findOne({m_code:logger.m_code,date:moment().format("YYYY-MM-DD")});
           
            if (already){
              session.time = "y";
              res.redirect("/employee");
            }
            else{
              var start="";
              var today = moment().day();
            switch(session.shift){
              case "SHIFT 1": start = "06:15";break;
              case "SHIFT 2": start = "12:15";break;
              case "SHIFT 3": start = "18:15";break;
              case "DEV"    : start = "08:00";break;
            }
            switch(today){
              case 6 : start="08:00";break;
              case 7 : start="08:00";break;
            }
            start = "12:00";
            console.log(start);
            var timestart = moment().format("HH:mm");
            var time = calcul_retard(start,timestart);
              if ( time > 10){
                var new_late = {
                  m_code:session.m_code,
                  num_agent : session.num_agent,
                  date:moment().format("YYYY-MM-DD"),
                  nom:session.name,
                  time:time,
                  reason:"",
                  validation:false
                }
                await LateSchema(new_late).save();
                session.time = time + " minutes";
               res.redirect("/employee");
            }
            else{
              session.time = "y";
              res.redirect("/employee");
            }
            }
            
          }
          } else {
             session.occupation_a = logger.occupation;
             session.request = {};
            res.redirect("/home");
          }
        }
        else{
          res.render("Login.html", {
            erreur: "Changer votre mot de passe s'il vous plaît",
          });
        }
       
      } else {
        res.render("Login.html", {
          erreur: "Email ou mot de passe incorrect",
        });
      }
    });
}
//Validation page
routeExp.route("/validelate").get(async function (req, res) {
  session = req.session;
  if (session.occupation_a == "Admin") {
    session.filtrage = null;
    mongoose
      .connect(
        "mongodb+srv://Rica:ryane_jarello5@cluster0.z3s3n.mongodb.net/Pointage?retryWrites=true&w=majority",
        {
          useUnifiedTopology: true,
          UseNewUrlParser: true,
        }
      )
      .then(async () => {
        var latelist = await LateSchema.find({ validation: false ,reason:{$ne:""}});
        res.render("latevalidation.html", { latelist: latelist });
      });
  } else {
    res.redirect("/");
  }
});
//Validation
routeExp.route("/validate").post(async function (req, res) {
  session = req.session;
  if (session.occupation_a == "Admin") {
  var id = req.body.id;
  mongoose
    .connect(
      "mongodb+srv://Rica:ryane_jarello5@cluster0.z3s3n.mongodb.net/Pointage?retryWrites=true&w=majority",
      {
        useUnifiedTopology: true,
        UseNewUrlParser: true,
      }
    )
    .then(async () => {
      await LateSchema.findOneAndUpdate(
        { _id: id },
        { validation: true }
      );
      res.send("Ok");
    });
  }
  else{
  res.redirect("/");
  }
});
//Denied
routeExp.route("/denied").post(async function (req, res) {
  session = req.session;
  if (session.occupation_a == "Admin") {
  var id = req.body.id;
  mongoose
    .connect(
      "mongodb+srv://Rica:ryane_jarello5@cluster0.z3s3n.mongodb.net/Pointage?retryWrites=true&w=majority",
      {
        useUnifiedTopology: true,
        UseNewUrlParser: true,
      }
    )
    .then(async () => {
      await LateSchema.findOneAndDelete({ _id: id });
      res.send("Ok");
    });
  }
  else{
    res.send("retour");
  }
});
routeExp.route("/reason").post(async function (req, res) {
  if (session.occupation_u == "User"){
    var reason = req.body.reason;
    mongoose
    .connect(
      "mongodb+srv://Rica:ryane_jarello5@cluster0.z3s3n.mongodb.net/Pointage?retryWrites=true&w=majority",
      {
        useUnifiedTopology: true,
        UseNewUrlParser: true,
      }
    )
    .then(async () => {
     await LateSchema.findOneAndUpdate({m_code:session.m_code,reason:""},{reason:reason});
     session.time= "y";
     res.send("Ok");
    })
  }
  else{
    res.redirect("/")
  } 
})
routeExp.route("/employee").get(async function (req, res) {
  session = req.session;
  if (session.occupation_u == "User"){
    mongoose
    .connect(
      "mongodb+srv://Rica:ryane_jarello5@cluster0.z3s3n.mongodb.net/Pointage?retryWrites=true&w=majority",
      {
        useUnifiedTopology: true,
        UseNewUrlParser: true,
      }
    )
    .then(async () => {
      var user = await UserSchema.findOne({m_code:session.m_code});
      if (session.time != "y"){
        res.render("Working.html",{user:user,retard:session.time});
      }
      else{
        res.render("Working.html",{user:user,retard:"n"});
      }
   
    })
  }
  else{
    res.redirect("/")
  } 
})
routeExp.route("/newuser").get(async function (req, res) {
  session = req.session;
  if (session.occupation_a == "Admin"){
  res.render("newuser.html");
  }
  else{
    res.redirect("/")
  }
})
routeExp.route("/home").get(async function (req, res) {
  session = req.session;
  if (session.occupation_a == "Admin"){
    mongoose
    .connect(
      "mongodb+srv://Rica:ryane_jarello5@cluster0.z3s3n.mongodb.net/Pointage?retryWrites=true&w=majority",
      {
        useUnifiedTopology: true,
        UseNewUrlParser: true,
      }
    )
    .then(async () => {
      res.render("dashboard.html");
    });
  }
  else{
    res.redirect("/");
  }
})
//Details
routeExp.route("/details").get(async function (req, res) {
  session = req.session;
  if (session.occupation_a == "Admin"){
    mongoose
    .connect(
      "mongodb+srv://Rica:ryane_jarello5@cluster0.z3s3n.mongodb.net/Pointage?retryWrites=true&w=majority",
      {
        useUnifiedTopology: true,
        UseNewUrlParser: true,
      }
    )
    .then(async () => {
      if (session.filtrage == ""){
        res.render("details.html",{timesheets:session.datatowrite});
      }
      else{
        var timesheets =  await StatusSchema.find({time_end:{ $ne: "" }});
        session.datatowrite = timesheets;
        res.render("details.html",{timesheets:timesheets});
      }  
    })
  }
  else{
    res.redirect("/");
  }
  })

routeExp.route("/management").get(async function (req, res) {
  session = req.session;
  if (session.occupation_a == "Admin"){
    session.filtrage = null;
    mongoose
    .connect(
      "mongodb+srv://Rica:ryane_jarello5@cluster0.z3s3n.mongodb.net/Pointage?retryWrites=true&w=majority",
      {
        useUnifiedTopology: true,
        UseNewUrlParser: true,
      }
    )
    .then(async () => {
      var alluser = await UserSchema.find({});
      res.render("status.html",{users:alluser});
    })
  }
  else{
    res.redirect("/");
  }
})
routeExp.route("/changepassword").get(async function (req, res) {
  res.render("change_password.html");
});
//getuser
routeExp.route("/getuser").post(async function (req, res) {
  var id = req.body.id;
  mongoose
  .connect(
    "mongodb+srv://Rica:ryane_jarello5@cluster0.z3s3n.mongodb.net/Pointage?retryWrites=true&w=majority",
    {
      useUnifiedTopology: true,
      UseNewUrlParser: true,
    }
  )
  .then(async () => {
    var user = await UserSchema.findOne({_id:id });
    res.send(user.first_name +","+user.last_name+","+user.m_code + ","+user.num_agent +","+user.shift);
  });
});
//Update User
routeExp.route("/updateuser").post(async function (req, res) {
  var id = req.body.id;
  var m_code = req.body.code;
  var num_agent = req.body.num;
  var amount = req.body.am;
  var first = req.body.first;
  var last = req.body.last;
  var shift = req.body.shift;
  mongoose
  .connect(
    "mongodb+srv://Rica:ryane_jarello5@cluster0.z3s3n.mongodb.net/Pointage?retryWrites=true&w=majority",
    {
      useUnifiedTopology: true,
      UseNewUrlParser: true,
    }
  )
  .then(async () => {
    var user = await UserSchema.findOne({_id:id });
      await StatusSchema.updateMany({m_code:user.m_code},{m_code:m_code,num_agent:num_agent,nom:first + " "+ last});
      await UserSchema.findOneAndUpdate({_id:id },{m_code:m_code,num_agent:num_agent,amount:amount,first_name:first,last_name:last,shift:shift});
      res.send("User updated successfully");
})
})
//Drop user 
routeExp.route("/dropuser").post(async function (req, res) {
  var names = req.body.fname;
  names = names.split(" ");
  mongoose
  .connect(
    "mongodb+srv://Rica:ryane_jarello5@cluster0.z3s3n.mongodb.net/Pointage?retryWrites=true&w=majority",
    {
      useUnifiedTopology: true,
      UseNewUrlParser: true,
    }
  )
  .then(async () => {
      await UserSchema.findOneAndDelete({first_name:names[0],last_name:names[1]});
      res.send("User deleted successfully");
});
});
routeExp.route("/userlist").get(async function (req, res) {
  session = req.session;
  if (session.occupation_a == "Admin"){
    session.filtrage = null;
    mongoose
    .connect(
      "mongodb+srv://Rica:ryane_jarello5@cluster0.z3s3n.mongodb.net/Pointage?retryWrites=true&w=majority",
      {
        useUnifiedTopology: true,
        UseNewUrlParser: true,
      }
    )
    .then(async () => {
      var alluser = await UserSchema.find({});
      res.render("userlist.html",{users:alluser});
    })
  }
  else{
    res.redirect("/");
  }
})
//Change password
routeExp.route("/checkmail").post(async function (req, res) {
  session = req.session
  var email = req.body.email;
  mongoose
    .connect(
      "mongodb+srv://Rica:ryane_jarello5@cluster0.z3s3n.mongodb.net/Pointage?retryWrites=true&w=majority",
      {
        useUnifiedTopology: true,
        UseNewUrlParser: true,
      }
    )
    .then(async () => {
      if (await UserSchema.findOne({ username: email })) {
        session.mailconfirm = email;
        session.code = randomCode();
        sendEmail(
          session.mailconfirm,
          "Verification code",
          htmlVerification(session.code)
        );
        res.send("done");
      } else {
        res.send("error");
      }
    });
})
routeExp.route("/checkcode").post(async function (req, res) {
  if (session.code == req.body.code) {
    res.send("match");
  } else {
    res.send("error");
  }
});
routeExp.route("/changepass").post(async function (req, res) {
  session = req.session
  var newpass = req.body.pass;
  let hash = crypto.createHash('md5').update(newpass).digest("hex");
  mongoose
    .connect(
      "mongodb+srv://Rica:ryane_jarello5@cluster0.z3s3n.mongodb.net/Pointage?retryWrites=true&w=majority",
      {
        useUnifiedTopology: true,
        UseNewUrlParser: true,
      }
    )
    .then(async () => {
      if (await UserSchema.findOne({username: session.mailconfirm,password:hash})){
        res.send("error")
      }
      else{
        await UserSchema.findOneAndUpdate(
          { username: session.mailconfirm },
          { password: hash,change:"y" }
        );
        session.mailconfirm = null;
        session.code = null;
        res.send("Ok");
      }
    });
});
routeExp.route("/startwork").post(async function (req, res) {
  session = req.session;
  var locaux = req.body.locaux;
  var date = moment().format("YYYY-MM-DD");
  var timestart = moment().add(3,'hours').format("HH:mm");

  var new_time = {
    m_code:session.m_code,
    num_agent : session.num_agent,
    date:date,
    time_start:timestart,
    time_end:"",
    nom:session.name,
    locaux:locaux
  }
  mongoose
    .connect(
      "mongodb+srv://Rica:ryane_jarello5@cluster0.z3s3n.mongodb.net/Pointage?retryWrites=true&w=majority",
      {
        useUnifiedTopology: true,
        UseNewUrlParser: true,
      }
    )
    .then(async () => {
        await StatusSchema(new_time).save();
    });
    res.send("Ok");
   
});

routeExp.route("/filter").post(async function (req, res) {
  session = req.session;
  if (session.occupation_a == "Admin"){
    session.filtrage = "";
  var searchit = req.body.searchit;
  var period = req.body.period;
  var datestart = "";
  var dateend = "";
  if (period == "t"){
    datestart = moment().format("YYYY-MM-DD");
  }
  else if (period == "tw"){
    datestart = moment().startOf("week").format("YYYY-MM-DD");
    dateend = moment().endOf("week").format("YYYY-MM-DD");
  }
  else if (period == "tm"){
    datestart = moment().startOf("month").format("YYYY-MM-DD");
    dateend = moment().endOf("month").format("YYYY-MM-DD");
  }
  else if  (period == "spec"){
    datestart = req.body.datestart;
    dateend= req.body.dateend
  }
  else{
    datestart = "";
    dateend = "";
  }
  var datecount = [];
  var datatosend = [];
  mongoose
    .connect(
      "mongodb+srv://Rica:ryane_jarello5@cluster0.z3s3n.mongodb.net/Pointage?retryWrites=true&w=majority",
      {
        useUnifiedTopology: true,
        UseNewUrlParser: true,
      }
    )
    .then(async () => {
      datestart == "" ? "" : datecount.push(1);
      dateend == "" ? "" : datecount.push(2);
      searchit == "" ? delete session.request.search  : session.request.search = searchit;
      if (datecount.length == 2) {
        var day = moment
          .duration(
            moment(dateend, "YYYY-MM-DD").diff(moment(datestart, "YYYY-MM-DD"))
          )
          .asDays();
        for (i = 0; i <= day; i++) {
          session.request.date = datestart;
          date_data.push(session.request.date);
          var getdata;
          if (session.request.search){
            getdata = await StatusSchema.find({$or: 
              [{ m_code: {'$regex':searchit,'$options' : 'i'} },
              { nom: {'$regex':searchit,'$options' : 'i'} },
              { locaux: {'$regex':searchit,'$options' : 'i'}},],date:session.request.date,time_end:{ $ne: "" }}).sort({
              "_id": -1,
            });
          }
          else{
            getdata = await StatusSchema.find({date:session.request.date,time_end:{ $ne: "" }});
          }
          if (getdata.length != 0) {
            datatosend.push(getdata);
          }
          var addday = moment(datestart, "YYYY-MM-DD")
            .add(1, "days")
            .format("YYYY-MM-DD");
          datestart = addday;
        }
        for (i = 1; i < datatosend.length; i++) {
         for (d=0;d<datatosend[i].length;d++){
            datatosend[0].push(datatosend[i][d]);
          }
        }
       
        if (datatosend.length != 0){
          session.datatowrite = datatosend[0];
          res.send(datatosend[0]);
        }
        else{
          session.datatowrite = datatosend;
          res.send(datatosend);
        }
        
      } else if (datecount.length == 1) {
        if (datecount[0] == 1) {
          session.request.date = datestart;
          if (session.request.search){
            datatosend = await StatusSchema.find({$or: 
              [{ m_code: {'$regex':searchit,'$options' : 'i'} },
              { nom: {'$regex':searchit,'$options' : 'i'} },
              { locaux: {'$regex':searchit,'$options' : 'i'}},],date:session.request.date,time_end:{ $ne: "" }}).sort({
              "_id": -1,
            });
          }
          else{
            datatosend = await StatusSchema.find({date:session.request.date});
          }
          session.datatowrite = datatosend;
          session.searchit = searchit;
          res.send(datatosend);
        } else {
          session.request.date = dateend;
          if (session.request.search){
            datatosend = await StatusSchema.find({$or: 
              [{ m_code: {'$regex':searchit,'$options' : 'i'} },
              { nom: {'$regex':searchit,'$options' : 'i'} },
              { locaux: {'$regex':searchit,'$options' : 'i'}},],date:session.request.date}).sort({
              "_id": -1,
            });
          }
          else{
            datatosend = await StatusSchema.find({date:session.request.date});
          }
          session.datatowrite = datatosend;
          session.searchit = searchit;
          res.send(datatosend);
        }
      } else {
        delete session.request.date;
        datatosend = await StatusSchema.find({$or: 
          [{ m_code: {'$regex':searchit,'$options' : 'i'} },
          { nom: {'$regex':searchit,'$options' : 'i'} },
          { locaux: {'$regex':searchit,'$options' : 'i'}},]}).sort({_id: -1,});
        session.datatowrite = datatosend;
        session.searchit = searchit;
        res.send(datatosend);
      }
    });
  }
  else{
    res.send("error");
  }
});

routeExp.route("/leftwork").post(async function (req, res) {
  session = req.session;
  var date = moment().format("YYYY-MM-DD");
  var timeend = moment().add(3,'hours').format("HH:mm");
  var locaux = req.body.locaux;
  mongoose
    .connect(
      "mongodb+srv://Rica:ryane_jarello5@cluster0.z3s3n.mongodb.net/Pointage?retryWrites=true&w=majority",
      {
        useUnifiedTopology: true,
        UseNewUrlParser: true,
      }
    )
    .then(async () => {
       await StatusSchema.findOneAndUpdate({m_code:session.m_code,date:date,locaux:locaux,time_end:""},{time_end:timeend});
        res.redirect("/exit_u");
    });
});
routeExp.route("/statuschange").post(async function (req, res) {
  session = req.session;
  if (session.occupation_u == "User"){
    var locaux = req.body.act_loc;
      var status = req.body.act_stat;
      mongoose
    .connect(
      "mongodb+srv://Rica:ryane_jarello5@cluster0.z3s3n.mongodb.net/Pointage?retryWrites=true&w=majority",
      {
        useUnifiedTopology: true,
        UseNewUrlParser: true,
      }
    )
    .then(async () => {
       await UserSchema.findOneAndUpdate({m_code:session.m_code},{act_stat:status,act_loc:locaux});
    });
  }
  res.send("Ok");
      
});
//Generate excel file
routeExp.route("/generate").post(async function (req, res) {
  session = req.session;
  if (session.occupation_a == "Admin") {
  var newsheet = ExcelFile.utils.book_new();
  newsheet.Props = {
    Title: "Timesheets",
    Subject: "Logged Time",
    Author: "Solumada",
  };
  mongoose
    .connect(
      "mongodb+srv://Rica:ryane_jarello5@cluster0.z3s3n.mongodb.net/Pointage?retryWrites=true&w=majority",
      {
        useUnifiedTopology: true,
        UseNewUrlParser: true,
      }
    )
    .then(async () => {
        var all_employes = [];
        for (i=0;i<session.datatowrite.length;i++){
           if (all_employes.includes(session.datatowrite[i].m_code)){

           }
           else{
             all_employes.push(session.datatowrite[i].m_code);
        }
        all_employes = all_employes.sort();
        }
        for (e = 0; e < all_employes.length; e++) {
          var name_user = await UserSchema.findOne({m_code:all_employes[e]});
          var retard = await LateSchema.find({m_code:all_employes[e],validation:true});
          console.log(retard);
          data.push([
            "SHEET OF => "+name_user.last_name+" "+name_user.first_name,
            "",
            "",
            "",
            "",
            "",
          ]);
          data.push([
            "",
            "",
            "",
            "",
            "",
            "",
          ]);
          data.push([
            "M-code",
            "Number of agent",
            "Date",
            "Locaux",
            "Start Time",
            "End Time",
          ]);
          var datanew = [];
          if (date_data.length != 0) {
            for (i = 0; i < session.datatowrite.length; i++) {
              if (session.datatowrite[i].m_code == all_employes[e]) {
                datanew.push(session.datatowrite[i]);
              }
            }
            generate_excel(datanew,retard);
            datanew = [];
          } else {
            generate_excel(session.datatowrite,retard);
          }

          if (newsheet.SheetNames.includes(all_employes[e])) {
          } else {
            newsheet.SheetNames.push(all_employes[e]);
          }
          newsheet.Sheets[all_employes[e]] = ws;
          hours = 0;
          minutes = 0;
          data = [];
        }  
        if (newsheet.SheetNames.length != 0) {
            if (all_employes.length > 1){
              session.filename = "N°"+num_file+" "+all_employes[0]+ ".xlsx";
              num_file++;
            }
            else{
              session.filename = "N°"+all_employes+" Timesheets.xlsx";
              num_file++;
            }
           
            ExcelFile.writeFile(newsheet, session.filename);
          delete session.request.searchit;
          delete session.request.date;
          delete session.request.search;
        }
      res.send("Done");
    });
  }else{
    res.redirect("/");
  }
});
routeExp.route("/download").get(async function (req, res) {
  session = req.session;
  if (session.occupation_a == "Admin") {
    res.download(session.filename, function(err){
      fs.unlink(session.filename, function (err) {            
        if (err) {                                                 
            console.error(err);                                    
        }                                                          
       console.log('File has been Deleted');                           
    });         
    });
  }
});
//Add employee
routeExp.route("/addemp").post(async function (req, res) {
  session = req.session;
  var email = req.body.email;
  var mcode = req.body.mcode;
  var num_agent = req.body.num_agent;
  var change = "n";
  var first = req.body.first_name;
  var occupation = req.body.occupation;
  var last = req.body.last_name;
  var shift = req.body.shift;
  mongoose
    .connect(
      "mongodb+srv://Rica:ryane_jarello5@cluster0.z3s3n.mongodb.net/Pointage?retryWrites=true&w=majority",
      {
        useUnifiedTopology: true,
        UseNewUrlParser: true,
      }
    )
    .then(async () => {
      if (
        await UserSchema.findOne({username: email})
      ) {
        res.send("error");
      } else {
        var passdefault = randomPassword();
        let hash = crypto.createHash('md5').update(passdefault).digest("hex");
        var new_emp = {
          username: email,
          first_name:first,
          last_name:last,
          password: hash,
          m_code: mcode,
          num_agent: num_agent,
          occupation: occupation,
          change:change,
          act_stat:"NONE",
          act_loc: "Not defined",
          shift:shift
        };
        await UserSchema(new_emp).save();
        sendEmail(
          email,
          "Authentification Solumada",
          htmlRender(email, passdefault)
        );
        res.send(email);
      }
    });
});
//logout
routeExp.route("/exit_a").get(function (req, res) {
  session = req.session;
  session.occupation_a = null;
  res.redirect("/");
});
routeExp.route("/exit_u").get(function (req, res) {
  session = req.session;
  session.occupation_u = null;
  session.mcode = null;
  session.num_agent = null;
  res.redirect("/");
});
function htmlVerification(code) {
  return (
    "<center><h1>YOUR TIMESHEETS CODE AUTHENTIFICATION</h1>" +
    "<h3 style='width:250px;font-size:50px;padding:8px;background-color: rgba(87,184,70, 0.8); color:white'>" +
    code +
    "<h3></center>"
  );
}
function htmlRender(username, password) {
  var html =
    "<center><h1>Solumada Authentification</h1>" +
    '<table border="1" style="border-collapse:collapse;width:25%;border-color: lightgrey;">' +
    '<thead style="background-color: rgba(87,184,70, 0.8);color:white;font-weight:bold;height: 50px;">' +
    "<tr>" +
    '<td align="center">Username</td>' +
    '<td align="center">Password</td>' +
    "</tr>" +
    "</thead>" +
    '<tbody style="height: 50px;">' +
    "<tr>" +
    '<td align="center">' +
    username +
    "</td>" +
    '<td align="center">' +
    password +
    "</td>" +
    "</tr>" +
    "</tbody>" +
    "</table>";
  return html;
}
function randomPassword() {
  var code = "";
  let v = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ!é&#";
  for (let i = 0; i < 8; i++) {
    // 6 characters
    let char = v.charAt(Math.random() * v.length - 1);
    code += char;
  }
  return code;
}
function sendEmail(receiver, subject, text) {
  var mailOptions = {
    from: "Timesheets Optimum solution",
    to: receiver,
    subject: subject,
    html: text,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
}
//Function Random code for verification
function randomCode() {
  var code = "";
  let v = "012345678";
  for (let i = 0; i < 6; i++) {
    // 6 characters
    let char = v.charAt(Math.random() * v.length - 1);
    code += char;
  }
  return code;
}
function calcul_timediff(startTime, endTime) {
  startTime = moment(startTime, "HH:mm:ss a");
  endTime = moment(endTime, "HH:mm:ss a");
  var duration = moment.duration(endTime.diff(startTime));
  //duration in hours
  hours += parseInt(duration.asHours());

  // duration in minutes
  minutes += parseInt(duration.asMinutes()) % 60;
  while (minutes > 60) {
    hours += 1;
    minutes = minutes - 60;
  }
}
function calcul_retard(regular,arrived){
  var time = 0;
  var lh = 0;
  var lm = 0;
  regular = moment(regular, "HH:mm:ss a");
  arrived = moment(arrived, "HH:mm:ss a");
  var duration = moment.duration(arrived.diff(regular));
  //duration in hours
  lh = parseInt(duration.asHours());
  // duration in minutes
  lm = parseInt(duration.asMinutes()) % 60;
  while (lm > 60) {
    lh += 1;
    lm = lm - 60;
  }
  lh = lh * 60;
  time = lh + lm;
  return time;
}
function style(){
  var cellule = ["A", "B", "C", "D", "E", "F"];
  for (c = 0; c < cellule.length; c++) {
    for (i = 1; i <= data.length; i++) {
      if (ws[cellule[c] + "" + i]) {
        if (i == 1 || i == 2) {
          ws[cellule[c] + "" + i].s = {
            font: {
              name: "Segoe UI Black",
              bold: true,
              color: { rgb: "398C39" },
            },
            alignment:{
                vertical : "center",
                horizontal:"center"
            },
          };
        }
        else if (i == 3) {
          ws[cellule[c] + "" + i].s = {
            fill:{
              patternType : "solid",
              fgColor : { rgb: "398C39" },
              bgColor: { rgb: "398C39" },
            },
            font: {
              name: "Segoe UI Black",
              bold: true,
              color: { rgb: "F5F5F5" }
            },
            border: {
              left: { style: "hair" },
              right: { style: "hair" },
              top: {
                style: "hair",
                bottom: { style: "hair" },
              },
            },
            alignment:{
                vertical : "center",
                horizontal:"center"
            },
          };
        } 
        else {
          ws[cellule[c] + "" + i].s = {
            font: {
              name: "Verdana",
              color: {rgb:"777777"}
            },
            border: {
              left: { style: "hair" },
              right: { style: "hair" },
              top: {
                style: "hair",
                bottom: { style: "hair" },
              },
            },
            alignment:{
              vertical : "center",
              horizontal:"center"
          },
          };
        }
      }
    }
  }
}
//Fonction generate excel
function generate_excel(datatowrites,retard) {
  for (i = 0; i < datatowrites.length; i++) {
    if (datatowrites[i].time_end != ""){
      var ligne = [
        datatowrites[i].m_code,
        datatowrites[i].num_agent,
        datatowrites[i].date,
        datatowrites[i].locaux,
        datatowrites[i].time_start,
        datatowrites[i].time_end,
      ];
      data.push(ligne);
      calcul_timediff(datatowrites[i].time_start, datatowrites[i].time_end);
    }
  }
  totaltime = hours + "H " + minutes + "MN";
  data.push(["", "", "", "", "TOTAL",totaltime]);
  data.push(["", "", "", "", "",""]);
  if(retard.length != 0){
    var cum = 0;
    data.push(["DELAYS REPORT", "", "", "", "",""]);
    data.push(["M-code", "Number of agent", "Date", "Reason", "Time",""]);
    for ( i = 0;i<retard.length ; i++){
      cum+=retard[i].time;
        var lateligne = [
          retard[i].m_code,
          retard[i].num_agent,
          retard[i].date,
          retard[i].reason,
          retard[i].time + " minutes",
        ];
        data.push(lateligne); 
    }
    data.push(["", "", "", "TOTAL", cum + " minutes"],"");

  }
  ws = ExcelFile.utils.aoa_to_sheet(data);
  ws["!cols"] = [
    {wpx: 80 },
    {wpx: 130},
    {wpx: 200},
    {wpx: 80},
    {wpx: 160},
    {wpx: 100 },
    {wpx: 100 }
  ];
  const merge = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 5}},
    { s: { r: 3, c: 0 }, e: { r: datatowrites.length + 2, c:0 }},
    { s: { r: 3, c: 1 }, e: { r: datatowrites.length + 2, c:1 }},
    {s: {r:datatowrites.length +5,c:0},e: {r:datatowrites.length+5,c:6}}
  ];
  ws["!merges"] = merge;
  style();
}

module.exports = routeExp;
