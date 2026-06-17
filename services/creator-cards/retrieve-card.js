const validator = require('@app-core/validator');
const { throwAppError } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const CreatorCard = require('@app/repository/creator-cards');
const { CreatorCardsMessages } = require('@app/messages');
const { serializeCard } = require('./utils-serialize');

const spec = `root {
  slug string
  access_code? string
}`;

const parsedSpec = validator.parse(spec);

async function retrieveCard(serviceData) {
  const data = validator.validate(serviceData, parsedSpec);
  let result;

  try {
    // Order of checks matters per PRD §5:
    // 1. not-found (NF01)
    // 2. draft (NF02)
    // 3. private-no-code (AC03)
    // 4. private-wrong-code (AC04)
    // 5. success

    const card = await CreatorCard.findOne({ query: { slug: data.slug } });

    // 1. Card doesn't exist
    if (!card) {
      throwAppError(CreatorCardsMessages.CARD_NOT_FOUND, 'NF01');
    }

    // 2. Card is draft
    if (card.status === 'draft') {
      throwAppError(CreatorCardsMessages.CARD_IS_DRAFT, 'NF02');
    }

    // 3 & 4. Check access control for private cards
    if (card.access_type === 'private') {
      // 3. No access code provided
      if (!data.access_code) {
        throwAppError(CreatorCardsMessages.PRIVATE_NO_CODE, 'AC03');
      }
      // 4. Wrong access code
      if (data.access_code !== card.access_code) {
        throwAppError(CreatorCardsMessages.PRIVATE_WRONG_CODE, 'AC04');
      }
    }

    result = serializeCard(card, { includeAccessCode: false });
  } catch (error) {
    appLogger.errorX(error, 'retrieve-card-error');
    throw error;
  }

  return result;
}

module.exports = retrieveCard;
