const { Prisma } = require("@prisma/client");
const prisma = require("../config/prisma");

const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";

const parsePositiveInteger = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
};

const parseDate = (dateString) => {
  if (!isNonEmptyString(dateString)) return null;
  const [year, month, day] = dateString.split("-").map(Number);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
};

const calculateAge = (birthDate) => {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
  if (!birthdayPassed) age--;
  return age;
};

const toMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const isCurrentTimeInSlot = (slot) => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return (
    toMinutes(slot.startTime) <= currentMinutes &&
    currentMinutes < toMinutes(slot.endTime)
  );
};

const getTodayBounds = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const validateLeadInput = async (data) => {
  if (!isNonEmptyString(data.firstName)) {
    const error = new Error("firstName is required");
    error.statusCode = 400;
    throw error;
  }

  if (!isNonEmptyString(data.lastName)) {
    const error = new Error("lastName is required");
    error.statusCode = 400;
    throw error;
  }

  const birthDate = parseDate(data.birthDate);
  if (!birthDate) {
    const error = new Error("birthDate must be a valid date in YYYY-MM-DD format");
    error.statusCode = 400;
    throw error;
  }

  if (!isNonEmptyString(data.postalCode)) {
    const error = new Error("postalCode is required");
    error.statusCode = 400;
    throw error;
  }

  const verticalId = parsePositiveInteger(data.verticalId);
  if (!verticalId) {
    const error = new Error("verticalId must be a positive integer");
    error.statusCode = 400;
    throw error;
  }

  const vertical = await prisma.vertical.findUnique({ where: { id: verticalId } });
  if (!vertical) {
    const error = new Error("Vertical not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    birthDate,
    age: calculateAge(birthDate),
    postalCode: data.postalCode.trim(),
    verticalId,
  };
};

const findEligibleDeliveries = async (tx, { age, postalCode, verticalId }) => {
  const { start, end } = getTodayBounds();

  const candidates = await tx.delivery.findMany({
    where: {
      verticalId,
      minAge: { lte: age },
      maxAge: { gte: age },
    },
    include: {
      client: {
        select: { id: true, name: true, company: true },
      },
      vertical: {
        select: { id: true, name: true },
      },
      postalCodes: true,
      timeSlots: true,
    },
  });

  const deliveryIds = candidates.map((delivery) => delivery.id);

  const leadCounts = deliveryIds.length
    ? await tx.lead.groupBy({
        by: ["assignedDeliveryId"],
        where: {
          status: "DISTRIBUTED",
          distributedAt: { gte: start, lt: end },
          assignedDeliveryId: { in: deliveryIds },
        },
        _count: { _all: true },
      })
    : [];

  const countMap = new Map(leadCounts.map((item) => [item.assignedDeliveryId, item._count._all]));

  const eligible = candidates.filter((delivery) => {
    const count = countMap.get(delivery.id) || 0;
    const postalMatch = delivery.postalCodes.some((code) => code.postalCode === postalCode);
    const timeMatch = delivery.timeSlots.some(isCurrentTimeInSlot);
    return count < delivery.capacity && postalMatch && timeMatch;
  });

  eligible.sort((a, b) => {
    const priceDiff = Number(b.price) - Number(a.price);
    if (priceDiff !== 0) return priceDiff;
    const countA = countMap.get(a.id) || 0;
    const countB = countMap.get(b.id) || 0;
    if (countA !== countB) return countA - countB;
    return a.id - b.id;
  });

  return { eligible, countMap };
};

const mapDeliveryWithCapacity = (delivery, countMap) => {
  const assignedCount = countMap.get(delivery.id) || 0;
  return {
    id: delivery.id,
    clientId: delivery.clientId,
    verticalId: delivery.verticalId,
    minAge: delivery.minAge,
    maxAge: delivery.maxAge,
    capacity: delivery.capacity,
    remainingCapacity: delivery.capacity - assignedCount,
    price: Number(delivery.price),
    client: delivery.client,
    vertical: delivery.vertical,
    postalCodes: delivery.postalCodes,
    timeSlots: delivery.timeSlots,
  };
};

const mapLeadResponse = (lead) => ({
  id: lead.id,
  firstName: lead.firstName,
  lastName: lead.lastName,
  birthDate: lead.birthDate,
  postalCode: lead.postalCode,
  verticalId: lead.verticalId,
  vertical: lead.vertical,
  status: lead.status,
  assignedDeliveryId: lead.assignedDeliveryId,
  distributedAt: lead.distributedAt,
  pricePaid: lead.pricePaid ? Number(lead.pricePaid) : null,
  delivery: lead.assignedDelivery
    ? {
        id: lead.assignedDelivery.id,
        clientId: lead.assignedDelivery.clientId,
        verticalId: lead.assignedDelivery.verticalId,
        minAge: lead.assignedDelivery.minAge,
        maxAge: lead.assignedDelivery.maxAge,
        capacity: lead.assignedDelivery.capacity,
        price: Number(lead.assignedDelivery.price),
        client: lead.assignedDelivery.client,
        vertical: lead.assignedDelivery.vertical,
        postalCodes: lead.assignedDelivery.postalCodes,
        timeSlots: lead.assignedDelivery.timeSlots,
      }
    : null,
  createdAt: lead.createdAt,
  updatedAt: lead.updatedAt,
});

const MAX_RETRIES = 3;

const distributeLead = async (tx, leadData) => {
  const { eligible } = await findEligibleDeliveries(tx, leadData);
  const winner = eligible[0] || null;
  const now = new Date();

  const lead = await tx.lead.create({
    data: {
      firstName: leadData.firstName,
      lastName: leadData.lastName,
      birthDate: leadData.birthDate,
      postalCode: leadData.postalCode,
      verticalId: leadData.verticalId,
      status: winner ? "DISTRIBUTED" : "NOT_DISTRIBUTED",
      assignedDeliveryId: winner ? winner.id : null,
      distributedAt: winner ? now : null,
      pricePaid: winner ? winner.price : null,
    },
    include: {
      vertical: { select: { id: true, name: true } },
      assignedDelivery: {
        include: {
          client: { select: { id: true, name: true, company: true } },
          vertical: { select: { id: true, name: true } },
          postalCodes: true,
          timeSlots: true,
        },
      },
    },
  });

  return mapLeadResponse(lead);
};

const create = async (data) => {
  const leadData = await validateLeadInput(data);

  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      return await prisma.$transaction(
        async (tx) => distributeLead(tx, leadData),
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }
      );
    } catch (error) {
      if (error.code === "P2034") {
        attempt++;
        if (attempt >= MAX_RETRIES) {
          throw error;
        }
      } else {
        throw error;
      }
    }
  }
};

const simulate = async (data) => {
  const leadData = await validateLeadInput(data);

  const { eligible, countMap } = await findEligibleDeliveries(prisma, leadData);

  return eligible.map((delivery) => mapDeliveryWithCapacity(delivery, countMap));
};

const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  return { page, limit, skip: (page - 1) * limit, take: limit };
};

const parseDateRange = (startDate, endDate) => {
  const filters = {};
  if (startDate) {
    const date = new Date(startDate);
    if (!isNaN(date.getTime())) filters.gte = date;
  }
  if (endDate) {
    const date = new Date(endDate);
    if (!isNaN(date.getTime())) {
      date.setHours(23, 59, 59, 999);
      filters.lte = date;
    }
  }
  return Object.keys(filters).length > 0 ? filters : undefined;
};

const buildLeadFilters = (query) => {
  const where = {};

  if (query.status === "DISTRIBUTED" || query.status === "NOT_DISTRIBUTED") {
    where.status = query.status;
  }

  const verticalId = parseInt(query.verticalId, 10);
  if (!isNaN(verticalId) && verticalId > 0) {
    where.verticalId = verticalId;
  }

  const clientId = parseInt(query.clientId, 10);
  if (!isNaN(clientId) && clientId > 0) {
    where.assignedDelivery = { clientId };
  }

  const createdAt = parseDateRange(query.startDate, query.endDate);
  if (createdAt) {
    where.createdAt = createdAt;
  }

  return where;
};

const list = async (query = {}) => {
  const { page, limit, skip, take } = parsePagination(query);
  const where = buildLeadFilters(query);

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        vertical: { select: { id: true, name: true } },
        assignedDelivery: {
          include: {
            client: { select: { id: true, name: true, company: true } },
            vertical: { select: { id: true, name: true } },
            postalCodes: true,
            timeSlots: true,
          },
        },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return {
    data: leads.map(mapLeadResponse),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  create,
  simulate,
  list,
  isNonEmptyString,
  parsePositiveInteger,
  parseDate,
  calculateAge,
  toMinutes,
  isCurrentTimeInSlot,
  getTodayBounds,
  findEligibleDeliveries,
  mapDeliveryWithCapacity,
  mapLeadResponse,
  validateLeadInput,
};
