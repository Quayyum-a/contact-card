const validator = require('@app-core/validator');
const { throwAppError } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const CreatorCard = require('@app/repository/creator-cards');
const { CreatorCardsMessages } = require('@app/messages');
const { resolveSlug } = require('./utils-slug');
const { serializeCard } = require('./utils-serialize');

const spec = `root {
  title string<trim|lengthBetween:3,100>
  description? string<trim|maxLength:500>
  slug? string<trim|lengthBetween:5,50>
  creator_reference string<length:20>
  links[]? {
    title string<trim|lengthBetween:1,100>
    url string<trim|maxLength:200>
  }
  service_rates? {
    currency string(NGN|USD|GBP|GHS)
    rates[] {
      name string<trim|lengthBetween:3,100>
      description string<trim|maxLength:250>
      amount number<min:1>
    }
  }
  status string(draft|published)
  access_type? string(public|private)
  access_code? string<length:6>
}`;

const parsedSpec = validator.parse(spec);

const ALLOWED_SLUG_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789-_';

function isAllowedSlugChar(ch) {
  return ALLOWED_SLUG_CHARS.includes(ch);
}

async function createCard(serviceData) {
  const data = validator.validate(serviceData, parsedSpec);
  let result;

  try {
    // Validate URL format if links provided - must start with http:// or https://
    if (data.links && data.links.length > 0) {
      data.links.forEach((link) => {
        if (!link.url.startsWith('http://') && !link.url.startsWith('https://')) {
          throwAppError(CreatorCardsMessages.INVALID_URL_PREFIX, 'VALIDATIONERR');
        }
      });
    }

    // Validate access_code rules
    if (data.access_type === 'private' && !data.access_code) {
      throwAppError(CreatorCardsMessages.ACCESS_CODE_REQUIRED, 'AC01');
    }
    if ((data.access_type === 'public' || !data.access_type) && data.access_code) {
      throwAppError(CreatorCardsMessages.ACCESS_CODE_FORBIDDEN, 'AC05');
    }

    // Validate slug characters if provided (no regex)
    if (data.slug) {
      for (let i = 0; i < data.slug.length; i += 1) {
        if (!isAllowedSlugChar(data.slug[i])) {
          throwAppError(CreatorCardsMessages.INVALID_SLUG_CHARS, 'VALIDATIONERR');
        }
      }
    }

    // Validate amount is integer if service_rates provided
    if (data.service_rates && data.service_rates.rates) {
      data.service_rates.rates.forEach((rate) => {
        if (!Number.isInteger(rate.amount)) {
          throwAppError('Amount must be a whole number', 'VALIDATIONERR');
        }
      });
    }

    // Handle slug - generate or validate uniqueness
    let finalSlug;
    if (data.slug) {
      const existing = await CreatorCard.findOne({ query: { slug: data.slug } });
      if (existing) throwAppError(CreatorCardsMessages.SLUG_TAKEN, 'SL02');
      finalSlug = data.slug;
    } else {
      finalSlug = await resolveSlug({
        title: data.title,
        providedSlug: null,
        repository: CreatorCard,
      });
    }

    // Create the card
    const cardData = {
      title: data.title,
      description: data.description || null,
      slug: finalSlug,
      creator_reference: data.creator_reference,
      links: data.links || [],
      service_rates: data.service_rates || null,
      status: data.status,
      access_type: data.access_type || 'public',
      access_code: data.access_code || null,
    };

    const created = await CreatorCard.create(cardData);
    result = serializeCard(created, { includeAccessCode: true });
  } catch (error) {
    appLogger.errorX(error, 'create-card-error');
    throw error;
  }

  return result;
}

module.exports = createCard;
