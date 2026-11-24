import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from './models/User.js';
import { sendProblem, TYPE_CATALOGUE } from '../../utils/problem.js';

dotenv.config();
const SECRET = process.env.JWT_SECRET || 'campuseats_cs543_super_secret_jwt_key_2026';

/**
 * CS543 Assignment 09: Task 2 — POST /login
 * Verifies password with bcrypt.compareSync;
 * returns a JWT signed with SECRET carrying user id and role, with expiry (expiresIn).
 * On failure replies 401.
 */
export async function loginUser(req, res, next) {
  try {
    const { email, studentId, username, password } = req.body;
    const identifier = email || studentId || username;

    if (!identifier || !password) {
      return res.status(401).json({ error: 'missing credentials' });
    }

    const user = await User.findOne({
      $or: [{ email: identifier }, { studentId: identifier }]
    });

    if (!user || !user.comparePassword(password)) {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    // Sign JWT carrying user id and role, with expiry
    const token = jwt.sign(
      { id: user.studentId, role: user.role, email: user.email },
      SECRET,
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      token,
      user: {
        id: user.studentId,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function registerUser(req, res, next) {
  try {
    const { studentId, name, email, phone, password, role, addresses } = req.body;
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

    const rawPassword = password || 'DefaultPass@123';
    const passwordHash = bcrypt.hashSync(rawPassword, 10);

    const user = await User.create({
      studentId,
      name,
      email,
      phone: phone || '+91-9876543210',
      passwordHash,
      role: role || 'customer',
      addresses: addresses || []
    });

    res.status(201).json({
      studentId: user.studentId,
      name: user.name,
      email: user.email,
      role: user.role,
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
      role: user.role,
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
