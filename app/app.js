const express = require("express");
const bcrypt = require("bcryptjs");
const session = require("express-session");

const db = require("./services/db");
const migrate = require("./services/migrate");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set("view engine", "pug");
app.set("views", __dirname + "/views");

app.use(express.static("public"));
app.use(express.static("static"));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "uniswap-secret-key-123",
    resave: false,
    saveUninitialized: false,
  })
);

app.use((req, res, next) => {
  res.locals.loggedInUser = req.session.user || null;
  next();
});

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

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
    const userId = parseInt(req.params.id, 10);
    const userSql = `
      SELECT u.*,
        COALESCE(ur.avg_rating, 0) AS avg_rating,
        COALESCE(ur.rating_count, 0) AS rating_count
      FROM users u
      LEFT JOIN (
        SELECT rated_user_id, AVG(rating) AS avg_rating, COUNT(*) AS rating_count
        FROM user_ratings
        GROUP BY rated_user_id
      ) ur ON ur.rated_user_id = u.id
      WHERE u.id = ?
      LIMIT 1
    `;
    const results = await db.query(userSql, [userId]);
    if (!results.length) return res.status(404).send("User not found");

    const ratings = await db.query(
      `
        SELECT r.rating, r.comment, r.created_at, u.name AS rater_name
        FROM user_ratings r
        JOIN users u ON u.id = r.rater_user_id
        WHERE r.rated_user_id = ?
        ORDER BY r.created_at DESC
        LIMIT 10
      `,
      [userId]
    );

    res.render("user-profile", { user: results[0] });
    let completedSwapsBetween = [];
    if (req.session.user && req.session.user.id && req.session.user.id !== userId) {
      const me = req.session.user.id;
      completedSwapsBetween = await db.query(
        `
          SELECT
            s.id,
            s.created_at,
            l1.title AS requester_listing_title,
            l2.title AS responder_listing_title,
            s.requester_id,
            s.responder_id
          FROM swaps s
          JOIN listings l1 ON l1.id = s.requester_listing_id
          JOIN listings l2 ON l2.id = s.responder_listing_id
          WHERE s.status = 'completed'
            AND ((s.requester_id = ? AND s.responder_id = ?) OR (s.requester_id = ? AND s.responder_id = ?))
          ORDER BY s.updated_at DESC, s.id DESC
        `,
        [me, userId, userId, me]
      );
    }

    res.render("user-profile", { user: results[0], ratings, completedSwapsBetween });
=======
    res.render("user-profile", { user: results[0], ratings });

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

app.get("/listings/new", function (req, res) {
app.get("/listings/new", requireLogin, (req, res) => {
=======
app.get("/listings/new", (req, res) => {

  res.render("listing-form", { error: null, body: {} });
});

app.post("/listings", async function (req, res) {
  try {
    const title = (req.body.title || "").trim();
    const description = (req.body.description || "").trim();
    const userId = parseInt(req.body.user_id, 10);
    const hasItem = (req.body.has_item || "").trim();
    const wantsItem = (req.body.wants_item || "").trim();
    const tagsRaw = req.body.tags || "";

    if (!title || !description || !userId || !hasItem || !wantsItem) {
      return res.status(400).render("listing-form", {
        error: "Title, description, and user ID are required.",
    const userId = req.session.user ? req.session.user.id : null;
    const hasItem = (req.body.has_item || "").trim();
    const wantsItem = (req.body.wants_item || "").trim();
    const tagsRaw = req.body.tags || "";

    if (!userId) return res.redirect("/login");

    if (!title || !description || !hasItem || !wantsItem) {
      return res.status(400).render("listing-form", {
        error: "Title, description, and swap fields (has/wants) are required.",
=======
        error: "Title, description, user ID, and swap fields (has/wants) are required.",

        body: req.body,
      });
    }

    const insertResult = await db.query(
      "INSERT INTO listings (title, description, user_id, has_item, wants_item) VALUES (?, ?, ?, ?, ?)",
      [title, description, userId, hasItem, wantsItem]
    );

    const listingId = insertResult.insertId;

    const tagNames = tagsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const name of tagNames) {
      await db.query("INSERT IGNORE INTO tags (name) VALUES (?)", [name]);
      const rows = await db.query("SELECT id FROM tags WHERE name = ? LIMIT 1", [name]);
      const tagId = rows[0].id;
      await db.query("INSERT IGNORE INTO listing_tags (listing_id, tag_id) VALUES (?, ?)", [listingId, tagId]);
    }

    await db.query("UPDATE users SET points = COALESCE(points, 0) + 5 WHERE id = ?", [userId]);

    res.redirect("/listings/" + listingId);
  } catch (err) {
    console.error("[POST /listings]", err);
    res.status(500).render("listing-form", {
      error: "Could not create listing.",
      body: req.body,
    });
  }
});

// ---------------- MY LISTINGS (owner-only) ----------------
app.get("/my-listings", requireLogin, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const listings = await db.query(
      `
        SELECT l.*,
          (SELECT GROUP_CONCAT(DISTINCT t.name ORDER BY t.name SEPARATOR ', ')
           FROM listing_tags lt
           JOIN tags t ON lt.tag_id = t.id
           WHERE lt.listing_id = l.id) AS tag_names
        FROM listings l
        WHERE l.user_id = ?
        ORDER BY l.id DESC
      `,
      [userId]
    );
    res.render("my-listings", { listings });
  } catch (err) {
    console.error("[GET /my-listings]", err);
    res.status(500).send("Error loading your listings");
  }
});

app.get("/my-listings/:id/edit", requireLogin, async (req, res) => {
  try {
    const listingId = parseInt(req.params.id, 10);
    const userId = req.session.user.id;

    const rows = await db.query("SELECT * FROM listings WHERE id = ? LIMIT 1", [listingId]);
    if (!rows.length) return res.status(404).send("Listing not found");
    const listing = rows[0];
    if (listing.user_id !== userId) return res.status(403).send("Not allowed");

    const tagRows = await db.query(
      `
        SELECT t.name
        FROM listing_tags lt
        JOIN tags t ON t.id = lt.tag_id
        WHERE lt.listing_id = ?
        ORDER BY t.name
      `,
      [listingId]
    );
    const tags = tagRows.map((t) => t.name).join(", ");

    res.render("listing-edit", { error: null, listing, tags });
  } catch (err) {
    console.error("[GET /my-listings/:id/edit]", err);
    res.status(500).send("Error loading edit page");
  }
});

app.post("/my-listings/:id/edit", requireLogin, async (req, res) => {
  try {
    const listingId = parseInt(req.params.id, 10);
    const userId = req.session.user.id;

    const rows = await db.query("SELECT * FROM listings WHERE id = ? LIMIT 1", [listingId]);
    if (!rows.length) return res.status(404).send("Listing not found");
    const listing = rows[0];
    if (listing.user_id !== userId) return res.status(403).send("Not allowed");

    const title = (req.body.title || "").trim();
    const description = (req.body.description || "").trim();
    const hasItem = (req.body.has_item || "").trim();
    const wantsItem = (req.body.wants_item || "").trim();
    const tagsRaw = (req.body.tags || "").trim();

    if (!title || !description || !hasItem || !wantsItem) {
      return res.status(400).render("listing-edit", {
        error: "Title, description, and swap fields (has/wants) are required.",
        listing: { ...listing, title, description, has_item: hasItem, wants_item: wantsItem },
        tags: tagsRaw,
      });
    }

    await db.query(
      "UPDATE listings SET title = ?, description = ?, has_item = ?, wants_item = ? WHERE id = ?",
      [title, description, hasItem, wantsItem, listingId]
    );

    await db.query("DELETE FROM listing_tags WHERE listing_id = ?", [listingId]);
    const tagNames = tagsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const name of tagNames) {
      await db.query("INSERT IGNORE INTO tags (name) VALUES (?)", [name]);
      const tagIdRows = await db.query("SELECT id FROM tags WHERE name = ? LIMIT 1", [name]);
      const tagId = tagIdRows[0].id;
      await db.query("INSERT IGNORE INTO listing_tags (listing_id, tag_id) VALUES (?, ?)", [listingId, tagId]);
    }

    res.redirect("/my-listings");
  } catch (err) {
    console.error("[POST /my-listings/:id/edit]", err);
    res.status(500).send("Error updating listing");
  }
});

app.post("/my-listings/:id/delete", requireLogin, async (req, res) => {
  try {
    const listingId = parseInt(req.params.id, 10);
    const userId = req.session.user.id;

    const rows = await db.query("SELECT * FROM listings WHERE id = ? LIMIT 1", [listingId]);
    if (!rows.length) return res.status(404).send("Listing not found");
    const listing = rows[0];
    if (listing.user_id !== userId) return res.status(403).send("Not allowed");

    const swapsUsing = await db.query(
      `
        SELECT id FROM swaps
        WHERE (requester_listing_id = ? OR responder_listing_id = ?)
          AND status IN ('pending','accepted','completed')
        LIMIT 1
      `,
      [listingId, listingId]
    );
    if (swapsUsing.length) return res.status(400).send("Cannot delete a listing involved in an active swap.");

    await db.query("DELETE FROM listing_tags WHERE listing_id = ?", [listingId]);
    await db.query("DELETE FROM listing_ratings WHERE listing_id = ?", [listingId]);
    await db.query("DELETE FROM listings WHERE id = ?", [listingId]);
    res.redirect("/my-listings");
  } catch (err) {
    console.error("[POST /my-listings/:id/delete]", err);
    res.status(500).send("Error deleting listing");
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

    if (!listingRows || listingRows.length === 0) return res.status(404).send("Listing not found");

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

    const recsSql = `
      SELECT l2.*, COUNT(*) AS shared_tags
      FROM listing_tags lt
      JOIN listing_tags lt2 ON lt.tag_id = lt2.tag_id
      JOIN listings l2 ON l2.id = lt2.listing_id
      WHERE lt.listing_id = ? AND l2.id <> ?
      GROUP BY l2.id
      ORDER BY shared_tags DESC, l2.id DESC
      LIMIT 5
    `;
    let recommendations = [];
    try {
      recommendations = await db.query(recsSql, [id, id]);
    } catch (e) {
      recommendations = [];
    }

    let myListings = [];
    if (req.session.user) {
      myListings = await db.query(
        "SELECT id, title, has_item, wants_item FROM listings WHERE user_id = ? ORDER BY id DESC",
        [req.session.user.id]
      );
    }

    res.render("listing-detail", { listing, tags, ratings, recommendations, myListings });
  } catch (err) {
    console.error("[GET /listings/:id]", err);
    res.status(500).send("Error fetching listing details");
  }
});

// ---------------- AUTH ----------------
app.get("/register", function (req, res) {
  res.render("register");
});

app.post("/register", async function (req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.send("All fields are required");
    if (password.length < 6) return res.send("Password must be at least 6 characters");

    const existing = await db.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (existing.length) return res.send("Email already exists");

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query("INSERT INTO users (name, email, password, points) VALUES (?, ?, ?, 0)", [
      name,
      email,
      hashedPassword,
    ]);

    res.redirect("/login");
  } catch (err) {
    console.error("[POST /register]", err);
    res.status(500).send("Could not register");
  }
});

app.get("/signup", function (req, res) {
  res.render("signup", { error: null, body: {} });
});

app.post("/signup", async function (req, res) {
  try {
    const { name, email, course, year, password } = req.body;
    if (!name || !email || !password) {
      return res
        .status(400)
        .render("signup", { error: "Name, email, and password are required.", body: req.body });
    }

    const existing = await db.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (existing && existing.length > 0) {
      return res.status(400).render("signup", { error: "Email already exists.", body: req.body });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      "INSERT INTO users (name, email, course, year, password, points) VALUES (?, ?, ?, ?, ?, 0)",
      [name, email, course || null, year || null, hashedPassword]
    );

    req.session.user = { id: result.insertId, name, email, course, year };
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

    const rows = await db.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    const user = rows[0];
    if (!user) return res.status(401).render("login", { error: "Invalid credentials." });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).render("login", { error: "Invalid credentials." });

    req.session.user = { id: user.id, name: user.name, email: user.email, course: user.course, year: user.year };
    res.redirect("/");
  } catch (err) {
    console.error("[POST /login]", err);
    res.status(500).render("login", { error: "Error during login." });
  }
});

app.get("/logout", function (req, res) {
  req.session.destroy(() => res.redirect("/"));
});

app.post("/register", async function (req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.send("All fields are required");
    if (password.length < 6) return res.send("Password must be at least 6 characters");

    const existing = await db.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (existing.length) return res.send("Email already exists");

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query("INSERT INTO users (name, email, password, points) VALUES (?, ?, ?, 0)", [
      name,
      email,
      hashedPassword,
    ]);

    res.redirect("/login");
  } catch (err) {
    console.error("[POST /register]", err);
    res.status(500).send("Could not register");
  }
});

app.get("/signup", function (req, res) {
  res.render("signup", { error: null, body: {} });
});

app.post("/signup", async function (req, res) {
  try {
    const { name, email, course, year, password } = req.body;
    if (!name || !email || !password) {
      return res
        .status(400)
        .render("signup", { error: "Name, email, and password are required.", body: req.body });
    }

    const existing = await db.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (existing && existing.length > 0) {
      return res.status(400).render("signup", { error: "Email already exists.", body: req.body });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      "INSERT INTO users (name, email, course, year, password, points) VALUES (?, ?, ?, ?, ?, 0)",
      [name, email, course || null, year || null, hashedPassword]
    );

    req.session.user = { id: result.insertId, name, email, course, year };
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

    const rows = await db.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    const user = rows[0];
    if (!user) return res.status(401).render("login", { error: "Invalid credentials." });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).render("login", { error: "Invalid credentials." });

    req.session.user = { id: user.id, name: user.name, email: user.email, course: user.course, year: user.year };
    res.redirect("/");
  } catch (err) {
    console.error("[POST /login]", err);
    res.status(500).render("login", { error: "Error during login." });
  }
});

app.get("/logout", function (req, res) {
  req.session.destroy(() => res.redirect("/"));
});

// ---------------- LISTING RATING ----------------
app.post("/listings/:id/rate", async (req, res) => {
  const listingId = req.params.id;
  const { rating, comment } = req.body;

  const userId = req.session.user ? req.session.user.id : null;
  if (!userId) return res.redirect("/login");

  try {
    const sql = `
      INSERT INTO listing_ratings (listing_id, user_id, rating, comment)
      VALUES (?, ?, ?, ?)
    `;
    await db.query(sql, [listingId, userId, rating, comment || null]);
    res.redirect("/listings/" + listingId);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving rating");
  }
});

// ---------------- SWAP MATCHING ----------------
app.get("/matches", requireLogin, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const matchesSql = `
      SELECT
        a.id AS my_listing_id, a.title AS my_title, a.has_item AS my_has, a.wants_item AS my_wants,
        b.id AS other_listing_id, b.title AS other_title, b.has_item AS other_has, b.wants_item AS other_wants,
        u.id AS other_user_id, u.name AS other_user_name
      FROM listings a
      JOIN listings b
        ON a.has_item = b.wants_item
       AND a.wants_item = b.has_item
      JOIN users u ON u.id = b.user_id
      WHERE a.user_id = ? AND b.user_id <> ?
      ORDER BY b.id DESC
      LIMIT 50
    `;
    const matches = await db.query(matchesSql, [userId, userId]);
    res.render("matches", { matches });
  } catch (err) {
    console.error("[GET /matches]", err);
    res.status(500).send("Error loading matches");
  }
});

// ---------------- SWAP REQUEST FLOW ----------------
app.post("/swaps/request", requireLogin, async (req, res) => {
  try {
    const requesterId = req.session.user.id;
    const myListingId = parseInt(req.body.my_listing_id, 10);
    const targetListingId = parseInt(req.body.target_listing_id, 10);

    if (!myListingId || !targetListingId) return res.status(400).send("Missing listing ids");

    const myRows = await db.query("SELECT id, user_id FROM listings WHERE id = ? LIMIT 1", [myListingId]);
    if (!myRows.length || myRows[0].user_id !== requesterId) return res.status(403).send("Invalid my listing");

    const targetRows = await db.query("SELECT id, user_id FROM listings WHERE id = ? LIMIT 1", [targetListingId]);
    if (!targetRows.length) return res.status(404).send("Target listing not found");

    const responderId = targetRows[0].user_id;
    if (responderId === requesterId) return res.status(400).send("Cannot request swap with yourself");

    // Prevent duplicates (same requester + same pair of listings while active)
    const existing = await db.query(
      `
        SELECT id FROM swaps
        WHERE requester_id = ?
          AND requester_listing_id = ?
          AND responder_listing_id = ?
          AND status IN ('pending','accepted')
        LIMIT 1
      `,
      [requesterId, myListingId, targetListingId]
    );
    if (existing.length) return res.redirect("/swaps");

    await db.query(
      `
        INSERT INTO swaps (requester_id, responder_id, requester_listing_id, responder_listing_id, status)
        VALUES (?, ?, ?, ?, 'pending')
      `,
      [requesterId, responderId, myListingId, targetListingId]
    );

    res.redirect("/swaps");
  } catch (err) {
    console.error("[POST /swaps/request]", err);
    res.status(500).send("Error creating swap request");
  }
});

app.get("/swaps", requireLogin, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const swapsSql = `
      SELECT
        s.*,
        u1.name AS requester_name,
        u2.name AS responder_name,
        l1.title AS requester_listing_title,
        l2.title AS responder_listing_title
      FROM swaps s
      JOIN users u1 ON u1.id = s.requester_id
      JOIN users u2 ON u2.id = s.responder_id
      JOIN listings l1 ON l1.id = s.requester_listing_id
      JOIN listings l2 ON l2.id = s.responder_listing_id
      WHERE s.requester_id = ? OR s.responder_id = ?
      ORDER BY s.created_at DESC
    `;
    const swaps = await db.query(swapsSql, [userId, userId]);
    res.render("swaps", { swaps, userId });
  } catch (err) {
    console.error("[GET /swaps]", err);
    res.status(500).send("Error loading swaps");
  }
});

app.post("/swaps/:id/accept", requireLogin, async (req, res) => {
  try {
    const swapId = parseInt(req.params.id, 10);
    const userId = req.session.user.id;

    const rows = await db.query("SELECT * FROM swaps WHERE id = ? LIMIT 1", [swapId]);
    if (!rows.length) return res.status(404).send("Swap not found");
    const swap = rows[0];
    if (swap.responder_id !== userId) return res.status(403).send("Only the responder can accept");
    if (swap.status !== "pending") return res.status(400).send("Swap is not pending");

    await db.query("UPDATE swaps SET status = 'accepted', updated_at = NOW() WHERE id = ?", [swapId]);
    await db.query("UPDATE users SET points = COALESCE(points, 0) + 10 WHERE id IN (?, ?)", [
      swap.requester_id,
      swap.responder_id,
    ]);

    res.redirect("/swaps");
  } catch (err) {
    console.error("[POST /swaps/:id/accept]", err);
    res.status(500).send("Error accepting swap");
  }
});

app.post("/swaps/:id/reject", requireLogin, async (req, res) => {
  try {
    const swapId = parseInt(req.params.id, 10);
    const userId = req.session.user.id;

    const rows = await db.query("SELECT * FROM swaps WHERE id = ? LIMIT 1", [swapId]);
    if (!rows.length) return res.status(404).send("Swap not found");
    const swap = rows[0];
    if (swap.responder_id !== userId) return res.status(403).send("Only the responder can reject");
    if (swap.status !== "pending") return res.status(400).send("Swap is not pending");

    await db.query("UPDATE swaps SET status = 'rejected', updated_at = NOW() WHERE id = ?", [swapId]);
    res.redirect("/swaps");
  } catch (err) {
    console.error("[POST /swaps/:id/reject]", err);
    res.status(500).send("Error rejecting swap");
  }
});

app.post("/swaps/:id/complete", requireLogin, async (req, res) => {
  try {
    const swapId = parseInt(req.params.id, 10);
    const userId = req.session.user.id;

    const rows = await db.query("SELECT * FROM swaps WHERE id = ? LIMIT 1", [swapId]);
    if (!rows.length) return res.status(404).send("Swap not found");
    const swap = rows[0];
    const isParticipant = swap.requester_id === userId || swap.responder_id === userId;
    if (!isParticipant) return res.status(403).send("Only swap participants can complete");
    if (swap.status !== "accepted") return res.status(400).send("Swap must be accepted first");

    await db.query("UPDATE swaps SET status = 'completed', updated_at = NOW() WHERE id = ?", [swapId]);
    res.redirect("/swaps");
  } catch (err) {
    console.error("[POST /swaps/:id/complete]", err);
    res.status(500).send("Error completing swap");
  }
});

// ---------------- CHAT (simple 1:1 messages, swap-linked) ----------------
app.get("/swaps/:id/chat", requireLogin, async (req, res) => {
  try {
    const swapId = parseInt(req.params.id, 10);
    const userId = Number(req.session.user.id);

    const swapRows = await db.query(
      `
        SELECT
          s.*,
          u1.name AS requester_name,
          u2.name AS responder_name
        FROM swaps s
        JOIN users u1 ON u1.id = s.requester_id
        JOIN users u2 ON u2.id = s.responder_id
        WHERE s.id = ?
        LIMIT 1
      `,
      [swapId]
    );
    if (!swapRows.length) return res.status(404).send("Swap not found");
    const swap = swapRows[0];

    const isParticipant = swap.requester_id === userId || swap.responder_id === userId;
    if (!isParticipant) return res.status(403).send("Not allowed");

    const otherUserId = swap.requester_id === userId ? swap.responder_id : swap.requester_id;
    const otherUserName = swap.requester_id === userId ? swap.responder_name : swap.requester_name;

    const messages = await db.query(
      `
        SELECT m.*, u.name AS sender_name
        FROM messages m
        JOIN users u ON u.id = m.sender_id
        WHERE m.swap_id = ?
        ORDER BY m.created_at ASC
      `,
      [swapId]
    );

    // Sidebar: show all conversations for this user (same logic as /messages)
    const conversations = await db.query(
      `
        SELECT
          s.id AS swap_id,
          s.status,
          s.updated_at,
          s.created_at,
          CASE WHEN s.requester_id = ? THEN s.responder_id ELSE s.requester_id END AS other_user_id,
          CASE WHEN s.requester_id = ? THEN u2.name ELSE u1.name END AS other_user_name,
          lm.message AS latest_message,
          lm.created_at AS latest_message_at
        FROM swaps s
        JOIN users u1 ON u1.id = s.requester_id
        JOIN users u2 ON u2.id = s.responder_id
        LEFT JOIN (
          SELECT m1.swap_id, m1.message, m1.created_at
          FROM messages m1
          JOIN (
            SELECT swap_id, MAX(created_at) AS max_created_at
            FROM messages
            GROUP BY swap_id
          ) mx ON mx.swap_id = m1.swap_id AND mx.max_created_at = m1.created_at
        ) lm ON lm.swap_id = s.id
        WHERE s.requester_id = ? OR s.responder_id = ?
        ORDER BY COALESCE(lm.created_at, s.updated_at, s.created_at) DESC, s.id DESC
      `,
      [userId, userId, userId, userId]
    );

    res.render("chat", { swap, swapId, messages, userId, otherUserId, otherUserName, conversations });
  } catch (err) {
    console.error("[GET /swaps/:id/chat]", err);
    res.status(500).send("Error loading chat");
  }
});

app.post("/swaps/:id/chat", requireLogin, async (req, res) => {
  try {
    const swapId = parseInt(req.params.id, 10);
    const userId = Number(req.session.user.id);
    const message = (req.body.message || "").trim();
    if (!message) return res.redirect(`/swaps/${swapId}/chat`);

    const swapRows = await db.query("SELECT * FROM swaps WHERE id = ? LIMIT 1", [swapId]);
    if (!swapRows.length) return res.status(404).send("Swap not found");
    const swap = swapRows[0];
    const isParticipant = swap.requester_id === userId || swap.responder_id === userId;
    if (!isParticipant) return res.status(403).send("Not allowed");

    const receiverId = swap.requester_id === userId ? swap.responder_id : swap.requester_id;

    await db.query(
      "INSERT INTO messages (swap_id, sender_id, receiver_id, message) VALUES (?, ?, ?, ?)",
      [swapId, userId, receiverId, message]
    );
    res.redirect(`/swaps/${swapId}/chat`);
  } catch (err) {
    console.error("[POST /swaps/:id/chat]", err);
    res.status(500).send("Error sending message");
  }
});

// ---------------- MESSAGES (inbox) ----------------
app.get("/messages", requireLogin, async (req, res) => {
  try {
    const userId = req.session.user.id;

    // List swaps for the user with the latest message (if any).
    const conversations = await db.query(
      `
        SELECT
          s.id AS swap_id,
          s.status,
          s.updated_at,
          s.created_at,
          CASE WHEN s.requester_id = ? THEN s.responder_id ELSE s.requester_id END AS other_user_id,
          CASE WHEN s.requester_id = ? THEN u2.name ELSE u1.name END AS other_user_name,
          lm.message AS latest_message,
          lm.created_at AS latest_message_at
        FROM swaps s
        JOIN users u1 ON u1.id = s.requester_id
        JOIN users u2 ON u2.id = s.responder_id
        LEFT JOIN (
          SELECT m1.swap_id, m1.message, m1.created_at
          FROM messages m1
          JOIN (
            SELECT swap_id, MAX(created_at) AS max_created_at
            FROM messages
            GROUP BY swap_id
          ) mx ON mx.swap_id = m1.swap_id AND mx.max_created_at = m1.created_at
        ) lm ON lm.swap_id = s.id
        WHERE s.requester_id = ? OR s.responder_id = ?
        ORDER BY COALESCE(lm.created_at, s.updated_at, s.created_at) DESC, s.id DESC
      `,
      [userId, userId, userId, userId]
    );

    res.render("messages", { conversations });
  } catch (err) {
    console.error("[GET /messages]", err);
    res.status(500).send("Error loading messages");
  }
});

// ---------------- USER TRUST / RATINGS ----------------
app.post("/users/:id/rate", requireLogin, async (req, res) => {
  try {
    const ratedUserId = parseInt(req.params.id, 10);
    const raterUserId = req.session.user.id;
    const rating = parseInt(req.body.rating, 10);
    const comment = (req.body.comment || "").trim();
    const swapId = parseInt(req.body.swap_id, 10) || null;

    if (!ratedUserId || ratedUserId === raterUserId) return res.status(400).send("Invalid user");
    if (!rating || rating < 1 || rating > 5) return res.status(400).send("Rating must be 1-5");
    if (!swapId) return res.status(400).send("Please select the completed swap you are rating for.");

    const swapRows = await db.query(
      `
        SELECT id FROM swaps
        WHERE id = ?
          AND status = 'completed'
          AND ((requester_id = ? AND responder_id = ?) OR (requester_id = ? AND responder_id = ?))
        LIMIT 1
      `,
      [swapId, raterUserId, ratedUserId, ratedUserId, raterUserId]
    );
    if (!swapRows.length) return res.status(403).send("You can only rate after a completed swap.");

    await db.query(
      `
        INSERT INTO user_ratings (rater_user_id, rated_user_id, rating, comment, swap_id)
        VALUES (?, ?, ?, ?, ?)
      `,
      [raterUserId, ratedUserId, rating, comment || null, swapId]

    if (!ratedUserId || ratedUserId === raterUserId) return res.status(400).send("Invalid user");
    if (!rating || rating < 1 || rating > 5) return res.status(400).send("Rating must be 1-5");

    const allowed = await db.query(
      `
        SELECT id FROM swaps
        WHERE status = 'accepted'
          AND ((requester_id = ? AND responder_id = ?) OR (requester_id = ? AND responder_id = ?))
        LIMIT 1
      `,
      [raterUserId, ratedUserId, ratedUserId, raterUserId]
    );
    if (!allowed.length) return res.status(403).send("You can only rate after an accepted swap.");

    await db.query(
      `
        INSERT INTO user_ratings (rater_user_id, rated_user_id, rating, comment)
        VALUES (?, ?, ?, ?)
      `,
      [raterUserId, ratedUserId, rating, comment || null]
    );

    res.redirect("/users/" + ratedUserId);
  } catch (err) {
    console.error("[POST /users/:id/rate]", err);
    res.status(500).send("Error saving user rating");
  }
});

// ---------------- START SERVER ----------------
(async () => {
  try {
    // In Docker, MySQL may take a few seconds to initialize.
    // Retry migrations briefly instead of crashing the web container.
    const startedAt = Date.now();
    // ~30 seconds max wait
    while (true) {
      try {
        await migrate.ensure(db);
        break;
      } catch (e) {
        const code = e && (e.code || e.errno);
        const retryable =
          code === "ENOTFOUND" ||
          code === "ECONNREFUSED" ||
          code === "PROTOCOL_CONNECTION_LOST" ||
          code === "ETIMEDOUT";

        if (!retryable || Date.now() - startedAt > 30000) throw e;
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    app.listen(3000, function () {
      console.log(`Server running at http://127.0.0.1:3000/`);
    });
  } catch (err) {
    console.error("[startup]", err);
    process.exit(1);
  }
})();

module.exports = app;


