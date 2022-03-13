//  PACKAGES AND MODULES
const express = require("express")
const mongoose = require("mongoose")
const passport = require("passport")
const session = require("express-session")
const { User } = require("./models/user")
const { Post } = require("./models/post")
const path = require("path")
const bodyParser = require("body-parser")
const multer = require("multer")
const jsdom = require("jsdom")
const hashtagRegex = require("hashtag-regex")
const RegExp = require("regexp")



// BASIC VARIABLES
const app = express()
const PORT = 3000

let allFollowers = []



// UPLOAD PHOTO FUNCTION 
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/user_photo/')
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname))
    }
  })
  
const upload = multer({ storage: storage });




// MIDDLEWARES
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(session({
    secret: "avsd1234",
    resave: false,
    saveUninitialized: false
  }));
app.use(passport.authenticate("session"));
app.use(bodyParser.urlencoded({extended: true}))
// app.use(express.static(__dirname + "/user_photo"))
app.use(express.static("public"))
app.use(express.static("files"))
app.use(express.static("public/user_photo"))
app.use(upload.single("file"))

// MIDDLEWARE - CHECKS IF A USER IS LOGGED IN
const requireLogin = (req, res, next) => {  // Vi skapar en egen middleware "requireLogin" - Om req.user = true så går man till nästa steg, annars skciakr vi fel meddelande
    if (req.user) {
        next()
    } else {
        res.sendStatus(401)
    }
}



// ROUTING
app.get("/", (req, res) => {
    res.render("./login.ejs")
})

app.get("/login", (req, res) => {
    res.render("./login.ejs")
})

app.get("/posts", async (req, res) => {
    var mysort = { entryDate: -1 };
    const entries = await Post.find().sort(mysort)
    res.render("./posts.ejs", {entries})
})

app.get("/signup", (req, res) => {
    res.render("./signup.ejs")
})

app.get("/index", requireLogin, async (req, res) => {
    var mysort = { entryDate: -1 };
    const entries = await Post.find().sort(mysort)
    
    if (req.user) {
        res.render("./index.ejs", {
            username: req.user.username, 
            firstname: req.user.firstname, 
            entries,
            });
    } else {
        res.redirect("/login");
    }
})

app.get("/profile", requireLogin, async (req, res) => {
    var mysort = { entryDate: -1 };
    const entries = await Post.find().sort(mysort)
    const followers = allFollowers.filter(x => x == req.user.username).length

    res.render("./profile.ejs", {
        username: req.user.username,
        firstname: req.user.firstname,
        lastname: req.user.lastname,
        email: req.user.email,
        profilePicture: req.user.profilePicture,
        entryPhoto: req.user.profilePicture,
        following: req.user.following,
        allFollowers,
        followers,
        entries,
        })
})

app.get("/users/:userId", async (req, res) => {
    const userPosts = await Post.find({ entryUser: req.params.userId })
    res.render("user.ejs", { userPosts })
})



app.get("/hashtags/:tagId", async (req, res) => {
    
    const tags = await Post.find({ entryHashtag: req.params.tagId }) 
    
    res.render("hashtags.ejs", { tags })
})


// *******************************************************************

// CREATE NEW USER
app.post("/signup", async (req, res) => {
    const {username, password, firstname, lastname, email} = req.body;
    const user = new User({username, firstname, lastname, email});
    await user.setPassword(password);
    await user.save();
    res.redirect("/login");
  });



// MAIN PAGE
app.post("/login", passport.authenticate("local", {
    successRedirect: "/index"
}))



// LOGOUT FUNCTION
app.post("/logout", function(req, res){
    req.logout();
    res.redirect("/login");
})



// CREATE AND SUBMIT POSTS
app.post("/entries", async (req, res) => {
    const entryUser = req.user.username
    const entryFirstname = req.user.firstname
    const entryLastname = req.user.lastname
    const entryEmail = req.user.email
    const { entry } = req.body   
    const entryDate = new Date();
    const entryDateString = `${entryDate.toLocaleDateString()} at ${entryDate.toLocaleTimeString()}`
    const entryPhoto = req.user.profilePicture


    const regex = /(^|\B)#[\p{L}0-9]*/igu;
    const entryHashtag = entry.match(regex)
    
    console.log(entryHashtag)

    const newEntry = new Post({ entry, entryDate, entryUser, entryDateString, entryPhoto, entryFirstname, entryLastname, entryEmail, entryHashtag })
    await newEntry.save()
    res.redirect("/index")
})



// EDIT USER INFORMATION
app.post("/edit_user", async (req, res) => {
    var query = {"username": req.user.username}
    const {firstname, lastname, email} = req.body;

    console.log(firstname, lastname, email)
 
    User.findOneAndUpdate(query, {$set: {firstname : firstname, lastname: lastname, email: email}}, {new: true}, (err, doc) => {
        if (err) {
            console.log("Something wrong when updating data!");
        }
        res.redirect("/profile")
    })

})


// UPLOAD USER PHOTO
app.post("/upload", async (req, res) => {
    const user = req.user
    user.profilePicture = req.file.filename
    await user.save()

    res.redirect("/profile")
})



// Add the user located in params to the logged users "following" array
// and also in the allFollowers array which enables the functions to 
// calculate how many people are following this specific user.
app.post("/users/:userId", async (req, res) => {
    
    const following = req.user.following
    const newFollow = req.params.userId
    // const loggedUser = req.user.username 
        
    allFollowers.push(newFollow)
    following.push(newFollow)

    await req.user.save()
    res.redirect(`/users/${newFollow}`)
})


// Removes the user located in params from the logged users "following" array
// and also in the allFollowers array which in order to calculate how many 
// people are following this specific user.
app.post("/remove/:userId", async (req, res) => {
    const following = req.user.following
    const newFollow = req.params.userId
    // const loggedUser = req.user.username 
        
    const index = following.indexOf(newFollow)
    if (index > -1 ) {
        following.splice(index, 1)
    }

    const index2 = allFollowers.indexOf(newFollow)
    if (index2 > -1 ) {
        allFollowers.splice(index2, 1)
    }
    
    await req.user.save()
    res.redirect(`/users/${newFollow}`)
})




// CONNECTIONS
mongoose.connect("mongodb://localhost/micro_blogg").then(console.log("mongodb connected"))

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`)
})


