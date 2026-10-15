import { Router } from "express";
import { pool } from "../../config/db.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const reportsRouter = Router();

// Fast Moving Items (Last 30 days top sellers)
reportsRouter.get(
  "/fast-moving",
  requireAuth,
  asyncHandler(async (req, res) => {
    const days = Number(req.query.days) || 30;
    const [rows] = await pool.query(
      `SELECT p.id, p.name AS medicine_name,
              COALESCE(SUM(bi.quantity), 0) AS total_sold,
              COALESCE(SUM(bi.line_total), 0) AS total_revenue,
              COUNT(DISTINCT b.id) AS bill_count,
              DATE_FORMAT(MAX(b.bill_date), '%Y-%m-%d') AS last_sold_date
       FROM bill_items bi
       JOIN bills b ON bi.bill_id = b.id
       JOIN products p ON bi.source_product_id = p.id
       WHERE bi.item_kind = 'PRODUCT'
         AND b.status = 'COMPLETED'
         AND b.bill_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY p.id, p.name
       HAVING total_sold > 0
       ORDER BY total_sold DESC
       LIMIT 20`,
      [days]
    );
    res.json(rows);
  })
);

// Slow Moving Items (Least selling in last 30 days)
reportsRouter.get(
  "/slow-moving",
  requireAuth,
  asyncHandler(async (req, res) => {
    const days = Number(req.query.days) || 30;
    const [rows] = await pool.query(
      `SELECT p.id, p.name AS medicine_name,
              COALESCE(SUM(bi.quantity), 0) AS total_sold,
              DATE_FORMAT(MAX(b.bill_date), '%Y-%m-%d') AS last_sold_date,
              CASE 
                WHEN MAX(b.bill_date) IS NULL THEN NULL
                ELSE DATEDIFF(CURDATE(), MAX(b.bill_date))
              END AS days_since_last_sale,
              (SELECT COALESCE(SUM(quantity), 0) FROM medicine_inventory WHERE medicine_id = p.id) AS current_stock
       FROM products p
       LEFT JOIN bill_items bi ON bi.source_product_id = p.id AND bi.item_kind = 'PRODUCT'
       LEFT JOIN bills b ON bi.bill_id = b.id 
         AND b.status = 'COMPLETED' 
         AND b.bill_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       WHERE p.is_active = 1
       GROUP BY p.id, p.name
       HAVING total_sold <= 10
       ORDER BY total_sold ASC, last_sold_date ASC
       LIMIT 30`,
      [days]
    );
    res.json(rows);
  })
);

// Expiry Alerts (expiring within N days)
reportsRouter.get(
  "/expiry-alerts",
  requireAuth,
  asyncHandler(async (req, res) => {
    const days = Number(req.query.days) || 180;
    const [rows] = await pool.query(
      `SELECT inv.id, inv.batch_number,
              DATE_FORMAT(inv.expiry_date, '%Y-%m-%d') AS expiry_date,
              DATEDIFF(inv.expiry_date, CURDATE()) AS days_until_expiry,
              inv.quantity, inv.mrp, inv.purchase_rate,
              inv.rack_location,
              p.name AS medicine_name,
              s.name AS supplier_name
       FROM medicine_inventory inv
       JOIN products p ON inv.medicine_id = p.id
       LEFT JOIN suppliers s ON inv.supplier_id = s.id
       WHERE inv.is_active = 1 
         AND inv.quantity > 0
         AND inv.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
       ORDER BY inv.expiry_date ASC`,
      [days]
    );
    res.json(rows);
  })
);

// Supplier-wise Profit & Loss Report
reportsRouter.get(
  "/supplier-purchase",
  requireAuth,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT 
          s.id, 
          s.name AS supplier_name, 
          s.code,
          COALESCE(SUM(bi.quantity), 0) AS total_sold_quantity,
          COALESCE(SUM(bi.line_total), 0) AS total_revenue,
          COALESCE(SUM(bi.quantity * inv.purchase_rate), 0) AS total_cogs,
          COALESCE(SUM(bi.line_total - (bi.quantity * inv.purchase_rate)), 0) AS profit_loss,
          COALESCE((
              SELECT SUM(mi.quantity * mi.purchase_rate) 
              FROM medicine_inventory mi 
              WHERE mi.supplier_id = s.id AND mi.is_active = 1
          ), 0) AS unsold_stock_value
       FROM suppliers s
       LEFT JOIN medicine_inventory inv ON inv.supplier_id = s.id
       LEFT JOIN bill_items bi ON bi.source_product_id = inv.medicine_id AND bi.batch_number = inv.batch_number
       LEFT JOIN bills b ON bi.bill_id = b.id AND b.status = 'COMPLETED'
       WHERE s.deleted_at IS NULL
       GROUP BY s.id, s.name, s.code
       ORDER BY profit_loss DESC`
    );
    res.json(rows);
  })
);

// Dashboard Summary (for Reports overview)
reportsRouter.get(
  "/summary",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const [fastCount] = await pool.query<any[]>(
      `SELECT COUNT(DISTINCT bi.source_product_id) AS count
       FROM bill_items bi
       JOIN bills b ON bi.bill_id = b.id
       WHERE bi.item_kind = 'PRODUCT' 
         AND b.status = 'COMPLETED'
         AND b.bill_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
    );

    const [expiringCount] = await pool.query<any[]>(
      `SELECT COUNT(*) AS count
       FROM medicine_inventory
       WHERE is_active = 1 
         AND quantity > 0
         AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY)
         AND expiry_date >= CURDATE()`
    );

    const [expiredCount] = await pool.query<any[]>(
      `SELECT COUNT(*) AS count
       FROM medicine_inventory
       WHERE is_active = 1 
         AND quantity > 0
         AND expiry_date < CURDATE()`
    );

    const [lowStockCount] = await pool.query<any[]>(
      `SELECT COUNT(*) AS count
       FROM medicine_inventory
       WHERE is_active = 1 
         AND quantity <= 10
         AND quantity > 0`
    );

    res.json({
      fast_moving_count: Number(fastCount[0].count),
      expiring_soon_count: Number(expiringCount[0].count),
      expired_count: Number(expiredCount[0].count),
      low_stock_count: Number(lowStockCount[0].count),
    });
  })
);