/**
 * VALID TEST CASES - Creator Card API
 *
 * Tests all valid scenarios that should return HTTP 200
 */

const axios = require('axios');
const assert = require('assert');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  validateStatus: () => true,
});

describe('Creator Card API - Valid Test Cases', () => {
  it('Test 1: Should create card with all fields', async () => {
    const payload = {
      title: 'Full Test Card',
      description: 'Complete test with all fields',
      slug: 'full-test-card',
      creator_reference: 'crt_1234567890123456',
      links: [
        { title: 'YouTube', url: 'https://youtube.com/@test' },
        { title: 'Instagram', url: 'https://instagram.com/test' },
      ],
      service_rates: {
        currency: 'USD',
        rates: [
          { name: 'Post', description: 'Social media post', amount: 100 },
          { name: 'Story', description: 'Instagram story', amount: 50 },
        ],
      },
      status: 'published',
      access_type: 'public',
    };

    const response = await api.post('/creator-cards', payload);

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.data.status, 'success');

    const card = response.data.data;
    assert.strictEqual(card.title, payload.title);
    assert.strictEqual(card.slug, payload.slug);
    assert.strictEqual(card.access_type, 'public');
    assert.strictEqual(card.access_code, null);
    assert(card.id);
    assert(!card._id);
    assert(card.created);
    assert(card.updated);
    assert.strictEqual(card.deleted, null);
  });

  it('Test 2: Should auto-generate slug from title', async () => {
    const payload = {
      title: 'Auto Slug Generation Test',
      creator_reference: 'crt_auto123456789012',
      status: 'published',
    };

    const response = await api.post('/creator-cards', payload);

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.data.status, 'success');

    const card = response.data.data;
    assert.strictEqual(card.slug, 'auto-slug-generation-test');
    assert.strictEqual(card.access_type, 'public'); // Default value
    assert.strictEqual(card.description, null);
    assert.deepStrictEqual(card.links, []);
    assert.strictEqual(card.service_rates, null);
  });

  it('Test 3: Should create private card with access code', async () => {
    const payload = {
      title: 'Private Test Card',
      creator_reference: 'crt_private123456789',
      status: 'published',
      access_type: 'private',
      access_code: 'ABC123',
    };

    const response = await api.post('/creator-cards', payload);

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.data.status, 'success');

    const card = response.data.data;
    assert.strictEqual(card.access_type, 'private');
    assert.strictEqual(card.access_code, 'ABC123'); // Returned in creation
  });

  it('Test 4: Should retrieve public card', async () => {
    const response = await api.get('/creator-cards/full-test-card');

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.data.status, 'success');

    const card = response.data.data;
    assert.strictEqual(card.slug, 'full-test-card');
    assert(!card.access_code); // Never returned in retrieval
    assert(card.id);
    assert(!card._id);
  });

  it('Test 5: Should retrieve private card with correct access code', async () => {
    const response = await api.get('/creator-cards/private-test-card?access_code=ABC123');

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.data.status, 'success');

    const card = response.data.data;
    assert.strictEqual(card.access_type, 'private');
    assert(!card.access_code); // Never returned in retrieval
  });

  it('Test 6: Should delete card successfully', async () => {
    const payload = {
      creator_reference: 'crt_auto123456789012',
    };

    const response = await api.delete('/creator-cards/auto-slug-generation-test', {
      data: payload,
    });

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.data.status, 'success');

    const card = response.data.data;
    assert.strictEqual(card.slug, 'auto-slug-generation-test');
    assert(card.deleted); // Should have deletion timestamp
    assert(card.access_code !== undefined); // access_code included in delete response
  });
});

module.exports = {
  runValidTests: async () => {
    console.log('Running valid test cases...');
    // Implementation would run all tests programmatically
  },
};
