const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
    username: {type: String, unique: true, required: true},
    password: String,
    firstname: {type: String},
    lastname: {type: String},
    email: {type: String},
    profilePicture: {type: String, default: "avatar.png"},
    following: {type: Array, 'default': []},
    followed: {type: Number, 'default': 0}
    }
  );


userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);
exports.User = User;