import { User } from './models/User.js';
import { sendProblem, TYPE_CATALOGUE } from '../../utils/problem.js';

export async function registerUser(req, res, next) {
  try {
    const { studentId, name, email, phone, addresses } = req.body;
    if (!studentId || !name || !email) {
      return sendProblem(res, {
        type: TYPE_CATALOGUE.VALIDATION_ERROR,
        title: 'Validation Error',
        status: 422,
        detail: 'studentId, name, and email are required fields.',
        instance: req.originalUrl
      });
    }

    const existing = await User.findOne({ studentId });
    if (existing) {
      return sendProblem(res, {
        type: TYPE_CATALOGUE.VALIDATION_ERROR,
        title: 'User Already Exists',
        status: 409,
        detail: `User with student ID '${studentId}' is already registered.`,
        instance: req.originalUrl
      });
    }

    const user = await User.create({ studentId, name, email, phone, addresses: addresses || [] });
    res.status(201).json({
      studentId: user.studentId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      addresses: user.addresses
    });
  } catch (err) {
    next(err);
  }
}

export async function getProfile(req, res, next) {
  try {
    const { studentId } = req.params;
    const user = await User.findOne({ studentId });
    if (!user) {
      return sendProblem(res, {
        type: TYPE_CATALOGUE.ORDER_NOT_FOUND,
        title: 'User Not Found',
        status: 404,
        detail: `Student profile with ID '${studentId}' was not found.`,
        instance: req.originalUrl
      });
    }

    res.json({
      studentId: user.studentId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      addresses: user.addresses
    });
  } catch (err) {
    next(err);
  }
}

export async function addAddress(req, res, next) {
  try {
    const { studentId } = req.params;
    const { title, area, landmark } = req.body;
    if (!title || !area) {
      return sendProblem(res, {
        type: TYPE_CATALOGUE.VALIDATION_ERROR,
        title: 'Validation Error',
        status: 422,
        detail: 'Address title and area are required.',
        instance: req.originalUrl
      });
    }

    const user = await User.findOne({ studentId });
    if (!user) {
      return sendProblem(res, {
        type: TYPE_CATALOGUE.ORDER_NOT_FOUND,
        title: 'User Not Found',
        status: 404,
        detail: `User '${studentId}' not found.`,
        instance: req.originalUrl
      });
    }

    user.addresses.push({ title, area, landmark });
    await user.save();
    res.status(201).json(user.addresses);
  } catch (err) {
    next(err);
  }
}
