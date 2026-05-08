async function columnExists(db, tableName, columnName) {
  const rows = await db.query(
    `
      SELECT COUNT(*) AS cnt
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    [tableName, columnName]
  );
  return rows && rows[0] && rows[0].cnt > 0;
}

async function tableExists(db, tableName) {
  const rows = await db.query(
    `
      SELECT COUNT(*) AS cnt
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
    `,
    [tableName]
  );
  return rows && rows[0] && rows[0].cnt > 0;
}

async function ensure(db) {
  // Base tables (so a fresh docker volume can boot).
  // Keep these minimal, matching what the app currently queries.
  if (!(await tableExists(db, "users"))) {
    await db.query(`
      CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NULL,
        course VARCHAR(255) NULL,
        year INT NULL,
        points INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_email (email)
      )
    `);
  }

  if (!(await tableExists(db, "listings"))) {
    await db.query(`
      CREATE TABLE listings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        user_id INT NOT NULL,
        price DECIMAL(10,2) NULL,
        image_url VARCHAR(1024) NULL,
        has_item VARCHAR(255) NULL,
        wants_item VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id)
      )
    `);
  }

  if (!(await tableExists(db, "tags"))) {
    await db.query(`
      CREATE TABLE tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        UNIQUE KEY uniq_name (name)
      )
    `);
  }

  if (!(await tableExists(db, "listing_tags"))) {
    await db.query(`
      CREATE TABLE listing_tags (
        listing_id INT NOT NULL,
        tag_id INT NOT NULL,
        PRIMARY KEY (listing_id, tag_id),
        INDEX idx_tag_id (tag_id)
      )
    `);
  }

  // Users: points
  if (!(await columnExists(db, "users", "points"))) {
    await db.query("ALTER TABLE users ADD COLUMN points INT NOT NULL DEFAULT 0");
  }

  // Listings: swap fields
  if (!(await columnExists(db, "listings", "has_item"))) {
    await db.query("ALTER TABLE listings ADD COLUMN has_item VARCHAR(255) NULL");
  }
  if (!(await columnExists(db, "listings", "wants_item"))) {
    await db.query("ALTER TABLE listings ADD COLUMN wants_item VARCHAR(255) NULL");
  }

  // Listing ratings table (was already referenced in Sprint 3 code)
  if (!(await tableExists(db, "listing_ratings"))) {
    await db.query(`
      CREATE TABLE listing_ratings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        listing_id INT NOT NULL,
        user_id INT NOT NULL,
        rating INT NOT NULL,
        comment TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_listing_id (listing_id),
        INDEX idx_user_id (user_id)
      )
    `);
  }

  // User trust ratings (Sprint 4)
  if (!(await tableExists(db, "user_ratings"))) {
    await db.query(`
      CREATE TABLE user_ratings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rater_user_id INT NOT NULL,
        rated_user_id INT NOT NULL,
        rating INT NOT NULL,
        comment TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_rated_user_id (rated_user_id),
        INDEX idx_rater_user_id (rater_user_id)
      )
    `);
  }

  // Swap requests (Sprint 4)
  if (!(await tableExists(db, "swaps"))) {
    await db.query(`
      CREATE TABLE swaps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        requester_id INT NOT NULL,
        responder_id INT NOT NULL,
        requester_listing_id INT NOT NULL,
        responder_listing_id INT NOT NULL,
        status ENUM('pending','accepted','rejected','completed') NOT NULL DEFAULT 'pending',
        status ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT NULL,
        INDEX idx_requester_id (requester_id),
        INDEX idx_responder_id (responder_id),
        INDEX idx_status (status)
      )
    `);
  }

  // Existing swaps table may not include "completed" yet.
  // Keep it tolerant: if the ALTER fails (e.g. already updated), continue.
  try {
    await db.query(
      "ALTER TABLE swaps MODIFY COLUMN status ENUM('pending','accepted','rejected','completed') NOT NULL DEFAULT 'pending'"
    );
  } catch (e) {
    // ignore
  }

  // Messages between two users (linked to a swap)
  if (!(await tableExists(db, "messages"))) {
    await db.query(`
      CREATE TABLE messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        swap_id INT NOT NULL,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_swap_id (swap_id),
        INDEX idx_sender_id (sender_id),
        INDEX idx_receiver_id (receiver_id)
      )
    `);
  }

  // Tie user ratings to swaps (so you can only rate once per swap)
  if (!(await columnExists(db, "user_ratings", "swap_id"))) {
    try {
      await db.query("ALTER TABLE user_ratings ADD COLUMN swap_id INT NULL");
      await db.query("CREATE UNIQUE INDEX uniq_user_rating_swap ON user_ratings (rater_user_id, swap_id)");
    } catch (e) {
      // ignore (some MySQL variants may reject index creation if data conflicts)
    }
  }

  // Seed data (safe/idempotent). Keep minimal demo content for a fresh clone.
  const userCountRows = await db.query("SELECT COUNT(*) AS cnt FROM users");
  const userCount = userCountRows && userCountRows[0] ? userCountRows[0].cnt : 0;
  if (!userCount) {
    // bcrypt hash for "password123" (precomputed) so login works without extra tooling.
    const demoHash = "$2a$10$eEED.iBhh9I636b0V8F6Eubx0yOaL.t7mP6RkC9lZpA2/D8s.uUOO";
    await db.query(
      `
        INSERT INTO users (name, email, course, year, password, points)
        VALUES
          ('Aisha Khan', 'aisha.khan@uni.edu', 'Computer Science', 2, ?, 25),
          ('Ben Turner', 'ben.turner@uni.edu', 'Cyber Security', 3, ?, 18),
          ('Chloe Nguyen', 'chloe.nguyen@uni.edu', 'Software Engineering', 1, ?, 12),
          ('Daniel Garcia', 'daniel.garcia@uni.edu', 'Database Systems', 2, ?, 20),
          ('Emma Wilson', 'emma.wilson@uni.edu', 'Networking', 3, ?, 14),
          ('Farah Ali', 'farah.ali@uni.edu', 'Web Development', 2, ?, 22)
      `,
      [demoHash, demoHash, demoHash, demoHash, demoHash, demoHash]
    );
  }

  const listingCountRows = await db.query("SELECT COUNT(*) AS cnt FROM listings");
  const listingCount = listingCountRows && listingCountRows[0] ? listingCountRows[0].cnt : 0;
  if (!listingCount) {
    const users = await db.query("SELECT id FROM users ORDER BY id ASC LIMIT 6");
    if (users.length >= 6) {
      await db.query(
        `
          INSERT INTO listings (title, description, user_id, has_item, wants_item)
          VALUES
            ('Java Revision Notes (OOP + Collections)', 'Concise revision notes with examples and common exam pitfalls.', ?, 'Java notes', 'Database cheat sheet'),
            ('Database Systems Cheat Sheet (SQL + Normalisation)', '1-page cheat sheet for joins, keys, and 1NF→BCNF examples.', ?, 'Database cheat sheet', 'Networking diagrams'),
            ('Cyber Security Flashcards (OWASP Top 10)', 'Printable flashcards for web security threats and mitigations.', ?, 'Cyber Security flashcards', 'Operating Systems summary'),
            ('Operating Systems Summary Notes', 'Scheduling, memory, processes, and deadlocks summary + diagrams.', ?, 'Operating Systems summary', 'Web Dev coursework notes'),
            ('Web Development Coursework Notes (Express + PUG)', 'Notes + mini examples for Express routing, sessions, and PUG templates.', ?, 'Web Dev coursework notes', 'Java notes'),
            ('Networking Diagrams (TCP/IP + Subnetting)', 'Subnetting worked examples and layered protocol diagrams.', ?, 'Networking diagrams', 'Cyber Security flashcards'),
            ('Past Paper Solutions (SE Module)', 'Worked solutions + marking tips for last year’s paper.', ?, 'Past paper solutions', 'Java notes'),
            ('Data Structures Quick Guide', 'Big-O overview + examples for stacks, queues, trees, graphs.', ?, 'DSA guide', 'Operating Systems summary'),
            ('Exam Revision Guide (Databases)', 'Revision guide with practice questions and answers.', ?, 'Database revision guide', 'Cyber Security flashcards'),
            ('Web API Testing Checklist', 'Postman-style checklist + examples for REST testing.', ?, 'API testing checklist', 'Networking diagrams')
        `,
        [
          users[0].id,
          users[1].id,
          users[2].id,
          users[3].id,
          users[4].id,
          users[5].id,
          users[0].id,
          users[1].id,
          users[2].id,
          users[3].id,
        ]
      );
    }
  }

  const tagCountRows = await db.query("SELECT COUNT(*) AS cnt FROM tags");
  const tagCount = tagCountRows && tagCountRows[0] ? tagCountRows[0].cnt : 0;
  if (!tagCount) {
    await db.query(
      "INSERT IGNORE INTO tags (name) VALUES (?), (?), (?), (?), (?), (?), (?), (?), (?)",
      ["java", "databases", "cyber-security", "operating-systems", "web-dev", "networking", "revision", "past-papers", "year-2"]
    );
  }

  const listingTagCountRows = await db.query("SELECT COUNT(*) AS cnt FROM listing_tags");
  const listingTagCount = listingTagCountRows && listingTagCountRows[0] ? listingTagCountRows[0].cnt : 0;
  if (!listingTagCount) {
    // Light tagging to make the UI look populated.
    const tags = await db.query("SELECT id, name FROM tags");
    const tagIdByName = new Map(tags.map((t) => [t.name, t.id]));
    const listings = await db.query("SELECT id, title FROM listings ORDER BY id ASC LIMIT 10");

    const attach = async (listingIdx, names) => {
      const listing = listings[listingIdx];
      if (!listing) return;
      for (const n of names) {
        const tagId = tagIdByName.get(n);
        if (tagId) await db.query("INSERT IGNORE INTO listing_tags (listing_id, tag_id) VALUES (?, ?)", [listing.id, tagId]);
      }
    };

    await attach(0, ["java", "revision", "year-2"]);
    await attach(1, ["databases", "revision", "year-2"]);
    await attach(2, ["cyber-security", "revision"]);
    await attach(3, ["operating-systems", "revision"]);
    await attach(4, ["web-dev", "revision"]);
    await attach(5, ["networking", "revision"]);
    await attach(6, ["past-papers", "revision"]);
    await attach(7, ["revision", "year-2"]);
    await attach(8, ["databases", "revision"]);
    await attach(9, ["web-dev", "revision"]);
  }

  const swapCountRows = await db.query("SELECT COUNT(*) AS cnt FROM swaps");
  const swapCount = swapCountRows && swapCountRows[0] ? swapCountRows[0].cnt : 0;
  if (!swapCount) {
    const users = await db.query("SELECT id, email FROM users ORDER BY id ASC LIMIT 6");
    const listings = await db.query("SELECT id, user_id FROM listings ORDER BY id ASC LIMIT 10");
    if (users.length >= 4 && listings.length >= 4) {
      // Create a completed swap (users[0] ↔ users[1])
      const aListing = listings.find((l) => l.user_id === users[0].id);
      const bListing = listings.find((l) => l.user_id === users[1].id);
      if (aListing && bListing) {
        await db.query(
          `
            INSERT INTO swaps (requester_id, responder_id, requester_listing_id, responder_listing_id, status, updated_at)
            VALUES (?, ?, ?, ?, 'completed', NOW())
          `,
          [users[0].id, users[1].id, aListing.id, bListing.id]
        );
      }

      // Create an accepted swap (users[2] ↔ users[3])
      const cListing = listings.find((l) => l.user_id === users[2].id);
      const dListing = listings.find((l) => l.user_id === users[3].id);
      if (cListing && dListing) {
        await db.query(
          `
            INSERT INTO swaps (requester_id, responder_id, requester_listing_id, responder_listing_id, status, updated_at)
            VALUES (?, ?, ?, ?, 'accepted', NOW())
          `,
          [users[2].id, users[3].id, cListing.id, dListing.id]
        );
      }
    }
  }

  const messageCountRows = await db.query("SELECT COUNT(*) AS cnt FROM messages");
  const messageCount = messageCountRows && messageCountRows[0] ? messageCountRows[0].cnt : 0;
  if (!messageCount) {
    const swaps = await db.query("SELECT * FROM swaps ORDER BY id ASC LIMIT 2");
    for (const s of swaps) {
      await db.query(
        "INSERT INTO messages (swap_id, sender_id, receiver_id, message) VALUES (?, ?, ?, ?)",
        [s.id, s.requester_id, s.responder_id, "Hey! I’m happy to swap. Are you free tomorrow on campus?"]
      );
      await db.query(
        "INSERT INTO messages (swap_id, sender_id, receiver_id, message) VALUES (?, ?, ?, ?)",
        [s.id, s.responder_id, s.requester_id, "Yes — I can do 12:30 near the library entrance. Works for you?"]
      );
      await db.query(
        "INSERT INTO messages (swap_id, sender_id, receiver_id, message) VALUES (?, ?, ?, ?)",
        [s.id, s.requester_id, s.responder_id, "Perfect. I’ll bring the notes printed and the digital link too."]
      );
    }
  }

  const userRatingCountRows = await db.query("SELECT COUNT(*) AS cnt FROM user_ratings");
  const userRatingCount = userRatingCountRows && userRatingCountRows[0] ? userRatingCountRows[0].cnt : 0;
  if (!userRatingCount) {
    const completed = await db.query("SELECT id, requester_id, responder_id FROM swaps WHERE status = 'completed' ORDER BY id ASC LIMIT 1");
    if (completed.length) {
      const s = completed[0];
      await db.query(
        "INSERT INTO user_ratings (rater_user_id, rated_user_id, rating, comment, swap_id) VALUES (?, ?, ?, ?, ?)",
        [s.requester_id, s.responder_id, 5, "Great swap — fast replies and the notes were really clear.", s.id]
      );
      await db.query(
        "INSERT INTO user_ratings (rater_user_id, rated_user_id, rating, comment, swap_id) VALUES (?, ?, ?, ?, ?)",
        [s.responder_id, s.requester_id, 5, "Friendly and reliable. Would swap again.", s.id]
      );
    }
  }

  const listingRatingCountRows = await db.query("SELECT COUNT(*) AS cnt FROM listing_ratings");
  const listingRatingCount = listingRatingCountRows && listingRatingCountRows[0] ? listingRatingCountRows[0].cnt : 0;
  if (!listingRatingCount) {
    const someListings = await db.query("SELECT id, user_id FROM listings ORDER BY id ASC LIMIT 3");
    const someUsers = await db.query("SELECT id FROM users ORDER BY id DESC LIMIT 3");
    if (someListings.length && someUsers.length) {
      await db.query(
        "INSERT INTO listing_ratings (listing_id, user_id, rating, comment) VALUES (?, ?, 5, ?), (?, ?, 4, ?)",
        [
          someListings[0].id,
          someUsers[0].id,
          "Super helpful summary — saved me loads of time.",
          someListings[1].id,
          someUsers[1].id,
          "Good notes, could use a couple more examples but still great.",
        ]
      );
    }
  }
}

module.exports = { ensure };

