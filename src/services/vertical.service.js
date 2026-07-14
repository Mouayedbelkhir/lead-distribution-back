const prisma = require("../config/prisma");

const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";

const validateVerticalId = (id) => {
  const verticalId = Number(id);
  if (!Number.isInteger(verticalId)) {
    const error = new Error("Invalid vertical id");
    error.statusCode = 400;
    throw error;
  }
  return verticalId;
};

const handleUniqueNameError = (error) => {
  if (error.code === "P2002" && error.meta?.target?.includes("name")) {
    const conflictError = new Error("Name already in use");
    conflictError.statusCode = 409;
    throw conflictError;
  }
  throw error;
};

const mapVerticalResponse = (vertical) => ({
  id: vertical.id,
  name: vertical.name,
  deliveriesCount: vertical._count.deliveries,
  createdAt: vertical.createdAt,
  updatedAt: vertical.updatedAt,
});

const list = async () => {
  const verticals = await prisma.vertical.findMany({
    include: {
      _count: {
        select: { deliveries: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return verticals.map(mapVerticalResponse);
};

const getById = async (id) => {
  const verticalId = validateVerticalId(id);

  const vertical = await prisma.vertical.findUnique({
    where: { id: verticalId },
    include: {
      _count: {
        select: { deliveries: true },
      },
    },
  });

  if (!vertical) {
    const error = new Error("Vertical not found");
    error.statusCode = 404;
    throw error;
  }

  return mapVerticalResponse(vertical);
};

const create = async (data) => {
  if (!isNonEmptyString(data.name)) {
    const error = new Error("Name is required");
    error.statusCode = 400;
    throw error;
  }

  try {
    const vertical = await prisma.vertical.create({
      data: { name: data.name.trim() },
    });

    return vertical;
  } catch (error) {
    handleUniqueNameError(error);
  }
};

const update = async (id, data) => {
  const verticalId = validateVerticalId(id);

  const existing = await prisma.vertical.findUnique({
    where: { id: verticalId },
  });

  if (!existing) {
    const error = new Error("Vertical not found");
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

  if (Object.keys(updateData).length === 0) {
    const error = new Error("No fields provided for update");
    error.statusCode = 400;
    throw error;
  }

  try {
    const vertical = await prisma.vertical.update({
      where: { id: verticalId },
      data: updateData,
    });

    return vertical;
  } catch (error) {
    handleUniqueNameError(error);
  }
};

const remove = async (id) => {
  const verticalId = validateVerticalId(id);

  const existing = await prisma.vertical.findUnique({
    where: { id: verticalId },
    include: {
      _count: {
        select: { deliveries: true },
      },
    },
  });

  if (!existing) {
    const error = new Error("Vertical not found");
    error.statusCode = 404;
    throw error;
  }

  if (existing._count.deliveries > 0) {
    const error = new Error("Cannot delete vertical with existing deliveries");
    error.statusCode = 409;
    throw error;
  }

  await prisma.vertical.delete({
    where: { id: verticalId },
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
