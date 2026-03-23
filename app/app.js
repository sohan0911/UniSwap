// Import express.js
const express = require("express");

// Create express app
var app = express();

// Add static files location
app.use(express.static("static"));

// Use the Pug templating engine
app.set('view engine', 'pug');
app.set('views', './app/views');

// Get the functions in the db.js file to use
const db = require('./services/db');

// Create a route for root
app.get("/", function(req, res) {
    res.render("index");
});

// Create a route for testing the db
app.get("/db_test", function(req, res) {
    // Assumes a table called test_table exists in your database
    sql = 'select * from test_table';
    db.query(sql).then(results => {
        console.log(results);
        res.send(results)
    });
});

// Create a route for /goodbye
// Responds to a 'GET' request
app.get("/goodbye", function(req, res) {
    res.send("Goodbye world!");
});

// Create a dynamic route for /hello/<name>, where name is any value provided by user
// At the end of the URL
// Responds to a 'GET' request
app.get("/hello/:name", function(req, res) {
    // req.params contains any parameters in the request
    // We can examine it in the console for debugging purposes
    console.log(req.params);
    //  Retrieve the 'name' parameter and use it in a dynamically generated page
    res.send("Hello " + req.params.name);
});

// Route to display list of all users
app.get("/users", async function(req, res) {
    try {
        const sql = 'SELECT id, name, email, course, year FROM users';
        const users = await db.query(sql);
        res.render("users", { users: users });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching users");
    }
});

// Route to display a single user's profile
app.get("/users/:id", async function(req, res) {
    try {
        const userId = req.params.id;
        const sql = 'SELECT * FROM users WHERE id = ?';
        const results = await db.query(sql, [userId]);

        if (results.length === 0) {
            return res.status(404).send("User not found");
        }

        res.render("user-profile", { user: results[0] });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching user profile");
    }
});

// Start server on port 3000
app.listen(3000,function(){
    console.log(`Server running at http://127.0.0.1:3000/`);
});