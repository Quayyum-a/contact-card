function serializeCard(doc, options = {}) {
  const { includeAccessCode = false, overrideDeleted = null } = options;

  if (!doc) return null;

  let deletedValue = null;
  if (overrideDeleted !== null) {
    deletedValue = overrideDeleted;
  } else if (doc.deleted) {
    deletedValue = doc.deleted;
  }

  const serialized = {
    id: doc._id,
    title: doc.title,
    description: doc.description || null,
    slug: doc.slug,
    creator_reference: doc.creator_reference,
    links: doc.links || [],
    service_rates: doc.service_rates || null,
    status: doc.status,
    access_type: doc.access_type || 'public',
    created: doc.created,
    updated: doc.updated,
    deleted: deletedValue,
  };

  if (includeAccessCode && doc.access_code) {
    serialized.access_code = doc.access_code;
  }

  return serialized;
}

module.exports = { serializeCard };
