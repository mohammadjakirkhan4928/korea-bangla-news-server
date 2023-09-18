const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Define user routes

router.get("/getblog", userController.getAllBlogs);
router.get("/getblog/:id", userController.getBlogById);
router.get("/author", userController.getAuthorDetails);
router.get("/relatedblogs/:id", userController.getRelatedBlogs);
router.post("/signup", userController.signupUser);
router.post("/savecomment", userController.saveComment);
router.get("/getcomments/:blogId", userController.getComments);

module.exports = router;
