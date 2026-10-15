import { Router } from "express";
import { pool } from "../../config/db.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const dashboardRouter = Router();

// Existing stats endpoint
dashboardRouter.get(
  "/stats",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const [todayStats] = await pool.query<any[]>(
      `SELECT 
         COUNT(*) AS today_bills,
         COALESCE(SUM(grand_total), 0) AS today_collection
       FROM bills
       WHERE bill_date = CURDATE() AND status = 'COMPLETED'`
    );

    const [typeStats] = await pool.query<any[]>(
      `SELECT bt.name AS type_name, COUNT(*) AS count, COALESCE(SUM(b.grand_total), 0) AS total
       FROM bills b
       JOIN billing_types bt ON b.billing_type_id = bt.id
       WHERE b.bill_date = CURDATE() AND b.status = 'COMPLETED'
       GROUP BY bt.id, bt.name`
    );

    const [counts] = await pool.query<any[]>(
      `SELECT 
         (SELECT COUNT(*) FROM patients) AS total_patients,
         (SELECT COUNT(*) FROM doctors WHERE is_active = 1) AS total_doctors,
         (SELECT COUNT(*) FROM products WHERE is_active = 1) AS total_products,
         (SELECT COUNT(*) FROM bills WHERE status = 'COMPLETED') AS total_bills`
    );

    const [recentBills] = await pool.query<any[]>(
      `SELECT b.id, b.bill_number, DATE_FORMAT(b.bill_date, '%Y-%m-%d') AS bill_date,
              b.grand_total, p.name AS patient_name
       FROM bills b
       JOIN patients p ON b.patient_id = p.id
       WHERE b.status = 'COMPLETED'
       ORDER BY b.id DESC
       LIMIT 5`
    );

    res.json({
      today_bills: Number(todayStats[0].today_bills),
      today_collection: Number(todayStats[0].today_collection),
      type_stats: typeStats,
      counts: counts[0],
      recent_bills: recentBills,
    });
  })
);

// NEW: Charts data endpoint
dashboardRouter.get(
  "/charts",
  requireAuth,
  asyncHandler(async (_req, res) => {
    // 1. Last 7 days sales trend
    const [salesTrend] = await pool.query<any[]>(
      `SELECT 
         DATE_FORMAT(bill_date, '%d %b') AS label,
         COUNT(*) AS bill_count,
         COALESCE(SUM(grand_total), 0) AS revenue
       FROM bills
       WHERE status = 'COMPLETED'
         AND bill_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY bill_date
       ORDER BY bill_date ASC`
    );

    // 2. Top 5 fast moving medicines
    const [topMedicines] = await pool.query<any[]>(
      `SELECT p.name AS medicine_name,
              COALESCE(SUM(bi.quantity), 0) AS total_sold
       FROM bill_items bi
       JOIN bills b ON bi.bill_id = b.id
       JOIN products p ON bi.source_product_id = p.id
       WHERE bi.item_kind = 'PRODUCT'
         AND b.status = 'COMPLETED'
         AND b.bill_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY p.id, p.name
       ORDER BY total_sold DESC
       LIMIT 5`
    );

    // 3. Payment methods breakdown
    const [paymentMethods] = await pool.query<any[]>(
      `SELECT payment_method, COUNT(*) AS count,
              COALESCE(SUM(amount_received), 0) AS total
       FROM payments
       GROUP BY payment_method
       ORDER BY total DESC`
    );

    // 4. Stock status
    const [stockStatus] = await pool.query<any[]>(
      `SELECT 
         SUM(CASE WHEN quantity > 10 AND expiry_date > DATE_ADD(CURDATE(), INTERVAL 90 DAY) THEN 1 ELSE 0 END) AS healthy,
         SUM(CASE WHEN quantity <= 10 AND quantity > 0 THEN 1 ELSE 0 END) AS low_stock,
         SUM(CASE WHEN expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY) AND expiry_date >= CURDATE() THEN 1 ELSE 0 END) AS expiring,
         SUM(CASE WHEN expiry_date < CURDATE() THEN 1 ELSE 0 END) AS expired
       FROM medicine_inventory
       WHERE is_active = 1`
    );

    // 5. Bills by type (last 30 days)
    const [billsByType] = await pool.query<any[]>(
      `SELECT bt.name AS type_name, COUNT(*) AS count
       FROM bills b
       JOIN billing_types bt ON b.billing_type_id = bt.id
       WHERE b.status = 'COMPLETED'
         AND b.bill_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY bt.id, bt.name
       ORDER BY count DESC`
    );

    res.json({
      sales_trend: salesTrend,
      top_medicines: topMedicines,
      payment_methods: paymentMethods,
      stock_status: {
        healthy: Number(stockStatus[0].healthy || 0),
        low_stock: Number(stockStatus[0].low_stock || 0),
        expiring: Number(stockStatus[0].expiring || 0),
        expired: Number(stockStatus[0].expired || 0),
      },
      bills_by_type: billsByType,
    });
  })
);