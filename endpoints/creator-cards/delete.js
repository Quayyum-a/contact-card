const { createHandler } = require('@app-core/server');
const deleteCardService = require('@app/services/creator-cards/delete-card');
const { CreatorCardsMessages } = require('@app/messages');

module.exports = createHandler({
  path: '/creator-cards/:slug',
  method: 'delete',
  middlewares: [],

  async handler(rc, helpers) {
    const payload = rc.body;

    const response = await deleteCardService(payload, {
      params: rc.params,
    });

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: CreatorCardsMessages.CARD_DELETED_SUCCESSFULLY,
      data: response,
    };
  },
});
