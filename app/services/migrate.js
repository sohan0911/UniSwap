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
        status ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT NULL,
        INDEX idx_requester_id (requester_id),
        INDEX idx_responder_id (responder_id),
        INDEX idx_status (status)
      )
    `);
  }
}

module.exports = { ensure };

