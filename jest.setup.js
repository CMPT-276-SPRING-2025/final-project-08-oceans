import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.Headers = jest.fn().mockImplementation(() => ({
  append: jest.fn(),
  get: jest.fn(),
  has: jest.fn(),
}));

global.Request = jest.fn().mockImplementation((url, options = {}) => {
  const parsedUrl = new URL(url);
  return {
    url,
    headers: new Map(),
    ...options,
    json: jest.fn().mockResolvedValue({}),
    get URL() {
      return parsedUrl;
    }
  };
});

global.Response = jest.fn().mockImplementation((body, options = {}) => ({
  ok: true,
  status: 200,
  // Parse the body if it's a string, otherwise return it directly
  json: jest.fn().mockResolvedValue(typeof body === 'string' ? JSON.parse(body) : body),
  text: jest.fn().mockResolvedValue(body),
  ...options,
}));

global.URL = URL;

jest.mock('next/server', () => {
  return {
    NextResponse: {
      json: jest.fn((data, options) => {
        return {
          json: async () => data,
          status: options?.status || 200,
        };
      }),
    },
  };
});

console.error = jest.fn();
