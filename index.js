const express = require("express");
const cors = require("cors"); // Add this line
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const { Server } = require("socket.io");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const port = process.env.PORT || 1000;

const app = express();
require("dotenv").config();
app.use(cors()); // Add this line
app.use(express.json());
app.use(cookieParser());

const http = require("http").createServer(app);

const io = new Server(http, {
  cors: {
    origin: "http://localhost:3000", // Replace this with your frontend URL
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

const uri = process.env.MONGODB_URI;

const OPENAI_API_KEY = "process.env.OPEN_API_KEY";

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("A user connected");

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  auth: {
    user: "raphaelle71@ethereal.email",
    pass: "UT8Xqq4EfsQcW9yXtp",
  },
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("Unauthorized access");
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

if (uri) {
  console.log("MongoDB connected");
}

async function run() {
  try {
    await client.connect();
    const blogCollection = client.db("epsBlog").collection("blog");
    const authorCollection = client.db("epsBlog").collection("authors");
    const userCollection = client.db("epsBlog").collection("user");
    const commentsCollection = client.db("epsBlog").collection("comments");


    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await userCollection.findOne(query);

      if (user?.role !== "admin") {
        return res.status(403).send({ message: "Forbidden access" });
      }

      next();
    };
    const verifyIsAuthor = async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          return res.status(401).send("Unauthorized access");
        }
        const token = authHeader.split(" ")[1];
        jwt.verify(token, process.env.ACCESS_TOKEN, async (err, decoded) => {
          if (err) {
            return res.status(403).send({ message: "Forbidden access" });
          }
          console.log("Decoded Token:", decoded);
          const author = await authorCollection.findOne({
            email: decoded.email,
          });
          console.log("Author:", author);
          if (!author) {
            return res.status(403).send({ message: "Forbidden access" });
          }
          req.author = author;
          next();
        });
      } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred while verifying the author");
      }
    };
    const removeExpiredResetTokens = async () => {
      try {
        const currentTimestamp = Date.now();
        const expiredTokens = await authorCollection
          .find({ resetTokenExpiry: { $lte: currentTimestamp } })
          .toArray();
        for (const token of expiredTokens) {
          await authorCollection.updateOne(
            { _id: token._id },
            { $unset: { resetToken: "", resetTokenExpiry: "" } }
          );
        }
      } catch (error) {
        console.error("Error removing expired reset tokens:", error);
      }
      // Schedule the next execution after one hour
      setTimeout(removeExpiredResetTokens, 60 * 60 * 1000); // 1 hour
    };
    // Call the function to start the scheduler
    removeExpiredResetTokens();

    // async function sendEmailToUsers(
    //   subject,
    //   blogTitle,
    //   blogUrl,
    //   userName,
    //   userEmail
    // ) {
    //   try {
    //     const mailOptions = {
    //       from: "mdjakirkhan4928@gmail.com", // Replace with your email address
    //       to: userEmail,
    //       subject: subject + " " + blogTitle,
    //       html: `
    //         <section class="max-w-2xl px-6 py-8 mx-auto bg-white">
    //         <main class="mt-8">
    //             <h2 class="text-gray-700">Hi ,${userName}</h2>
    //             <p class="mt-2 leading-loose text-gray-600">
    //                 ${blogTitle}
    //             </p>
    //             <a href="${blogUrl}">
    //               <button class="px-6 py-2 mt-4 text-sm font-mediu bg-blue-500">
    //                   Read this news
    //               </button>
    //             </a>
    //             <p class="mt-8 text-gray-600">
    //                 Thanks, <br>
    //                 Banglakoreanews.com team
    //             </p>
    //         </main>
    //         <footer class="mt-5">
    //             <p class="text-gray-500">
    //                 This email was sent to <a href="#" class="text-blue-600 hover:underline" target="_blank">contact@banglakoreanews.com</a>.
    //             </p>
    //             <p class="mt-3 text-gray-500">© Banglakoreanews.com. All Rights Reserved.</p>
    //         </footer>
    //       </section>`,
    //     };

    //     await transporter.sendMail(mailOptions);
    //     console.log("Email sent to:", userEmail);
    //   } catch (error) {
    //     console.error("Error sending email:", error);
    //   }
    // }

    /////////////////// finis middelware //////////////

    //////////////////////////// user related //////////////////////////////

    app.get("/", async (req, res) => {
      res.send("Blog server is running");
    });
    app.get("/getblog", async (req, res) => {
      try {
        const blogs = await blogCollection.find().toArray();
        res.json(blogs);
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .send("An error occurred while retrieving the blog posts");
      }
    });

    app.get("/getblog/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const blog = await blogCollection.findOne({ _id: new ObjectId(id) });
        if (!blog) {
          res.status(404).send("Blog not found");
        } else {
          res.json(blog);
        }
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .send("An error occurred while retrieving the blog post");
      }
    });
    app.get("/author", async (req, res) => {
      try {
        const { name } = req.query;

        if (!name) {
          res.status(400).send("Author name is required");
          return;
        }

        const author = await authorCollection.findOne({ authorname: name });

        if (!author) {
          res.status(404).send("Author not found");
        } else {
          res.json(author);
        }
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .send("An error occurred while retrieving the author details");
      }
    });
    app.get("/relatedblogs/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const blog = await blogCollection.findOne({ _id: new ObjectId(id) });

        if (!blog) {
          return res.status(404).json({ message: "Blog not found" });
        }

        const relatedBlogs = await blogCollection
          .find({ category: blog.category, _id: { $ne: blog._id } })
          .toArray();

        res.json(relatedBlogs);
      } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred while fetching related blogs");
      }
    });
    app.post("/signup", async (req, res) => {
      const user = req.body;
      const existingUser = await userCollection.findOne({ email: user.email });
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "User with this email already exists" });
      }
      const result = await userCollection.insertOne(user);
      if (result.ops && result.ops.length > 0) {
        const newUser = result.ops[0];
        io.emit("newUserAdded", newUser._id);

        res
          .status(201)
          .json({ message: "User created successfully", user: result.ops[0] });
      } else {
        res.status(500).json({ message: "Failed to create user" });
      }
    });
    app.post("/savecomment",verifyJWT, async (req, res) => {
      try {
        const { blogId, comment, name, email, photo } = req.body;
        console.log("Request body:", req.body);
        const blog = await blogCollection.findOne({
          _id: new ObjectId(blogId),
        });
        if (!blog) {
          res.status(404).send("Blog not found");
          return;
        }
        // Fetch user data from userCollection if 'photo'and 'name' is null
        let userPhoto = photo;
        let userName = name ;
        if (!userPhoto) {
          const user = await userCollection.findOne({ email });
          userPhoto = user?.profileUrl ;
          userName = user.name ;
        }
        // Get the current date and time in the local time zone
        const currentDate = new Date();
        const formattedDate = currentDate.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "numeric",
          year: "numeric",
        });
        const formattedTime = currentDate.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        });
        // Concatenate formattedDate and formattedTime into a single field
        const formattedDateTime = `${formattedTime}-${formattedDate}`;
        // Construct the comment object
        const commentObject = {
          blogId: blog._id,
          comment,
          name: userName || "Anonymous",
          email,
          photo: userPhoto,
          createdAt: formattedDateTime,
        };

        // Insert the comment into commentsCollection
        const savedComment = await commentsCollection.insertOne(commentObject);

        // Emit a real-time update to all clients with the new comment data
        io.emit("newCommentAdded", savedComment);

        console.log("Saved comment:", savedComment);
        res.json(savedComment);
      } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred while saving the comment");
      }
    });
    app.get("/getcomments/:blogId", async (req, res) => {
      try {
        const { blogId } = req.params;
        const comments = await commentsCollection
          .find({ blogId: new ObjectId(blogId) })
          .toArray();
        res.json(comments);
      } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred while retrieving the comments");
      }
    });




    ///////////////////////////author dashboard related////////////////////////////

    app.post("/authorlogin", async (req, res) => {
        const { email, password } = req.body;
        try {
          // Check if the user exists in authorCollection
          const author = await authorCollection.findOne({ email });
          if (!author) {
            throw new Error("Invalid credentials");
          }
          // Compare the provided password with the stored hashed password
          const validPassword = await bcrypt.compare(password, author.password);
          if (!validPassword) {
            throw new Error("Invalid credentials");
          }
          // Both user and authorCollection record exist, generate token
          const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
            expiresIn: "1h",
          });
          // Find the author's blogs from the blogCollection
          const authorBlogs = await blogCollection
            .find({ authorName: author.authorname })
            .toArray();
          // Include the author's information in the response
          const authorInfo = {
            _id: author._id,
            authorimg: author.authorimg,
            authorname: author.authorname,
            authorebio: author.authorebio,
            location: author.location,
            email: author.email,
            facebook: author.facebook,
            twitter: author.twitter,
            instagram: author.instagram,
            youtube: author.youtube,
          };
          res.json({ token, author: authorInfo, blogs: authorBlogs });
        } catch (error) {
          console.error(error);
          res.status(401).json({ message: "Invalid credentials" });
        }
      });
    app.post("/addblog", verifyIsAuthor, async (req, res) => {
      try {
        const {
          title,
          imgUrl,
          description,
          date,
          category,
          authorId,
          authorName,
          authorImg,
        } = req.body;

        const blog = {
          title,
          imgUrl,
          description,
          date,
          category,
          authorId,
          authorName,
          authorImg,
        };
        console.log("Received Blog Data:", blog);
        const insertedBlog = await blogCollection.insertOne(blog);
        const blogId = insertedBlog.insertedId;

        // Emit a real-time update to all clients with the new blog data
        io.emit("newBlogAdded", blog);

        // // Send an email to all users
        // const subject = " "; // You can specify your subject here
        // const blogTitle = req.body.title;
        // const blogUrl = `http://localhost:3000/blog/${blogId}`; // Replace with your actual blog URL
        // const users = await userCollection.find({}).toArray();
        // // Send emails to users and wait for all emails to be sent
        // await Promise.all(
        //   users.map((user) =>
        //     sendEmailToUsers(subject, blogTitle, blogUrl, user.name, user.email)
        //   )
        // );
        console.log("News added successfully!"); // Log a success message to debug
        res.json({ _id: blogId }); // Respond with the inserted blog ID
      } catch (error) {
        console.error("Error adding the blog:", error);
        res.status(500).send("An error occurred while adding the blog post");
      }
    });
    app.put("/updateblog/:id", verifyIsAuthor, async (req, res) => {
      try {
        const { id } = req.params; // id is already a string containing the hexadecimal _id
        const updatedBlogData = req.body;

        const result = await blogCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedBlogData }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).send("Blog not found");
        }

        // Get the updated blog from the database and emit the real-time update
        const updatedBlog = await blogCollection.findOne({
          _id: new ObjectId(id),
        });
        io.emit("blogUpdated", updatedBlog);

        res.json({ message: "Blog updated successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred while updating the blog");
      }
    });
    app.put("/authorprofilesettings/:authorId",verifyIsAuthor,
      async (req, res) => {
        try {
          const { authorId } = req.params;
          const updatedProfileData = req.body;

          // Update the author's profile information in the database
          const authorResult = await authorCollection.updateOne(
            { _id: new ObjectId(authorId) },
            { $set: updatedProfileData }
          );

          if (authorResult.modifiedCount > 0) {
            // Update blogs in the blogCollection that have the same authorId with the new authorName and authorImg
            const blogResult = await blogCollection.updateMany(
              { authorId: authorId },
              {
                $set: {
                  authorName: updatedProfileData.authorname,
                  authorImg: updatedProfileData.authorimg,
                },
              }
            );

            if (blogResult.modifiedCount > 0) {
              // Emit the 'authorProfileUpdated' event with the updated author ID
              io.emit("authorProfileUpdated", {
                authorId: authorId,
                authorName: updatedProfileData.authorname,
                authorImg: updatedProfileData.authorimg,
              });
              res.json({
                message:
                  "Author profile and related blogs updated successfully",
              });
            } else {
              res.status(404).json({ error: "No blogs found for the author" });
            }
          } else {
            res.status(404).json({ error: "Author not found" });
          }
        } catch (error) {
          console.error("Error updating author profile:", error);
          res.status(500).json({ error: "Failed to update author profile" });
        }
      }
    );
    app.post("/forgot-password", async (req, res) => {
      const email = req.body.email;
      try {
        const author = await authorCollection.findOne({ email });
        if (!author) {
          return res.sendStatus(404);
        }
        // Generate a unique reset token
        const resetToken = process.env.ACCESS_TOKEN; // Implement your own token generation logic
        // Store the reset token and its expiration time in the author document
        const resetTokenExpiry = Date.now() + 3600000; // 1 hour
        const result = await authorCollection.updateOne(
          { email },
          { $set: { resetToken, resetTokenExpiry } }
        );
        if (result.modifiedCount === 0) {
          return res.sendStatus(500);
        }
        // Define the resetURL variable
        const resetURL = `http://localhost:3000/authorresetpassword?token=${resetToken}`;

        // Send the reset password email
        async function sendEmail() {
          try {
            const mailOptions = {
              from: "epsnewsbd@gmail.com", // Replace with your email address
              to: email, // Set the recipient dynamically
              subject: "Password Reset",
              text: `Hello ${author.authorname},\n\nYou have requested to reset your password. Click the following link to reset your password:\n${resetURL}\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nYour App Team`,
              html: `<p>Hello ${author.authorname},</p>
          <p>You have requested to reset your password.</p>
          <p><a href="${resetURL}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #ffffff; text-decoration: none;">Reset Password</a></p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Best regards,<br>Your App Team</p>`,
            };
            const info = await transporter.sendMail(mailOptions);
            console.log("Message sent: %s", info.messageId);
            return res.sendStatus(200);
          } catch (err) {
            console.error("Error sending password reset email:", err);
            return res.sendStatus(500);
          }
        }
        await sendEmail();
      } catch (error) {
        console.error("Error finding author:", error);
        res.sendStatus(500);
      }
    });
    app.post("/reset-password", async (req, res) => {
      const resetToken = req.body.token;
      const newPassword = req.body.newPassword;
      try {
        const author = await authorCollection.findOne({ resetToken });
        if (!author) {
          return res.sendStatus(404);
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const result = await authorCollection.updateOne(
          { resetToken },
          {
            $set: { password: hashedPassword },
            $unset: { resetToken: "", resetTokenExpiry: "" },
          }
        );
        if (result.modifiedCount === 0) {
          // Error updating author document
          return res.sendStatus(500);
        }
        res.sendStatus(200);
      } catch (error) {
        console.error("Error updating author document:", error);
        res.sendStatus(500);
      }
    });

    /////////////////////////// Adminrouters //////////////////////////////////////
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "1h",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await userCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });
    app.get("/users", async (req, res) => {
      const query = {};
      const users = await userCollection.find(query).toArray();
      res.send(users);
    });
    app.put("/users/admin/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      if (result.modifiedCount > 0) {
        // Emit the 'userMadeAdmin' event with the updated user ID
        io.emit("userMadeAdmin", id);
      }

      res.send(result);
    });
    app.delete("/users/admin/:id", verifyJWT, verifyAdmin, async (req, res) => {
      try {
        const { id } = req.params;
        const filter = { _id: new ObjectId(id) };
        const user = await userCollection.findOne(filter);

        if (!user) {
          return res.status(404).send("User not found");
        }

        const updatedUser = await userCollection.updateOne(filter, {
          $unset: { role: "" },
        });

        if (updatedUser.modifiedCount > 0) {
          // Emit the 'userDeleted' event with the deleted user ID
          io.emit("userDeleted", id);
          return res.json({ message: "User role deleted successfully" });
        } else {
          return res.status(404).send("User not found");
        }
      } catch (error) {
        console.error(error);
        return res
          .status(500)
          .send("An error occurred while deleting the user role");
      }
    });
    app.get("/getauthor", async (req, res) => {
      const query = {};
      const users = await authorCollection.find(query).toArray();
      res.send(users);
    });
    app.post("/addauthor", verifyJWT, verifyAdmin, async (req, res) => {
      try {
        // Assuming you have the author data received from the client-side
        const authorData = req.body;
        // Hash the password using bcrypt
        const hashedPassword = await bcrypt.hash(authorData.password, 10);
        // Create a new author object with the hashed password
        const newAuthor = {
          authorimg: authorData.authorimg,
          authorname: authorData.authorname,
          authorebio: authorData.authorebio,
          password: hashedPassword,
          location: authorData.location,
          email: authorData.email,
          facebook: authorData.facebook,
          instagram: authorData.instagram,
          twitter: authorData.twitter,
          youtube: authorData.youtube,
        };
        // Insert the new author into the author collection
        const result = await authorCollection.insertOne(newAuthor);

        // Get the inserted author document
        const authorId = result.insertedId;

        io.emit("newAuthorAdded", authorId);

        // Return the inserted author's ID as the response
        res.status(201).json(authorId);
      } catch (error) {
        console.error("Error adding author:", error);
        res.status(500).json({ error: "Failed to add author" });
      }
    });
    app.delete("/deleteauthor/:authorId",verifyJWT,verifyAdmin,
      async (req, res) => {
        try {
          const { authorId } = req.params;
          console.log(authorId);
          // Validate authorId
          if (!ObjectId.isValid(authorId)) {
            return res.status(400).send("Invalid authorId");
          }
          // Check if the author exists
          const author = await authorCollection.findOne({
            _id: new ObjectId(authorId),
          });
          if (!author) {
            return res.status(404).send("Author not found");
          }
          // Delete the author from the collection
          const result = await authorCollection.deleteOne({
            _id: new ObjectId(authorId),
          });
          if (result.deletedCount === 0) {
            return res.status(404).send("Author not found");
          }

          io.emit("authorDeleted", authorId);

          res.json({ message: "Author deleted successfully" });
        } catch (error) {
          console.error(error);
          res.status(500).send("An error occurred while deleting the author");
        }
      }
    );


    ////////////////////////////// finish adminrouters ///////////////////////

    http.listen(port, () => console.log(`blog running on ${port}`));
  } catch (err) {
    console.error(err);
  } finally {
    // await client.close();
  }
}

run().catch(console.error);

// Debugging middleware
app.use((req, res, next) => {
  console.log("Request received:", req.method, req.url);
  next();
});

module.exports = app;
