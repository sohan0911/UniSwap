-- Tags many-to-many (run once against UniSwap MySQL database)
-- Safe to re-run: uses IF NOT EXISTS where supported

CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS listing_tags (
  listing_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (listing_id, tag_id),
  CONSTRAINT fk_lt_listing FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  CONSTRAINT fk_lt_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional columns for listing detail (ignore errors if already present)
-- ALTER TABLE listings ADD COLUMN price DECIMAL(10,2) NULL;
-- ALTER TABLE listings ADD COLUMN image_url VARCHAR(512) NULL;
