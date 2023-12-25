const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth"); 
const multer = require("../middleware/multer-config");
const resizeImg = require("../middleware/sharp"); 
const bookCtrl = require("../controllers/book");
const limiter = require("../middleware/rate-limit"); 



router.get("/", bookCtrl.getAllBooks);

router.get("/bestrating", bookCtrl.getBestRating);

router.post("/", auth, limiter, multer, resizeImg, bookCtrl.postBook);

router.get("/:id", bookCtrl.getOneBook);

router.put("/:id", auth, multer, resizeImg, bookCtrl.putBook);

router.delete("/:id", auth, bookCtrl.deleteBook);

router.post("/:id/rating", auth, bookCtrl.postRating);

module.exports = router;
