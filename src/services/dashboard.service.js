const prisma = require("../config/prisma");

const getStats = async () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const [
    clients,
    verticals,
    deliveries,
    leads,
    distributedLeads,
    notDistributedLeads,
    revenue,
    todayDistributed,
    capacityAggregate,
    priceAggregate,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.vertical.count(),
    prisma.delivery.count(),
    prisma.lead.count(),
    prisma.lead.count({ where: { status: "DISTRIBUTED" } }),
    prisma.lead.count({ where: { status: "NOT_DISTRIBUTED" } }),
    prisma.lead.aggregate({
      _sum: { pricePaid: true },
      where: { status: "DISTRIBUTED" },
    }),
    prisma.lead.count({
      where: {
        status: "DISTRIBUTED",
        distributedAt: {
          gte: start,
          lt: end,
        },
      },
    }),
    prisma.delivery.aggregate({
      _sum: { capacity: true },
    }),
    prisma.delivery.aggregate({
      _avg: { price: true },
    }),
  ]);

  const totalCapacity = Number(capacityAggregate._sum.capacity || 0);

  const distributionRate = leads > 0 ? Number(((distributedLeads / leads) * 100).toFixed(2)) : 0;
  const capacityFillRate = totalCapacity > 0 ? Number(((todayDistributed / totalCapacity) * 100).toFixed(2)) : 0;

  return {
    clients,
    verticals,
    deliveries,
    leads,
    distributedLeads,
    notDistributedLeads,
    todayDistributed,
    totalRevenue: Number(revenue._sum.pricePaid || 0),
    totalCapacity,
    remainingCapacity: Math.max(totalCapacity - todayDistributed, 0),
    averagePrice: Number(priceAggregate._avg.price || 0),
    distributionRate,
    capacityFillRate,
  };
};

module.exports = {
  getStats,
};
