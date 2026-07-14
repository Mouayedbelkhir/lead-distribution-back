const leadService = require("../services/lead.service");

const create = async (req, res, next) => {
  try {
    const lead = await leadService.create(req.body);
    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
};

const simulate = async (req, res, next) => {
  try {
    const deliveries = await leadService.simulate(req.body);
    res.json({ success: true, data: deliveries });
  } catch (error) {
    next(error);
  }
};

const list = async (req, res, next) => {
  try {
    const result = await leadService.list(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  simulate,
  list,
};
