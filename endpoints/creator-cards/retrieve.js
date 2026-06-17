const { createHandler } = require('@app-core/server');
const retrieveCardService = require('@app/services/creator-cards/retrieve-card');
const { CreatorCardsMessages } = require('@app/messages');

module.exports = createHandler({
  path: '/creator-cards/:slug',
  method: 'get',
  middlewares: [],

  async handler(rc, helpers) {
    const payload = {
      slug: rc.params.slug,
      access_code: rc.query.access_code,
    };

    const response = await retrieveCardService(payload);

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: CreatorCardsMessages.CARD_RETRIEVED_SUCCESSFULLY,
      data: response,
    };
  },
});
