CREATE TABLE IF NOT EXISTS medicine_inventory (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  medicine_id BIGINT UNSIGNED NOT NULL,
  batch_number VARCHAR(50) NOT NULL,
  expiry_date DATE NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  purchase_rate DECIMAL(10,2) NULL,
  mrp DECIMAL(10,2) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_inv_medicine_batch (medicine_id, batch_number),
  KEY idx_inv_expiry (expiry_date),
  CONSTRAINT fk_inv_medicine FOREIGN KEY (medicine_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  inventory_id BIGINT UNSIGNED NOT NULL,
  transaction_type ENUM('STOCK_IN','BILL_SALE','ADJUSTMENT','RETURN') NOT NULL,
  quantity INT NOT NULL,
  notes VARCHAR(500) NULL,
  reference_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inv_tx FOREIGN KEY (inventory_id) REFERENCES medicine_inventory(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;