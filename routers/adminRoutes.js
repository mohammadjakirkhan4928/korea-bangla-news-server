const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Generate JWT token
router.get("/jwt", adminController.generateToken);

// Check if user is admin
router.get("/users/admin/:email", adminController.checkAdminStatus);

// Get all users
router.get("/users", adminController.getAllUsers);

// Promote user to admin
router.put("/users/admin/:id", adminController.promoteToAdmin);

// Remove admin role from user
router.delete("/users/admin/:id", adminController.removeAdminRole);

// Get all authors
router.get("/getauthor", adminController.getAllAuthors);

// Delete author
router.delete("/deleteauthor/:authorId", adminController.deleteAuthor);

// Add author
router.post("/addauthor", adminController.addAuthor);

module.exports = router;
