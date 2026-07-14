const { Prisma } = require("@prisma/client");
const prisma = require("../config/prisma");

const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";

const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;

const parsePositiveInteger = (value) => {
  const number = Number(value);
  return isPositiveInteger(number) ? number : null;
};

const parsePrice = (value) => {
  if (value === undefined || value === null) return null;
  const decimal = new Prisma.Decimal(value);
  if (decimal.isNaN() || decimal.lte(0)) return null;
  return decimal;
};

const isValidHHmm = (time) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);

const toMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const slotsOverlap = (aStart, aEnd, bStart, bEnd) => {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
};

const validateDeliveryId = (id) => {
  const deliveryId = Number(id);
  if (!Number.isInteger(deliveryId)) {
    const error = new Error("Invalid delivery id");
    error.statusCode = 400;
    throw error;
  }
  return deliveryId;
};

const validateClientExists = async (clientId) => {
  if (!Number.isInteger(clientId)) {
    const error = new Error("Invalid client id");
    error.statusCode = 400;
    throw error;
  }
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    const error = new Error("Client not found");
    error.statusCode = 404;
    throw error;
  }
};

const validateVerticalExists = async (verticalId) => {
  if (!Number.isInteger(verticalId)) {
    const error = new Error("Invalid vertical id");
    error.statusCode = 400;
    throw error;
  }
  const vertical = await prisma.vertical.findUnique({ where: { id: verticalId } });
  if (!vertical) {
    const error = new Error("Vertical not found");
    error.statusCode = 404;
    throw error;
  }
};

const validateAgeRange = (minAge, maxAge) => {
  if (!Number.isInteger(minAge) || !Number.isInteger(maxAge)) {
    const error = new Error("minAge and maxAge must be integers");
    error.statusCode = 400;
    throw error;
  }
  if (minAge > maxAge) {
    const error = new Error("minAge cannot be greater than maxAge");
    error.statusCode = 400;
    throw error;
  }
};

const validateCapacity = (capacity) => {
  if (!isPositiveInteger(capacity)) {
    const error = new Error("capacity must be a positive integer");
    error.statusCode = 400;
    throw error;
  }
};

const validatePrice = (price) => {
  const decimal = parsePrice(price);
  if (!decimal) {
    const error = new Error("price must be a positive number");
    error.statusCode = 400;
    throw error;
  }
  return decimal;
};

const validatePostalCodes = (postalCodes) => {
  if (!Array.isArray(postalCodes) || postalCodes.length === 0) {
    const error = new Error("postalCodes must be a non-empty array");
    error.statusCode = 400;
    throw error;
  }

  const normalized = postalCodes
    .map((code) => (isNonEmptyString(code) ? code.trim() : null))
    .filter(Boolean);

  const unique = [...new Set(normalized)];

  if (unique.length === 0) {
    const error = new Error("postalCodes must contain at least one valid code");
    error.statusCode = 400;
    throw error;
  }

  return unique;
};

const validateTimeSlots = (timeSlots) => {
  if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
    const error = new Error("timeSlots must be a non-empty array");
    error.statusCode = 400;
    throw error;
  }

  const normalized = [];

  for (const slot of timeSlots) {
    if (!slot || typeof slot !== "object" || !isValidHHmm(slot.startTime) || !isValidHHmm(slot.endTime)) {
      const error = new Error("Each time slot must have startTime and endTime in HH:mm format");
      error.statusCode = 400;
      throw error;
    }

    if (toMinutes(slot.startTime) >= toMinutes(slot.endTime)) {
      const error = new Error("startTime must be before endTime");
      error.statusCode = 400;
      throw error;
    }

    normalized.push({ startTime: slot.startTime, endTime: slot.endTime });
  }

  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const a = normalized[i];
      const b = normalized[j];
      if (slotsOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) {
        const error = new Error(`Time slots overlap: ${a.startTime}-${a.endTime} and ${b.startTime}-${b.endTime}`);
        error.statusCode = 400;
        throw error;
      }
    }
  }

  return normalized;
};

const mapDeliveryResponse = (delivery) => ({
  id: delivery.id,
  clientId: delivery.clientId,
  verticalId: delivery.verticalId,
  minAge: delivery.minAge,
  maxAge: delivery.maxAge,
  capacity: delivery.capacity,
  price: Number(delivery.price),
  client: delivery.client,
  vertical: delivery.vertical,
  postalCodes: delivery.postalCodes,
  timeSlots: delivery.timeSlots,
  leadsCount: delivery._count.leads,
  createdAt: delivery.createdAt,
  updatedAt: delivery.updatedAt,
});

const list = async () => {
  const deliveries = await prisma.delivery.findMany({
    include: {
      client: {
        select: { id: true, name: true, company: true },
      },
      vertical: {
        select: { id: true, name: true },
      },
      postalCodes: true,
      timeSlots: true,
      _count: {
        select: { leads: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return deliveries.map(mapDeliveryResponse);
};

const getById = async (id) => {
  const deliveryId = validateDeliveryId(id);

  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: {
      client: {
        select: { id: true, name: true, company: true },
      },
      vertical: {
        select: { id: true, name: true },
      },
      postalCodes: true,
      timeSlots: true,
      _count: {
        select: { leads: true },
      },
    },
  });

  if (!delivery) {
    const error = new Error("Delivery not found");
    error.statusCode = 404;
    throw error;
  }

  return mapDeliveryResponse(delivery);
};

const create = async (data) => {
  const clientId = parsePositiveInteger(data.clientId);
  const verticalId = parsePositiveInteger(data.verticalId);
  const minAge = parsePositiveInteger(data.minAge);
  const maxAge = parsePositiveInteger(data.maxAge);
  const capacity = parsePositiveInteger(data.capacity);
  const price = validatePrice(data.price);

  await validateClientExists(clientId);
  await validateVerticalExists(verticalId);
  validateAgeRange(minAge, maxAge);
  validateCapacity(capacity);

  const postalCodes = validatePostalCodes(data.postalCodes);
  const timeSlots = validateTimeSlots(data.timeSlots);

  try {
    const delivery = await prisma.$transaction(async (tx) => {
      const created = await tx.delivery.create({
        data: {
          clientId,
          verticalId,
          minAge,
          maxAge,
          capacity,
          price,
        },
      });

      await tx.deliveryPostalCode.createMany({
        data: postalCodes.map((postalCode) => ({
          deliveryId: created.id,
          postalCode,
        })),
      });

      await tx.deliveryTimeSlot.createMany({
        data: timeSlots.map((slot) => ({
          deliveryId: created.id,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
      });

      return created;
    });

    return getById(delivery.id);
  } catch (error) {
    if (error.code === "P2002") {
      const conflictError = new Error("Duplicate postal code for this delivery");
      conflictError.statusCode = 409;
      throw conflictError;
    }
    throw error;
  }
};

const update = async (id, data) => {
  const deliveryId = validateDeliveryId(id);

  const existing = await prisma.delivery.findUnique({
    where: { id: deliveryId },
  });

  if (!existing) {
    const error = new Error("Delivery not found");
    error.statusCode = 404;
    throw error;
  }

  const updateData = {};

  if (data.clientId !== undefined) {
    const clientId = parsePositiveInteger(data.clientId);
    await validateClientExists(clientId);
    updateData.clientId = clientId;
  }

  if (data.verticalId !== undefined) {
    const verticalId = parsePositiveInteger(data.verticalId);
    await validateVerticalExists(verticalId);
    updateData.verticalId = verticalId;
  }

  if (data.minAge !== undefined || data.maxAge !== undefined) {
    const minAge = data.minAge !== undefined ? parsePositiveInteger(data.minAge) : existing.minAge;
    const maxAge = data.maxAge !== undefined ? parsePositiveInteger(data.maxAge) : existing.maxAge;
    validateAgeRange(minAge, maxAge);
    updateData.minAge = minAge;
    updateData.maxAge = maxAge;
  }

  if (data.capacity !== undefined) {
    const capacity = parsePositiveInteger(data.capacity);
    validateCapacity(capacity);
    updateData.capacity = capacity;
  }

  if (data.price !== undefined) {
    updateData.price = validatePrice(data.price);
  }

  const hasScalarUpdate = Object.keys(updateData).length > 0;
  const replacePostalCodes = data.postalCodes !== undefined;
  const replaceTimeSlots = data.timeSlots !== undefined;

  if (!hasScalarUpdate && !replacePostalCodes && !replaceTimeSlots) {
    const error = new Error("No fields provided for update");
    error.statusCode = 400;
    throw error;
  }

  const postalCodes = replacePostalCodes ? validatePostalCodes(data.postalCodes) : null;
  const timeSlots = replaceTimeSlots ? validateTimeSlots(data.timeSlots) : null;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.delivery.update({
        where: { id: deliveryId },
        data: updateData,
      });

      if (replacePostalCodes) {
        await tx.deliveryPostalCode.deleteMany({ where: { deliveryId } });
        await tx.deliveryPostalCode.createMany({
          data: postalCodes.map((postalCode) => ({
            deliveryId,
            postalCode,
          })),
        });
      }

      if (replaceTimeSlots) {
        await tx.deliveryTimeSlot.deleteMany({ where: { deliveryId } });
        await tx.deliveryTimeSlot.createMany({
          data: timeSlots.map((slot) => ({
            deliveryId,
            startTime: slot.startTime,
            endTime: slot.endTime,
          })),
        });
      }
    });

    return getById(deliveryId);
  } catch (error) {
    if (error.code === "P2002") {
      const conflictError = new Error("Duplicate postal code for this delivery");
      conflictError.statusCode = 409;
      throw conflictError;
    }
    throw error;
  }
};

const remove = async (id) => {
  const deliveryId = validateDeliveryId(id);

  const existing = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: {
      _count: {
        select: { leads: true },
      },
    },
  });

  if (!existing) {
    const error = new Error("Delivery not found");
    error.statusCode = 404;
    throw error;
  }

  if (existing._count.leads > 0) {
    const error = new Error("Cannot delete delivery with assigned leads");
    error.statusCode = 409;
    throw error;
  }

  await prisma.delivery.delete({
    where: { id: deliveryId },
  });

  return { success: true };
};

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};
