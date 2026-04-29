// Import express.js
const express = require("express");
const bcrypt = require('bcrypt');
const session = require('express-session');

// Create express app
var app = express();

// Add the View Engine
app.set('view engine', 'pug');
app.set('views', __dirname + '/views');

// Add static files location
app.use(express.static("static"));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'uniswapsecret',
  resave: false,
  saveUninitialized: false
}));

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
    sql = 'select * from listings';
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

// Register route
app.get('/register', function(req, res) {
    res.render('register');
});

app.post('/register', async function(req, res) {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.send('All fields are required');
    }

    if (password.length < 6) {
        return res.send('Password must be at least 6 characters');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
        [name, email, hashedPassword]
    );

    res.redirect('/login');
});

// Start server on port 3000
app.listen(3000,function(){
    console.log(`Server running at http://127.0.0.1:3000/`);
});

// Add the Listings Route
app.get('/listings', async (req, res) => {
  try {
    const listings = await db.query('SELECT * FROM listings');
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
    const result = await db.query('SELECT * FROM listings WHERE id = ?', [id]);

    const listing = result[0];

    res.render('listing-detail', { listing });
  } catch (err) {
    console.error(err);
    res.send('Error fetching listing details');
  }
});

// login route

app.get('/login', function(req, res) {
    res.render('login');
});

app.post('/login', async function(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.send('Enter email and password');
    }

    const users = await db.query(
        'SELECT * FROM users WHERE email = ?',
        [email]
    );

    if (users.length === 0) {
        return res.send('User not found');
    }

    const user = users[0];

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
        return res.send('Wrong password');
    }

    req.session.user = user;

    res.redirect('/profile');
});

// profile page route
app.get('/profile', function(req, res) {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    res.send(
        'Welcome ' +
        req.session.user.name +
        ' | <a href="/logout">Logout</a>'
    );
});

// Logout Route
app.get('/logout', function(req, res) {
    req.session.destroy(function() {
        res.redirect('/login');
    });
});