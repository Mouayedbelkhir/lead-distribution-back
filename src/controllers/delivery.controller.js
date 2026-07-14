const deliveryService = require("../services/delivery.service");

const list = async (req, res, next) => {
  try {
    const deliveries = await deliveryService.list();
    res.json({ success: true, data: deliveries });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const delivery = await deliveryService.getById(req.params.id);
    res.json({ success: true, data: delivery });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const delivery = await deliveryService.create(req.body);
    res.status(201).json({ success: true, data: delivery });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const delivery = await deliveryService.update(req.params.id, req.body);
    res.json({ success: true, data: delivery });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await deliveryService.remove(req.params.id);
    res.json({ success: true, message: "Delivery deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};
