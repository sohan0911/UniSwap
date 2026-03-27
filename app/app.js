// Import express.js
const express = require("express");

var app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set("view engine", "pug");
app.set("views", __dirname + "/views");

app.use(express.static("public"));

const db = require("./services/db");

app.get("/", async function (req, res) {
  try {
    const sql = "SELECT * FROM listings ORDER BY id DESC LIMIT 3";
    const listings = await db.query(sql);
    console.log("[GET /] recent listings count:", listings ? listings.length : 0);
    res.render("index", { listings });
  } catch (error) {
    console.error("[GET /]", error);
    res.status(500).send("Error loading homepage");
  }
});

app.get("/db_test", function (req, res) {
  sql = "select * from listings";
  db.query(sql).then((results) => {
    console.log(results);
    res.send(results);
  });
});

app.get("/goodbye", function (req, res) {
  res.send("Goodbye world!");
});

app.get("/hello/:name", function (req, res) {
  console.log(req.params);
  res.send("Hello " + req.params.name);
});

app.get("/users", async function (req, res) {
  try {
    const sql = "SELECT id, name, email FROM users";
    const users = await db.query(sql);
    console.log("[GET /users] rows:", users ? users.length : 0);
    res.render("users", { users: users });
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

    if (results.length === 0) {
      return res.status(404).send("User not found");
    }

    res.render("user-profile", { user: results[0] });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching user profile");
  }
});

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
    console.log("[GET /tags/:id] listings count:", listings ? listings.length : 0);
    res.render("listings", { listings });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching listings");
  }
});

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
    console.log("[POST /listings] created listing id:", listingId);

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
      error:
        "Could not create listing. Ensure `tags` and `listing_tags` tables exist (see database/tags_schema.sql).",
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
      console.warn(
        "[GET /listings] grouped tags query failed, using simple SELECT:",
        e.message
      );
      listings = await db.query(listingsSqlFallback(), []);
    }
    console.log(
      "[GET /listings] count:",
      listings ? listings.length : 0,
      Array.isArray(listings) ? "" : typeof listings
    );
    if (!listings || listings.length === 0) {
      console.log("[GET /listings] results empty — check MySQL data in `listings`");
    }
    res.render("listings", { listings: listings || [] });
  } catch (err) {
    console.error("[GET /listings]", err);
    res.status(500).send("Error fetching listings");
  }
});

app.get("/listings/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const listingSql =
      "SELECT l.*, u.name AS owner_name, u.email AS owner_email " +
      "FROM listings l " +
      "JOIN users u ON l.user_id = u.id " +
      "WHERE l.id = ?";
    let listingRows;
    try {
      listingRows = await db.query(listingSql, [id]);
    } catch (e) {
      console.warn("[GET /listings/:id] join failed, falling back:", e.message);
      listingRows = await db.query("SELECT * FROM listings WHERE id = ?", [id]);
    }

    if (!listingRows || listingRows.length === 0) {
      return res.status(404).send("Listing not found");
    }

    const listing = listingRows[0];

    let tags = [];
    try {
      const tagsSql =
        "SELECT t.id, t.name " +
        "FROM tags t " +
        "JOIN listing_tags lt ON t.id = lt.tag_id " +
        "WHERE lt.listing_id = ? " +
        "ORDER BY t.name";
      tags = await db.query(tagsSql, [id]);
    } catch (e) {
      console.warn("[GET /listings/:id] tags query failed:", e.message);
    }

    console.log("[GET /listings/:id] id:", id, "tags:", tags.length);
    res.render("listing-detail", { listing, tags });
  } catch (err) {
    console.error("[GET /listings/:id]", err);
    res.status(500).send("Error fetching listing details");
  }
});

app.listen(3000, function () {
  console.log(`Server running at http://127.0.0.1:3000/`);
});
