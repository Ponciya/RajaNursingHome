-- Suppliers Master
CREATE TABLE IF NOT EXISTS suppliers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  contact_person VARCHAR(150) NULL,
  phone VARCHAR(20) NULL,
  email VARCHAR(150) NULL,
  address_line1 VARCHAR(300) NULL,
  address_line2 VARCHAR(300) NULL,
  city VARCHAR(100) NULL,
  district VARCHAR(100) NULL,
  state VARCHAR(100) NULL,
  pincode VARCHAR(10) NULL,
  gstin VARCHAR(20) NULL,
  drug_licence_no VARCHAR(50) NULL,
  min_order_value DECIMAL(12,2) NULL,
  payment_terms VARCHAR(100) NULL,
  bank_name VARCHAR(150) NULL,
  account_no VARCHAR(50) NULL,
  ifsc_code VARCHAR(20) NULL,
  notes VARCHAR(500) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_supplier_code (code),
  KEY idx_supplier_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Supplier ↔ Medicine link
CREATE TABLE IF NOT EXISTS supplier_medicines (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supplier_id BIGINT UNSIGNED NOT NULL,
  medicine_id BIGINT UNSIGNED NOT NULL,
  purchase_rate DECIMAL(10,2) NULL,
  notes VARCHAR(300) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sup_med (supplier_id, medicine_id),
  CONSTRAINT fk_supmed_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  CONSTRAINT fk_supmed_medicine FOREIGN KEY (medicine_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;