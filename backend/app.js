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
app.get("/Sign in", (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'auth', 'signin.html'));
    }
)

// sign up page
app.get("/Sign up", (req, res) => {
        // sign up page
    }
)

// booking page
app.get("/booking", (req, res) => {


});



app.use(express.json());

app.post('/auth/signin', signin);
app.post('/auth/signup', signup);

app.use('/Routes', signUp);
app.use('/Routes', signIn);

const PORT = 5000;
app.listen(PORT, () => console.log("Server running"));