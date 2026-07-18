const SOURCE_LOCALE = 'en-US';

// Public website copy and CampaignCue have separate product/release contracts.
// Every other top-level namespace in the MenuList locale source belongs to the
// authenticated owner application boundary.
const OWNER_LOCALE_EXCLUDED_NAMESPACES = new Set([
  'CampaignCue',
  'Website',
]);

const ENGLISH_OWNER_LOCALES = new Set([
  'en-GB',
  'en-US',
]);

function getOwnerLocaleNamespaces(sourceMessages) {
  return Object.keys(sourceMessages)
    .filter((namespace) => !OWNER_LOCALE_EXCLUDED_NAMESPACES.has(namespace));
}

module.exports = {
  ENGLISH_OWNER_LOCALES,
  OWNER_LOCALE_EXCLUDED_NAMESPACES,
  SOURCE_LOCALE,
  getOwnerLocaleNamespaces,
};
