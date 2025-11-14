const express = require("express");
const app = express();

const path = require("path");

const signin = require('./Routes/serverSignIn');
const signup = require('./Routes/serverSignUp');

// Gives us access to everything inside 'frontend' folder
app.use(express.static(path.join(__dirname, 'frontend')));

//main page connecting all the other files within the pages dir.
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'pages', 'landing.html'));
});

//Sign in page
//app.get("/Signin", (req, res) => {
 //   res.sendFile(path.join(__dirname, 'frontend', 'auth', 'signin.html'));
  //  }
//)

// sign up page
app.get("/Signup", (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'auth', 'signup.html'));
    }
)

// booking page
app.get("/booking", (req, res) => {

    res.sendFile(path.join(__dirname, 'frontend', 'facilities', 'signup.html'));
});



app.use(express.json());




const PORT = 5000;
app.listen(PORT, () => console.log("Server running"));