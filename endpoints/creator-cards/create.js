const { createHandler } = require('@app-core/server');
const createCardService = require('@app/services/creator-cards/create-card');
const { CreatorCardsMessages } = require('@app/messages');

module.exports = createHandler({
  path: '/creator-cards',
  method: 'post',
  middlewares: [],

  async handler(rc, helpers) {
    const payload = rc.body;

    const response = await createCardService(payload);

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: CreatorCardsMessages.CARD_CREATED_SUCCESSFULLY,
      data: response,
    };
  },
});
