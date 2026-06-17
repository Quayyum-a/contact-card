# Creator Card API Test Suite

This directory contains comprehensive tests for the Creator Card API that verify all 16 test cases specified in the PRD requirements.

## Test Structure

### 📁 Files

- **`comprehensive-test-suite.js`** - Complete test suite with all 16 test cases
- **`valid-test-cases.js`** - Tests for valid scenarios (HTTP 200 responses)
- **`invalid-test-cases.js`** - Tests for invalid scenarios (HTTP 400/403/404 responses)
- **`README.md`** - This documentation file

### 🧪 Test Cases Coverage

#### Valid Cases (HTTP 200)
1. **Full creation** - Card with all fields populated
2. **Auto-slug generation** - Slug generated from title
3. **Private card creation** - Card with access_type=private and access_code
4. **Public card retrieval** - Retrieving a published public card
5. **Private card retrieval** - Retrieving private card with correct access_code
6. **Card deletion** - Successfully deleting a card

#### Invalid Cases (HTTP 400/403/404)
7. **Duplicate slug (SL02)** - Attempting to create card with existing slug
8. **Missing access_code (AC01)** - Private card without access_code
9. **Forbidden access_code (AC05)** - Public card with access_code
10. **Framework validation** - Invalid enum values, field lengths, etc.
11. **Non-existent card (NF01)** - Retrieving card that doesn't exist
12. **Draft card (NF02)** - Retrieving card with status=draft
13. **Private no code (AC03)** - Accessing private card without access_code
14. **Private wrong code (AC04)** - Accessing private card with wrong access_code
15. **Delete non-existent (NF01)** - Deleting card that doesn't exist
16. **Retrieve deleted (NF01)** - Retrieving card after deletion

## Running Tests

### Prerequisites
1. Ensure MongoDB is accessible (update IP whitelist if using Atlas)
2. Start the API server: `node bootstrap.js`
3. Verify server is running on http://localhost:3000

### Execute Tests

```bash
# Run comprehensive test suite
node tests/comprehensive-test-suite.js

# Or with custom API URL
API_BASE_URL=https://your-deployed-api.com node tests/comprehensive-test-suite.js

# Run with npm (if test script is configured)
npm test
```

### Expected Output

```
🚀 Starting Creator Card API Comprehensive Test Suite
====================================================

🧪 Test 1: Full creation with all fields
✅ PASSED: Test 1: Full creation with all fields

🧪 Test 2: Auto-slug generation  
✅ PASSED: Test 2: Auto-slug generation

... (all 16 tests)

📊 TEST SUMMARY
================
✅ Passed: 16
❌ Failed: 0  
📈 Success Rate: 100.0%

🎯 FINAL RESULT
===============
✅ ALL TESTS PASSED - API is fully compliant with PRD requirements
```

## Test Validation

Each test verifies:

### ✅ Response Structure
- Correct HTTP status codes (200, 400, 403, 404)
- Proper JSON response format with `status`, `message`, and `data` fields
- Custom error codes (SL02, AC01, AC05, NF01, NF02, AC03, AC04)

### ✅ Data Validation  
- Field mapping: `_id` → `id` (never expose MongoDB `_id`)
- `access_code` inclusion rules:
  - Included in creation responses (when applicable)
  - Never included in retrieval responses
- Proper null/default value handling
- Timestamp management (created, updated, deleted)

### ✅ Business Logic
- Slug uniqueness enforcement
- Slug auto-generation algorithm
- Access control flow (4-tier check system)
- Soft delete behavior (paranoid mode)
- URL format validation (http:// or https://)
- Integer amount validation (no decimals)

### ✅ Edge Cases
- Framework validation errors (invalid enums, lengths)
- Conditional field validation (access_code rules)
- Draft status behavior
- Deleted card inaccessibility

## Troubleshooting

### Common Issues

**MongoDB Connection Failed**
```
❌ MongoDB connection failed: Could not connect to any servers
```
- Update MongoDB Atlas IP whitelist
- Verify MONGODB_URI in .env file
- Check network connectivity

**Server Not Running**
```
❌ API health check failed: connect ECONNREFUSED
```
- Start server: `node bootstrap.js`
- Verify PORT environment variable
- Check for port conflicts

**Test Failures**
- Check server logs for error details
- Verify database state (may need cleanup)
- Ensure test data doesn't conflict with existing data

### Manual Testing

You can also test individual endpoints manually:

```bash
# Create a card
curl -X POST http://localhost:3000/creator-cards \
  -H "Content-Type: application/json" \
  -d '{"title":"Manual Test","creator_reference":"crt_1234567890123456","status":"published"}'

# Retrieve a card  
curl http://localhost:3000/creator-cards/manual-test

# Delete a card
curl -X DELETE http://localhost:3000/creator-cards/manual-test \
  -H "Content-Type: application/json" \
  -d '{"creator_reference":"crt_1234567890123456"}'
```

## Test Data Management

The test suite creates temporary test data during execution. In a production environment:

1. **Use Test Database** - Configure separate test database
2. **Cleanup Strategy** - Implement test data cleanup
3. **Isolation** - Ensure tests don't interfere with each other
4. **Seeding** - Use consistent test data seeding

## Integration with CI/CD

To integrate with continuous integration:

```yaml
# Example GitHub Actions step
- name: Run API Tests
  run: |
    npm install
    node bootstrap.js &
    sleep 5
    node tests/comprehensive-test-suite.js
  env:
    MONGODB_URI: ${{ secrets.TEST_MONGODB_URI }}
    PORT: 3000
```

## Contributing

When adding new tests:

1. Follow existing test structure and naming
2. Include both positive and negative test cases
3. Verify error codes and HTTP status codes
4. Add documentation for new test scenarios
5. Update this README if adding new test categories