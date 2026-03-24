// Import express.js
const express = require("express");

// Create express app
var app = express();

<<<<<<< Updated upstream
// Add static files location
app.use(express.static("static"));

// Use the Pug templating engine
app.set('view engine', 'pug');
app.set('views', './app/views');
=======
app.set('view engine', 'pug');
app.set('views', __dirname + '/views');

app.use(express.static("public"));
>>>>>>> Stashed changes

// Get the functions in the db.js file to use
const db = require('./services/db');

// Create a route for root
app.get("/", async function(req, res) {
    try {
        const sql = "SELECT * FROM listings ORDER BY id DESC LIMIT 3";
        const listings = await db.query(sql);
        res.render("index", { listings });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading homepage");
    }
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

<<<<<<< Updated upstream
=======
// Route to display list of all users
app.get("/users", async function(req, res) {
    try {
        const sql = 'SELECT id, name, email FROM Users';
        const users = await db.query(sql);
        console.log(users);
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
        const sql = 'SELECT * FROM Users WHERE id = ?';
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

app.get("/tags", async function(req, res) {
    try {
        const tags = await db.query("SELECT id, name FROM tags ORDER BY name");
        res.render("tags", { tags });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching tags");
    }
});

app.get("/tags/:id", async function(req, res) {
    try {
        const tagId = req.params.id;
        const sql =
            "SELECT l.* FROM listings l " +
            "JOIN listing_tags lt ON l.id = lt.listing_id " +
            "WHERE lt.tag_id = ?";
        const listings = await db.query(sql, [tagId]);
        res.render("listings", { listings });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching listings");
    }
});

// Add the Listings Route
app.get('/listings', async (req, res) => {
  try {
    const listingsSql =
      'SELECT l.*, ' +
      '(SELECT GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR \', \') ' +
      'FROM listing_tags lt ' +
      'JOIN tags t ON lt.tag_id = t.id ' +
      'WHERE lt.listing_id = l.id) AS tag_names ' +
      'FROM listings l';
    const listings = await db.query(listingsSql, []);
    res.render('listings', { listings });
  } catch (err) {
    console.error(err);
    res.send('Error fetching listings');
  }
});

// Add Detail Route
app.get('/listings/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const listingSql =
        'SELECT l.*, u.name AS owner_name ' +
        'FROM listings l ' +
        'JOIN Users u ON l.user_id = u.id ' +
        'WHERE l.id = ?';
    const listingRows = await db.query(listingSql, [id]);

    if (listingRows.length === 0) {
      return res.status(404).send("Listing not found");
    }

    const listing = listingRows[0];

    const tagsSql =
        'SELECT t.name ' +
        'FROM tags t ' +
        'JOIN listing_tags lt ON t.id = lt.tag_id ' +
        'WHERE lt.listing_id = ?';
    const tags = await db.query(tagsSql, [id]);

    res.render('listing-detail', { listing, tags });
  } catch (err) {
    console.error(err);
    res.send('Error fetching listing details');
  }
});

>>>>>>> Stashed changes
// Start server on port 3000
app.listen(3000,function(){
    console.log(`Server running at http://127.0.0.1:3000/`);
});