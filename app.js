const express = require("express");
const app = express();
const signin = require('./Sign in/ServerSignIn');
const signup = require('./Sign up/ServerSignUp');




app.use(express.json());

app.post('/auth/signin', signin);
app.post('/auth/signup', signup);

const PORT = 5000;
app.listen(PORT, () => "Server running");