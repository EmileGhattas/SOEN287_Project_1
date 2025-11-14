const express = require("express");
const db = require("../mysql2/db.js");
const router  = express.Router();




const db = sql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "287_D",
});
db.connect((err)=>{
    if(err){
        console.log("Error connecting to DataBase");
    }
    else{
        console.log("Connected");
    }
});

