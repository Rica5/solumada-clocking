const mongoose = require('mongoose');

const User = mongoose.Schema({
   username:String,
   last_name:String,
   first_name:String,
   password:String,
   m_code:String,
   num_agent:String,
   occupation:String,
   change:String,
   act_stat:String,
   act_loc:String,
   shift:String
})
module.exports = mongoose.model('cuser',User);