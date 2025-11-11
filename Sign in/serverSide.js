const express = require("express");
const sql = require("mysql2");

const app = express();

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
