const db = require('../database');

/**
 * Analytics Service — Phase 3.
 * Read-only aggregate queries over orders/payments/products/tickets,
 * scoped per guild (every relevant table has a guild_id column).
 */
module.exports = {
  /**
   * High-level summary: revenue, order counts by status, buyer count,
   * top products, and ticket counts. Used by /analytics command and
   * the dashboard analytics endpoint.
   */
  getSummary(guildId) {
    const revenueRow = db
      .prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE guild_id = ? AND status = 'approved'`)
      .get(guildId);

    const approvedCountRow = db
      .prepare(`SELECT COUNT(*) AS count FROM payments WHERE guild_id = ? AND status = 'approved'`)
      .get(guildId);

    const ordersByStatus = db
      .prepare(`SELECT status, COUNT(*) AS count FROM orders WHERE guild_id = ? GROUP BY status`)
      .all(guildId);

    const totalOrders = db.prepare(`SELECT COUNT(*) AS count FROM orders WHERE guild_id = ?`).get(guildId);

    const uniqueBuyers = db
      .prepare(`SELECT COUNT(DISTINCT user_id) AS count FROM payments WHERE guild_id = ? AND status = 'approved'`)
      .get(guildId);

    const topProducts = db
      .prepare(
        `SELECT p.id, p.name, COUNT(o.id) AS orders_count, COALESCE(SUM(pay.amount), 0) AS revenue
         FROM orders o
         JOIN products p ON p.id = o.product_id
         LEFT JOIN payments pay ON pay.order_id = o.id AND pay.status = 'approved'
         WHERE o.guild_id = ?
         GROUP BY p.id
         ORDER BY revenue DESC, orders_count DESC
         LIMIT 5`
      )
      .all(guildId);

    const ticketsByStatus = db
      .prepare(`SELECT type, status, COUNT(*) AS count FROM tickets WHERE guild_id = ? GROUP BY type, status`)
      .all(guildId);

    const avgOrderValue = approvedCountRow.count > 0 ? Math.round(revenueRow.total / approvedCountRow.count) : 0;

    return {
      totalRevenue: revenueRow.total,
      approvedPayments: approvedCountRow.count,
      totalOrders: totalOrders.count,
      uniqueBuyers: uniqueBuyers.count,
      avgOrderValue,
      ordersByStatus,
      topProducts,
      ticketsByStatus,
    };
  },

  /**
   * Daily revenue for the last N days (for charting on the dashboard).
   * Returns an array of { date: 'YYYY-MM-DD', revenue: number, orders: number }.
   */
  getRevenueTimeline(guildId, days = 30) {
    const rows = db
      .prepare(
        `SELECT DATE(reviewed_at) AS date, COALESCE(SUM(amount), 0) AS revenue, COUNT(*) AS orders
         FROM payments
         WHERE guild_id = ? AND status = 'approved'
           AND reviewed_at >= DATE('now', ?)
         GROUP BY DATE(reviewed_at)
         ORDER BY date ASC`
      )
      .all(guildId, `-${days} days`);

    return rows;
  },

  /**
   * Recent activity feed: most recent approved payments, joined with product name.
   */
  getRecentSales(guildId, limit = 10) {
    return db
      .prepare(
        `SELECT pay.id, pay.amount, pay.reviewed_at, pay.user_id, p.name AS product_name
         FROM payments pay
         JOIN orders o ON o.id = pay.order_id
         JOIN products p ON p.id = o.product_id
         WHERE pay.guild_id = ? AND pay.status = 'approved'
         ORDER BY pay.reviewed_at DESC
         LIMIT ?`
      )
      .all(guildId, limit);
  },
};
