const validator = require('@app-core/validator');
const { throwAppError } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const CreatorCard = require('@app/repository/creator-cards');
const { CreatorCardsMessages } = require('@app/messages');
const { serializeCard } = require('./utils-serialize');

const spec = `root {
  creator_reference string<length:20>
}`;

const parsedSpec = validator.parse(spec);

async function deleteCard(serviceData, options = {}) {
  validator.validate(serviceData, parsedSpec);
  let result;

  try {
    const { slug } = options.params || {};

    // Find card by slug - BEFORE deletion (snapshot per §6.3)
    const card = await CreatorCard.findOne({ query: { slug } });

    // Check if card exists
    if (!card) {
      throwAppError(CreatorCardsMessages.CARD_NOT_FOUND, 'NF01');
    }

    // Capture snapshot of the card BEFORE deletion
    // (repository deleteOne will mangle the slug field)
    const snapshot = { ...card };

    // Delete the card using repository method
    await CreatorCard.deleteOne({ query: { _id: card._id } });

    // Return response using the pre-delete snapshot with overrideDeleted
    result = serializeCard(snapshot, {
      includeAccessCode: true,
      overrideDeleted: Date.now(),
    });
  } catch (error) {
    appLogger.errorX(error, 'delete-card-error');
    throw error;
  }

  return result;
}

module.exports = deleteCard;
