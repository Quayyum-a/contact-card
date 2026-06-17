/**
 * INVALID TEST CASES - Creator Card API
 *
 * Tests all invalid scenarios that should return HTTP 400/403/404 with error codes
 */

const axios = require('axios');
const assert = require('assert');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  validateStatus: () => true,
});

describe('Creator Card API - Invalid Test Cases', () => {
  it('Test 7: Should reject duplicate slug (SL02)', async () => {
    const payload = {
      title: 'Another Full Test',
      slug: 'full-test-card', // Already exists
      creator_reference: 'crt_duplicate123456789',
      status: 'published',
    };

    const response = await api.post('/creator-cards', payload);

    assert.strictEqual(response.status, 400);
    assert.strictEqual(response.data.status, 'error');
    assert.strictEqual(response.data.code, 'SL02');
    assert(response.data.message.includes('taken'));
  });

  it('Test 8: Should reject private card without access_code (AC01)', async () => {
    const payload = {
      title: 'Missing Code Card',
      creator_reference: 'crt_missing123456789',
      status: 'published',
      access_type: 'private',
      // Missing access_code
    };

    const response = await api.post('/creator-cards', payload);

    assert.strictEqual(response.status, 400);
    assert.strictEqual(response.data.status, 'error');
    assert.strictEqual(response.data.code, 'AC01');
    assert(response.data.message.includes('required'));
  });

  it('Test 9: Should reject public card with access_code (AC05)', async () => {
    const payload = {
      title: 'Extra Code Card',
      creator_reference: 'crt_extra1234567890',
      status: 'published',
      access_type: 'public',
      access_code: 'ABC123', // Should not be allowed
    };

    const response = await api.post('/creator-cards', payload);

    assert.strictEqual(response.status, 400);
    assert.strictEqual(response.data.status, 'error');
    assert.strictEqual(response.data.code, 'AC05');
    assert(response.data.message.includes('private'));
  });

  it('Test 10: Should reject invalid status enum', async () => {
    const payload = {
      title: 'Bad Status Card',
      creator_reference: 'crt_badstatus12345678',
      status: 'archived', // Invalid enum value
    };

    const response = await api.post('/creator-cards', payload);

    assert.strictEqual(response.status, 400);
    assert.strictEqual(response.data.status, 'error');
    // This is framework validation, so no specific error code
  });

  it('Test 11: Should return 404 for non-existent card (NF01)', async () => {
    const response = await api.get('/creator-cards/does-not-exist-123');

    assert.strictEqual(response.status, 404);
    assert.strictEqual(response.data.status, 'error');
    assert.strictEqual(response.data.code, 'NF01');
    assert(response.data.message.includes('not found'));
  });

  it('Test 12: Should return 404 for draft card (NF02)', async () => {
    // First create a draft card
    const createPayload = {
      title: 'Draft Test Card',
      creator_reference: 'crt_draft1234567890',
      status: 'draft',
    };

    const createResponse = await api.post('/creator-cards', createPayload);
    assert.strictEqual(createResponse.status, 200);

    const { slug } = createResponse.data.data;

    // Try to retrieve draft card
    const response = await api.get(`/creator-cards/${slug}`);

    assert.strictEqual(response.status, 404);
    assert.strictEqual(response.data.status, 'error');
    assert.strictEqual(response.data.code, 'NF02');
  });

  it('Test 13: Should return 403 for private card without access code (AC03)', async () => {
    const response = await api.get('/creator-cards/private-test-card');

    assert.strictEqual(response.status, 403);
    assert.strictEqual(response.data.status, 'error');
    assert.strictEqual(response.data.code, 'AC03');
    assert(response.data.message.includes('private'));
  });

  it('Test 14: Should return 403 for private card with wrong access code (AC04)', async () => {
    const response = await api.get('/creator-cards/private-test-card?access_code=WRONG1');

    assert.strictEqual(response.status, 403);
    assert.strictEqual(response.data.status, 'error');
    assert.strictEqual(response.data.code, 'AC04');
    assert(response.data.message.includes('Invalid'));
  });

  it('Test 15: Should return 404 when deleting non-existent card (NF01)', async () => {
    const payload = {
      creator_reference: 'crt_nonexistent123456',
    };

    const response = await api.delete('/creator-cards/does-not-exist-456', { data: payload });

    assert.strictEqual(response.status, 404);
    assert.strictEqual(response.data.status, 'error');
    assert.strictEqual(response.data.code, 'NF01');
  });

  it('Test 16: Should return 404 when retrieving deleted card (NF01)', async () => {
    // This card was deleted in valid test case 6
    const response = await api.get('/creator-cards/auto-slug-generation-test');

    assert.strictEqual(response.status, 404);
    assert.strictEqual(response.data.status, 'error');
    assert.strictEqual(response.data.code, 'NF01');
  });
});

// Additional validation tests
describe('Creator Card API - Field Validation Tests', () => {
  it('Should reject title too short', async () => {
    const payload = {
      title: 'Hi', // Too short (< 3 chars)
      creator_reference: 'crt_short1234567890',
      status: 'published',
    };

    const response = await api.post('/creator-cards', payload);
    assert.strictEqual(response.status, 400);
  });

  it('Should reject title too long', async () => {
    const payload = {
      title: 'A'.repeat(101), // Too long (> 100 chars)
      creator_reference: 'crt_long12345678901',
      status: 'published',
    };

    const response = await api.post('/creator-cards', payload);
    assert.strictEqual(response.status, 400);
  });

  it('Should reject invalid creator_reference length', async () => {
    const payload = {
      title: 'Test Card',
      creator_reference: 'too_short', // Not exactly 20 chars
      status: 'published',
    };

    const response = await api.post('/creator-cards', payload);
    assert.strictEqual(response.status, 400);
  });

  it('Should reject invalid URL format', async () => {
    const payload = {
      title: 'Test Card',
      creator_reference: 'crt_url123456789012',
      links: [
        { title: 'Bad URL', url: 'ftp://invalid.com' }, // Not http/https
      ],
      status: 'published',
    };

    const response = await api.post('/creator-cards', payload);
    assert.strictEqual(response.status, 400);
  });

  it('Should reject invalid service rate amount', async () => {
    const payload = {
      title: 'Test Card',
      creator_reference: 'crt_rate123456789012',
      service_rates: {
        currency: 'USD',
        rates: [
          { name: 'Test', description: 'Test service', amount: 0 }, // Invalid (< 1)
        ],
      },
      status: 'published',
    };

    const response = await api.post('/creator-cards', payload);
    assert.strictEqual(response.status, 400);
  });

  it('Should reject invalid access_code length', async () => {
    const payload = {
      title: 'Test Card',
      creator_reference: 'crt_code123456789012',
      status: 'published',
      access_type: 'private',
      access_code: '12345', // Too short (not 6 chars)
    };

    const response = await api.post('/creator-cards', payload);
    assert.strictEqual(response.status, 400);
  });
});

module.exports = {
  runInvalidTests: async () => {
    console.log('Running invalid test cases...');
    // Implementation would run all tests programmatically
  },
};
