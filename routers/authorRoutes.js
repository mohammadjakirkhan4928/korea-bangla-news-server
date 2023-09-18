const express = require('express');
const router = express.Router();
const { verifyIsAuthor } = require('../middelwares/authorMiddelware');
const authorController = require('../controllers/authorController');

// Define author routes
router.post('/authorlogin', authorController.authorLogin);
router.post('/forgotpassword', authorController.forgotPassword);
router.post('/resetpassword', authorController.resetPassword);

// Protected routes
router.post('/addblog', verifyIsAuthor, authorController.addBlog);
router.put('/updateblog/:id', verifyIsAuthor, authorController.updateBlog);

module.exports = router;
