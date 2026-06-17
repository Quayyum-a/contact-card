require('dotenv').config();

// Only import AWS SDK when actually needed
let SecretsManagerClient;
let GetSecretValueCommand;

// Reads a single Secrets Manager secret (JSON or string) and injects into process.env
async function loadSecretsToEnv({
  secretId,
  prefix = '',
  optional = false,
  region = 'eu-central-1',
} = {}) {
  // Lazy load AWS SDK only when needed
  if (!SecretsManagerClient) {
    // eslint-disable-next-line global-require
    const aws = require('@aws-sdk/client-secrets-manager');
    SecretsManagerClient = aws.SecretsManagerClient;
    GetSecretValueCommand = aws.GetSecretValueCommand;
  }

  const client = new SecretsManagerClient({ region });

  try {
    const { SecretString, SecretBinary } = await client.send(
      new GetSecretValueCommand({ SecretId: secretId })
    );

    let payload;
    if (SecretString) {
      // If JSON, merge each key; if plain string, set under SECRET
      try {
        const obj = JSON.parse(SecretString);
        payload = obj && typeof obj === 'object' ? obj : { SECRET: SecretString };
      } catch {
        payload = { SECRET: SecretString };
      }
    } else if (SecretBinary) {
      payload = { SECRET_BINARY: Buffer.from(SecretBinary, 'base64').toString('ascii') };
    } else {
      payload = {};
    }

    Object.entries(payload).forEach(([k, v]) => {
      const key = prefix ? `${prefix}${k}` : k;
      if (process.env[key] == null) process.env[key] = String(v);
    });
  } catch (err) {
    if (!optional) {
      console.error('Failed to load secrets:', err);
      process.exit(1);
    } else {
      console.warn('Secrets optional; continuing. Error:', err.message);
    }
  }
}

(async () => {
  // Only use AWS Secrets Manager if explicitly enabled
  // On Render, we disable it by default since we use environment variables
  const isRender = process.env.RENDER === 'true';
  const useSecretsManager =
    !isRender &&
    (process.env.USE_SECRETS_MANAGER === 'true' || process.env.USE_SECRETS_MANAGER === '1');

  if (useSecretsManager) {
    console.log('🔐 Loading secrets from AWS Secrets Manager...');
    await loadSecretsToEnv({
      prefix: '',
      optional: process.env.NODE_ENV !== 'production',
      region: process.env.AWS_REGION || 'eu-central-1',
      secretId: process.env.SECRETS_MANAGER_ID || 'myapp/staging',
    });
    process.env.__ALREADY_BOOTSTRAPPED_ENVS = true;
    console.log('✅ Secrets loaded successfully');
  } else {
    if (isRender) {
      console.log('🌐 Running on Render - using environment variables');
    } else {
      console.log('📝 Using environment variables (AWS Secrets Manager disabled)');
    }
    process.env.__ALREADY_BOOTSTRAPPED_ENVS = true;
  }

  // Start the application
  console.log('🚀 Starting Creator Card API...');
  // eslint-disable-next-line global-require
  require('./app');
})();
