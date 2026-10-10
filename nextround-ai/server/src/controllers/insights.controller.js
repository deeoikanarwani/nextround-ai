import { asyncHandler } from '../utils/errors.js';
import { getDashboard, getAnalytics } from '../services/insights.service.js';

export const dashboard = asyncHandler(async (req, res) => {
  res.json(await getDashboard(req.user));
});

export const analytics = asyncHandler(async (req, res) => {
  res.json(await getAnalytics(req.user._id));
});
