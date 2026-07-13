const clientService = require("../services/client.service");

const list = async (req, res, next) => {
  try {
    const clients = await clientService.list();
    res.json({ success: true, data: clients });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const client = await clientService.getById(req.params.id);
    res.json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const client = await clientService.create(req.body);
    res.status(201).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const client = await clientService.update(req.params.id, req.body);
    res.json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await clientService.remove(req.params.id);
    res.json({ success: true, message: "Client deleted successfully" });
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
