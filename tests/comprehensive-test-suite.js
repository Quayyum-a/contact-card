/**
 * COMPREHENSIVE TEST SUITE - Creator Card API
 *
 * Tests all 16 test cases from PRD requirements
 * Run with: npm test or node tests/comprehensive-test-suite.js
 */

const assert = require('assert');
const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_TIMEOUT = 10000;

// Configure axios
const api = axios.create({
  baseURL: BASE_URL,
  timeout: API_TIMEOUT,
  validateStatus: () => true, // Don't throw on non-2xx status codes
});

class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.results = [];
  }

  async test(name, testFn) {
    try {
      console.log(`\n🧪 ${name}`);
      await testFn();
      console.log(`✅ PASSED: ${name}`);
      this.passed++;
      this.results.push({ name, status: 'PASSED' });
    } catch (error) {
      console.log(`❌ FAILED: ${name}`);
      console.log(`   Error: ${error.message}`);
      this.failed++;
      this.results.push({ name, status: 'FAILED', error: error.message });
    }
  }

  summary() {
    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(
      `📈 Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`
    );

    if (this.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results
        .filter((r) => r.status === 'FAILED')
        .forEach((r) => {
          console.log(`   - ${r.name}: ${r.error}`);
        });
    }
  }
}

const runner = new TestRunner();

// Helper functions
function assertStatus(response, expectedStatus, testName) {
  assert.strictEqual(
    response.status,
    expectedStatus,
    `Expected status ${expectedStatus} but got ${response.status} for ${testName}`
  );
}

function assertErrorCode(response, expectedCode, testName) {
  assert.strictEqual(
    response.data.code,
    expectedCode,
    `Expected error code ${expectedCode} but got ${response.data.code} for ${testName}`
  );
}

function assertSuccessResponse(response, testName) {
  assertStatus(response, 200, testName);
  assert.strictEqual(response.data.status, 'success', `Expected success status for ${testName}`);
  assert(response.data.data, `Expected data field for ${testName}`);
  assert(response.data.data.id, `Expected id field for ${testName}`);
  assert(!response.data.data._id, `Should not have _id field for ${testName}`);
}

// Test data storage
const testData = {
  createdCards: [],
};

async function runAllTests() {
  console.log('🚀 Starting Creator Card API Comprehensive Test Suite');
  console.log('====================================================');

  // VALID TEST CASES (Should return HTTP 200)

  await runner.test('Test 1: Full creation with all fields', async () => {
    const payload = {
      title: 'George Cooks',
      description: 'George Cooks is a weekly cooking podcast by Chef George AmadiObi',
      slug: 'george-cooks',
      creator_reference: 'crt_8f2k1m9x4p7w3q5z',
      links: [
        { title: 'YouTube Channel', url: 'https://youtube.com/@georgecooks' },
        { title: 'Instagram', url: 'https://instagram.com/georgecooks' },
      ],
      service_rates: {
        currency: 'NGN',
        rates: [
          { name: 'IG Story Post', description: 'One Instagram story mention', amount: 5000000 },
          {
            name: 'Recipe Feature',
            description: 'Featured recipe segment on the podcast',
            amount: 15000000,
          },
        ],
      },
      status: 'published',
      access_type: 'public',
    };

    const response = await api.post('/creator-cards', payload);
    assertSuccessResponse(response, 'Test 1');

    // Verify response structure
    const card = response.data.data;
    assert.strictEqual(card.title, payload.title);
    assert.strictEqual(card.slug, payload.slug);
    assert.strictEqual(card.access_type, 'public');
    assert.strictEqual(card.access_code, null);
    assert(card.created);
    assert(card.updated);
    assert.strictEqual(card.deleted, null);

    testData.createdCards.push(card);
  });

  await runner.test('Test 2: Auto-slug generation', async () => {
    const payload = {
      title: 'Ada Designs Things',
      creator_reference: 'crt_a1b2c3d4e5f6g7h8',
      status: 'published',
    };

    const response = await api.post('/creator-cards', payload);
    assertSuccessResponse(response, 'Test 2');

    const card = response.data.data;
    assert.strictEqual(card.slug, 'ada-designs-things');
    assert.strictEqual(card.access_type, 'public'); // Default

    testData.createdCards.push(card);
  });

  await runner.test('Test 3: Private card creation', async () => {
    const payload = {
      title: 'VIP Rate Card',
      creator_reference: 'crt_x9y8z7w6v5u4t3s2',
      status: 'published',
      access_type: 'private',
      access_code: 'A1B2C3',
    };

    const response = await api.post('/creator-cards', payload);
    assertSuccessResponse(response, 'Test 3');

    const card = response.data.data;
    assert.strictEqual(card.access_type, 'private');
    assert.strictEqual(card.access_code, 'A1B2C3'); // Included in creation response

    testData.createdCards.push(card);
  });

  await runner.test('Test 4: Retrieving a public published card', async () => {
    const slug = 'george-cooks';
    const response = await api.get(`/creator-cards/${slug}`);

    assertSuccessResponse(response, 'Test 4');

    const card = response.data.data;
    assert.strictEqual(card.slug, slug);
    assert(!card.access_code, 'access_code should not be in retrieval response');
  });

  await runner.test('Test 5: Retrieving a private card with correct pin', async () => {
    // First create a private card with known access code
    const createPayload = {
      title: 'Private Test Card',
      creator_reference: 'crt_private123456789',
      status: 'published',
      access_type: 'private',
      access_code: 'ABC123',
    };

    const createResponse = await api.post('/creator-cards', createPayload);
    assertSuccessResponse(createResponse, 'Test 5 Setup');

    const { slug } = createResponse.data.data;

    // Now retrieve with correct access code
    const response = await api.get(`/creator-cards/${slug}?access_code=ABC123`);

    assertSuccessResponse(response, 'Test 5');

    const card = response.data.data;
    assert.strictEqual(card.slug, slug);
    assert(!card.access_code, 'access_code should not be in retrieval response');
  });

  await runner.test('Test 6: Deleting a card', async () => {
    const slug = 'ada-designs-things';
    const payload = {
      creator_reference: 'crt_a1b2c3d4e5f6g7h8',
    };

    const response = await api.delete(`/creator-cards/${slug}`, { data: payload });
    assertSuccessResponse(response, 'Test 6');

    const card = response.data.data;
    assert.strictEqual(card.slug, slug);
    assert(card.deleted, 'Deleted timestamp should be set');
  });

  // INVALID TEST CASES (Should return 400/403/404 with error codes)

  await runner.test('Test 7: Duplicate slug (SL02)', async () => {
    const payload = {
      title: 'Another George',
      slug: 'george-cooks', // Already exists from Test 1
      creator_reference: 'crt_m1n2b3v4c5x6z7l8',
      status: 'published',
    };

    const response = await api.post('/creator-cards', payload);
    assertStatus(response, 400, 'Test 7');
    assertErrorCode(response, 'SL02', 'Test 7');
  });

  await runner.test('Test 8: Missing access_code on private card (AC01)', async () => {
    const payload = {
      title: 'Secret Card',
      creator_reference: 'crt_q1w2e3r4t5y6u7i8',
      status: 'published',
      access_type: 'private',
      // Missing access_code
    };

    const response = await api.post('/creator-cards', payload);
    assertStatus(response, 400, 'Test 8');
    assertErrorCode(response, 'AC01', 'Test 8');
  });

  await runner.test('Test 9: access_code on public card (AC05)', async () => {
    const payload = {
      title: 'Public Card with Code',
      creator_reference: 'crt_q1w2e3r4t5y6u7i8',
      status: 'published',
      access_type: 'public',
      access_code: 'A1B2C3', // Should not be allowed
    };

    const response = await api.post('/creator-cards', payload);
    assertStatus(response, 400, 'Test 9');
    assertErrorCode(response, 'AC05', 'Test 9');
  });

  await runner.test('Test 10: Framework validation failure (400)', async () => {
    const payload = {
      title: 'Bad Status Card',
      creator_reference: 'crt_q1w2e3r4t5y6u7i8',
      status: 'archived', // Invalid status
    };

    const response = await api.post('/creator-cards', payload);
    assertStatus(response, 400, 'Test 10');
    // This should be a framework validation error, not a custom code
  });

  await runner.test('Test 11: Retrieving non-existent card (NF01)', async () => {
    const response = await api.get('/creator-cards/does-not-exist-123');
    assertStatus(response, 404, 'Test 11');
    assertErrorCode(response, 'NF01', 'Test 11');
  });

  await runner.test('Test 12: Retrieving draft card (NF02)', async () => {
    // First create a draft card
    const createPayload = {
      title: 'Draft Card',
      creator_reference: 'crt_draft1234567890',
      status: 'draft',
    };

    const createResponse = await api.post('/creator-cards', createPayload);
    assertSuccessResponse(createResponse, 'Test 12 Setup');

    const { slug } = createResponse.data.data;

    // Try to retrieve the draft card
    const response = await api.get(`/creator-cards/${slug}`);
    assertStatus(response, 404, 'Test 12');
    assertErrorCode(response, 'NF02', 'Test 12');
  });

  await runner.test('Test 13: Retrieving private card without pin (AC03)', async () => {
    // Use the private card from Test 5
    const response = await api.get('/creator-cards/private-test-card');
    assertStatus(response, 403, 'Test 13');
    assertErrorCode(response, 'AC03', 'Test 13');
  });

  await runner.test('Test 14: Retrieving private card with wrong pin (AC04)', async () => {
    // Use the private card from Test 5 with wrong access code
    const response = await api.get('/creator-cards/private-test-card?access_code=WRONG1');
    assertStatus(response, 403, 'Test 14');
    assertErrorCode(response, 'AC04', 'Test 14');
  });

  await runner.test('Test 15: Deleting non-existent card (NF01)', async () => {
    const payload = {
      creator_reference: 'crt_q1w2e3r4t5y6u7i8',
    };

    const response = await api.delete('/creator-cards/does-not-exist-123', { data: payload });
    assertStatus(response, 404, 'Test 15');
    assertErrorCode(response, 'NF01', 'Test 15');
  });

  await runner.test('Test 16: Retrieving deleted card (NF01)', async () => {
    // Try to retrieve the card deleted in Test 6
    const response = await api.get('/creator-cards/ada-designs-things');
    assertStatus(response, 404, 'Test 16');
    assertErrorCode(response, 'NF01', 'Test 16');
  });

  // Print summary
  runner.summary();

  return runner.passed === 16;
}

// Health check before running tests
async function healthCheck() {
  try {
    console.log('🔍 Checking API health...');
    const response = await api.get('/');
    if (response.status === 200 || response.status === 404) {
      console.log('✅ API server is responsive');
      return true;
    }
    throw new Error(`Unexpected status: ${response.status}`);
  } catch (error) {
    console.log(`❌ API health check failed: ${error.message}`);
    console.log('Please ensure the server is running with: node bootstrap.js');
    return false;
  }
}

// Main execution
async function main() {
  if (!(await healthCheck())) {
    process.exit(1);
  }

  const allPassed = await runAllTests();

  console.log('\n🎯 FINAL RESULT');
  console.log('===============');
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED - API is fully compliant with PRD requirements');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed - check implementation against PRD requirements');
    process.exit(1);
  }
}

// Export for use as module
module.exports = { runAllTests, TestRunner };

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  });
}
