const express = require("express"); 
const router = express.Router(); 

const userCtrl = require("../controllers/user"); 
const limiter = require("../middleware/rate-limit");

router.post("/signup", limiter, userCtrl.signup);


router.post("/login", userCtrl.login); 


module.exports = router;
