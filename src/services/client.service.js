const prisma = require("../config/prisma");

const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";

const list = async () => {
  const clients = await prisma.client.findMany({
    include: {
      _count: {
        select: { deliveries: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return clients.map((client) => ({
    id: client.id,
    name: client.name,
    company: client.company,
    email: client.email,
    isActive: client.isActive,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
    deliveriesCount: client._count.deliveries,
  }));
};

const getById = async (id) => {
  const clientId = Number(id);

  if (!Number.isInteger(clientId)) {
    const error = new Error("Invalid client id");
    error.statusCode = 400;
    throw error;
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      deliveries: {
        select: {
          id: true,
          capacity: true,
          price: true,
          createdAt: true,
        },
      },
      _count: {
        select: { deliveries: true },
      },
    },
  });

  if (!client) {
    const error = new Error("Client not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    id: client.id,
    name: client.name,
    company: client.company,
    email: client.email,
    isActive: client.isActive,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
    deliveriesCount: client._count.deliveries,
    deliveries: client.deliveries,
  };
};

const create = async (data) => {
  if (!isNonEmptyString(data.name)) {
    const error = new Error("Name is required");
    error.statusCode = 400;
    throw error;
  }

  if (data.isActive !== undefined && typeof data.isActive !== "boolean") {
    const error = new Error("isActive must be boolean");
    error.statusCode = 400;
    throw error;
  }

  const name = data.name.trim();
  const company = isNonEmptyString(data.company) ? data.company.trim() : null;
  const email = isNonEmptyString(data.email) ? data.email.trim() : null;
  const isActive = data.isActive !== undefined ? data.isActive : true;

  try {
    const client = await prisma.client.create({
      data: { name, company, email, isActive },
    });

    return client;
  } catch (error) {
    if (error.code === "P2002" && error.meta?.target?.includes("email")) {
      const conflictError = new Error("Email already in use");
      conflictError.statusCode = 409;
      throw conflictError;
    }
    throw error;
  }
};

const update = async (id, data) => {
  const clientId = Number(id);

  if (!Number.isInteger(clientId)) {
    const error = new Error("Invalid client id");
    error.statusCode = 400;
    throw error;
  }

  const existing = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!existing) {
    const error = new Error("Client not found");
    error.statusCode = 404;
    throw error;
  }

  const updateData = {};

  if (data.name !== undefined) {
    if (!isNonEmptyString(data.name)) {
      const error = new Error("Name cannot be empty");
      error.statusCode = 400;
      throw error;
    }
    updateData.name = data.name.trim();
  }

  if (data.company !== undefined) {
    updateData.company = isNonEmptyString(data.company) ? data.company.trim() : null;
  }

  if (data.email !== undefined) {
    updateData.email = isNonEmptyString(data.email) ? data.email.trim() : null;
  }

  if (data.isActive !== undefined) {
    if (typeof data.isActive !== "boolean") {
      const error = new Error("isActive must be boolean");
      error.statusCode = 400;
      throw error;
    }
    updateData.isActive = data.isActive;
  }

  if (Object.keys(updateData).length === 0) {
    const error = new Error("No fields provided for update");
    error.statusCode = 400;
    throw error;
  }

  try {
    const client = await prisma.client.update({
      where: { id: clientId },
      data: updateData,
    });

    return client;
  } catch (error) {
    if (error.code === "P2002" && error.meta?.target?.includes("email")) {
      const conflictError = new Error("Email already in use");
      conflictError.statusCode = 409;
      throw conflictError;
    }
    throw error;
  }
};

const remove = async (id) => {
  const clientId = Number(id);

  if (!Number.isInteger(clientId)) {
    const error = new Error("Invalid client id");
    error.statusCode = 400;
    throw error;
  }

  const existing = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      _count: {
        select: { deliveries: true },
      },
    },
  });

  if (!existing) {
    const error = new Error("Client not found");
    error.statusCode = 404;
    throw error;
  }

  if (existing._count.deliveries > 0) {
    const error = new Error("Cannot delete client with existing deliveries");
    error.statusCode = 409;
    throw error;
  }

  await prisma.client.delete({
    where: { id: clientId },
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
