const express= require("express");
const router =express.Router();

// controllers
const {createUser}=require("../controllers/user");


// middleware
const emailExists=require("../middelware/user/emailExists");

router.post("/",emailExists,createUser);

module.exports=router;