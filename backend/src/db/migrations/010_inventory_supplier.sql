ALTER TABLE medicine_inventory 
ADD COLUMN supplier_id BIGINT UNSIGNED NULL;

ALTER TABLE medicine_inventory
ADD CONSTRAINT fk_inv_supplier 
FOREIGN KEY (supplier_id) REFERENCES suppliers(id);