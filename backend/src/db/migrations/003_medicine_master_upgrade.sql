ALTER TABLE products ADD COLUMN category_id BIGINT UNSIGNED NULL;
ALTER TABLE products ADD COLUMN generic_name VARCHAR(200) NULL;
ALTER TABLE products ADD COLUMN manufacturer VARCHAR(200) NULL;
ALTER TABLE products ADD COLUMN unit VARCHAR(30) NULL;
ALTER TABLE products ADD COLUMN pack_size VARCHAR(50) NULL;
ALTER TABLE products ADD COLUMN reorder_level INT NULL DEFAULT 10;
ALTER TABLE products ADD CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES medicine_categories(id);