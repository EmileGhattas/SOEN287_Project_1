const express = require("express");
const app = express();
const signin = require('./auth/serverSignIn');
const signup = require('./auth/serverSignUp');




app.use(express.json());

app.post('/auth/signin', signin);
app.post('/auth/signup', signup);

const PORT = 5000;
app.listen(PORT, () => "Server running");