const ALLOWED_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789-_';

function isAllowedSlugChar(ch) {
  return ALLOWED_CHARS.includes(ch);
}

function randomAlphanumeric(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateSlug(title) {
  const lowered = title.toLowerCase();
  let candidate = '';

  for (let i = 0; i < lowered.length; i += 1) {
    const ch = lowered[i];
    if (ch === ' ' || ch === '\t' || ch === '\n') {
      candidate += '-';
    } else if (isAllowedSlugChar(ch)) {
      candidate += ch;
    }
    // anything else is dropped silently
  }

  return candidate;
}

async function resolveSlug({ title, providedSlug, repository }) {
  let finalSlug = providedSlug;

  if (!finalSlug) {
    // Auto-generate slug
    finalSlug = generateSlug(title);

    // Check if generated slug is valid length and available
    const isSlugAvailable = async (slugCandidate) => {
      if (slugCandidate.length < 5) return false;
      const existing = await repository.findOne({ query: { slug: slugCandidate } });
      return !existing;
    };

    if (!(await isSlugAvailable(finalSlug))) {
      // Generate multiple candidates and test them
      const candidates = [];
      for (let i = 0; i < 10; i += 1) {
        candidates.push(`${finalSlug}-${randomAlphanumeric(6)}`);
      }

      // Test all candidates
      const results = await Promise.all(candidates.map((candidate) => isSlugAvailable(candidate)));

      // Find the first available candidate
      const availableIndex = results.findIndex(Boolean);
      if (availableIndex !== -1) {
        finalSlug = candidates[availableIndex];
      } else {
        // Fallback - use the last candidate even if not available
        finalSlug = candidates[candidates.length - 1];
      }
    }
  }

  return finalSlug;
}

module.exports = { generateSlug, resolveSlug };
