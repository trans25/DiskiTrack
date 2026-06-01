import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

/**
 * @typedef {Object} TokenPayload
 * @property {string} sub        user id
 * @property {string|null} tenantId
 * @property {string} role
 * @property {string} email
 */

/** @param {TokenPayload} payload */
export const signAccessToken = (payload) =>
  jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

/** @param {TokenPayload} payload */
export const signRefreshToken = (payload) =>
  jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });

/** @param {string} token */
export const verifyAccessToken = (token) =>
  jwt.verify(token, config.jwt.secret);

/** @param {string} token */
export const verifyRefreshToken = (token) =>
  jwt.verify(token, config.jwt.refreshSecret);
