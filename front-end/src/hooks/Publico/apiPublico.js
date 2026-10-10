import { keys } from '../../config/keys.js';

export const ENDPOINTS = {
  comentarios: `https://api.jsonbin.io/v3/b/${keys.jsonbin.binId}`,
};

export const JSONBIN_HEADERS = {
  'Content-Type': 'application/json',
  'X-Master-Key': keys.jsonbin.apiKey,
  'X-Bin-Versioning': 'false',
};
