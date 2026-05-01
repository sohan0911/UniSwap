// Import express.js
const express = require("express");
var app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set("view engine", "pug");
app.set("views", __dirname + "/views");

app.use(express.static("public"));

const db = require("./services/db");
const session = require("express-session");
const bcrypt = require("bcryptjs");

app.use(session({
  secret: "uniswap-secret-key-123",
  resave: false,
  saveUninitialized: false
}));

// Make user available to all templates globally
app.use((req, res, next) => {
  res.locals.loggedInUser = req.session.user;
  next();
});

// ---------------- HOME PAGE ----------------
app.get("/", async function (req, res) {
  try {
    const sql = "SELECT * FROM listings ORDER BY id DESC LIMIT 3";
    const listings = await db.query(sql);
    res.render("index", { listings });
  } catch (error) {
    console.error("[GET /]", error);
    res.status(500).send("Error loading homepage");
  }
});

// ---------------- TEST ROUTES ----------------
app.get("/db_test", function (req, res) {
  const sql = "SELECT * FROM listings";
  db.query(sql).then((results) => res.send(results));
});

app.get("/goodbye", (req, res) => res.send("Goodbye world!"));
app.get("/hello/:name", (req, res) => res.send("Hello " + req.params.name));

// ---------------- USERS ----------------
app.get("/users", async function (req, res) {
  try {
    const sql = "SELECT id, name, email FROM users";
    const users = await db.query(sql);
    res.render("users", { users });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching users");
  }
});

app.get("/users/:id", async function (req, res) {
  try {
    const userId = req.params.id;
    const sql = "SELECT * FROM users WHERE id = ?";
    const results = await db.query(sql, [userId]);

    if (results.length === 0) return res.status(404).send("User not found");

    res.render("user-profile", { user: results[0] });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching user profile");
  }
});

// ---------------- TAGS ----------------
app.get("/tags", async function (req, res) {
  try {
    const tags = await db.query("SELECT id, name FROM tags ORDER BY name");
    res.render("tags", { tags });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching tags");
  }
});

app.get("/tags/:id", async function (req, res) {
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

// ---------------- LISTINGS ----------------
const listingsWithTagsSql =
  "SELECT l.*, " +
  "(SELECT GROUP_CONCAT(DISTINCT t.name ORDER BY t.name SEPARATOR ', ') " +
  "FROM listing_tags lt " +
  "JOIN tags t ON lt.tag_id = t.id " +
  "WHERE lt.listing_id = l.id) AS tag_names " +
  "FROM listings l " +
  "ORDER BY l.id DESC";

function listingsSqlFallback() {
  return "SELECT * FROM listings ORDER BY id DESC";
}

app.get("/listings/new", (req, res) => {
  res.render("listing-form", { error: null, body: {} });
});

app.post("/listings", async function (req, res) {
  try {
    const title = (req.body.title || "").trim();
    const description = (req.body.description || "").trim();
    const userId = parseInt(req.body.user_id, 10);
    const tagsRaw = req.body.tags || "";

    if (!title || !description || !userId) {
      return res.status(400).render("listing-form", {
        error: "Title, description, and user ID are required.",
        body: req.body,
      });
    }

    const insertResult = await db.query(
      "INSERT INTO listings (title, description, user_id) VALUES (?, ?, ?)",
      [title, description, userId]
    );

    const listingId = insertResult.insertId;

    const tagNames = tagsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const name of tagNames) {
      await db.query("INSERT IGNORE INTO tags (name) VALUES (?)", [name]);
      const rows = await db.query(
        "SELECT id FROM tags WHERE name = ? LIMIT 1",
        [name]
      );
      const tagId = rows[0].id;
      await db.query(
        "INSERT IGNORE INTO listing_tags (listing_id, tag_id) VALUES (?, ?)",
        [listingId, tagId]
      );
    }

    res.redirect("/listings/" + listingId);
  } catch (err) {
    console.error("[POST /listings]", err);
    res.status(500).render("listing-form", {
      error: "Could not create listing.",
      body: req.body,
    });
  }
});

app.get("/listings", async (req, res) => {
  try {
    let listings;
    try {
      listings = await db.query(listingsWithTagsSql, []);
    } catch (e) {
      listings = await db.query(listingsSqlFallback(), []);
    }
    res.render("listings", { listings: listings || [] });
  } catch (err) {
    console.error("[GET /listings]", err);
    res.status(500).send("Error fetching listings");
  }
});

// ---------------- LISTING DETAIL + RATINGS ----------------
app.get("/listings/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const listingSql =
      "SELECT l.*, u.name AS owner_name, u.email AS owner_email " +
      "FROM listings l " +
      "JOIN users u ON l.user_id = u.id " +
      "WHERE l.id = ?";
    const listingRows = await db.query(listingSql, [id]);

    if (!listingRows || listingRows.length === 0)
      return res.status(404).send("Listing not found");

    const listing = listingRows[0];

    const tagsSql =
      "SELECT t.id, t.name " +
      "FROM tags t " +
      "JOIN listing_tags lt ON t.id = lt.tag_id " +
      "WHERE lt.listing_id = ? " +
      "ORDER BY t.name";
    const tags = await db.query(tagsSql, [id]);

    const ratingsSql = `
      SELECT r.rating, r.comment, r.created_at, u.name AS user_name
      FROM listing_ratings r
      JOIN users u ON r.user_id = u.id
      WHERE r.listing_id = ?
      ORDER BY r.created_at DESC
    `;
    const ratings = await db.query(ratingsSql, [id]);

    res.render("listing-detail", { listing, tags, ratings });
  } catch (err) {
    console.error("[GET /listings/:id]", err);
    res.status(500).send("Error fetching listing details");
  }
});

app.get("/signup", function (req, res) {
  res.render("signup", { error: null, body: {} });
});

app.post("/signup", async function (req, res) {
  try {
    const { name, email, course, year, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).render("signup", { error: "Name, email, and password are required.", body: req.body });
    }
    
    const existing = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (existing && existing.length > 0) {
      return res.status(400).render("signup", { error: "Email already exists.", body: req.body });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      "INSERT INTO users (name, email, course, year, password) VALUES (?, ?, ?, ?, ?)", 
      [name, email, course || null, year || null, hashedPassword]
    );
    
    req.session.user = {
      id: result.insertId,
      name: name,
      email: email,
      course: course,
      year: year
    };
    
    res.redirect("/");
  } catch (err) {
    console.error("[POST /signup]", err);
    res.status(500).render("signup", { error: "Could not create user.", body: req.body });
  }
});

app.get("/login", function (req, res) {
  res.render("login", { error: null });
});

app.post("/login", async function (req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).render("login", { error: "Email and password are required." });
    }
    
    const rows = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    const user = rows[0];
    
    if (!user) {
      return res.status(401).render("login", { error: "Invalid credentials." });
    }
    
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).render("login", { error: "Invalid credentials." });
    }
    
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      course: user.course,
      year: user.year
    };
    
    res.redirect("/");
  } catch (err) {
    console.error("[POST /login]", err);
    res.status(500).render("login", { error: "Error during login." });
  }
});

app.get("/logout", function (req, res) {
  req.session.destroy();
  res.redirect("/");
});

// ---------------- SUBMIT RATING ----------------
app.post("/listings/:id/rate", async (req, res) => {
  const listingId = req.params.id;
  const { rating, comment } = req.body;

  const userId = 1; // TEMP

  try {
    const sql = `
      INSERT INTO listing_ratings (listing_id, user_id, rating, comment)
      VALUES (?, ?, ?, ?)
    `;
    await db.query(sql, [listingId, userId, rating, comment]);

    res.redirect("/listings/" + listingId);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving rating");
  }
});


// ---------------- START SERVER ----------------
app.listen(3000, function () {
  console.log(`Server running at http://127.0.0.1:3000/`);
});
