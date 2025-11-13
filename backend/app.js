const express = require("express");
const app = express();
const signin = require('./auth/serverSignIn');
const signup = require('./auth/serverSignUp');

app.get("/", (req, res) => {
    // main page
});

app.get("/Sign in", (req, res) => {
    // sign in page
    }
)

app.get("/Sign up", (req, res) => {
        // sign up page
    }
)

app.get("/booking", (req, res) => {
        // booking
    }
)


app.use(express.json());

app.post('/auth/signin', signin);
app.post('/auth/signup', signup);

app.use('/auth', signUp);
app.use('/auth', signIn);

const PORT = 5000;
app.listen(PORT, () => console.log("Server running"));