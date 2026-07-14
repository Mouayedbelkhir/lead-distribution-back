const verticalService = require("../services/vertical.service");

const list = async (req, res, next) => {
  try {
    const verticals = await verticalService.list();
    res.json({ success: true, data: verticals });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const vertical = await verticalService.getById(req.params.id);
    res.json({ success: true, data: vertical });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const vertical = await verticalService.create(req.body);
    res.status(201).json({ success: true, data: vertical });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const vertical = await verticalService.update(req.params.id, req.body);
    res.json({ success: true, data: vertical });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await verticalService.remove(req.params.id);
    res.json({ success: true, message: "Vertical deleted successfully" });
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
