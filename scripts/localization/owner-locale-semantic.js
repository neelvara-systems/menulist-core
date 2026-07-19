#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  parse,
  TYPE,
} = require('@formatjs/icu-messageformat-parser');
const {
  ENGLISH_OWNER_LOCALES,
  SOURCE_LOCALE,
  getOwnerLocaleNamespaces,
} = require('./owner-locale-boundary');

const ROOT = path.resolve(__dirname, '..', '..');
const LOCALE_DIR = path.join(ROOT, 'public', 'locales', 'menulist.ai');
const DEFAULT_EVIDENCE_PATH = path.join(
  ROOT,
  '__docs__',
  'global-localization',
  'owner-locale-semantic-coverage.json',
);
const PREPARE_PATH = readArgument('--prepare=');
const APPLY_PATH = readArgument('--apply=');
const QUALITY_PREPARE_PATH = readArgument('--quality-prepare=');
const QUALITY_APPLY_PATH = readArgument('--quality-apply=');
const EVIDENCE_PATH = path.resolve(readArgument('--evidence=') || DEFAULT_EVIDENCE_PATH);
const WRITE = process.argv.includes('--write');
const MAX_TRANSLATION_LENGTH_RATIO = 2.5;
const MIN_TRANSLATION_LENGTH_RATIO = 0.18;
const SENTENCE_BOUNDARY_PATTERN = /(?:[.!?。！？؟]+|…+)(?:\s+|$)/gu;
const LEAKED_PROVIDER_PLACEHOLDER_PATTERN = /(?:%\s*\d+\s*\$\s*[sS]|\$\s*%\s*\d+\s*\$?\s*[sS]?)/u;

const INDICTRANS_TARGETS = Object.freeze({
  'as-IN': 'asm_Beng',
  'bn-IN': 'ben_Beng',
  'brx-IN': 'brx_Deva',
  'doi-IN': 'doi_Deva',
  'gu-IN': 'guj_Gujr',
  'hi-IN': 'hin_Deva',
  'kn-IN': 'kan_Knda',
  'kok-IN': 'gom_Deva',
  'ks-IN': 'kas_Arab',
  'mai-IN': 'mai_Deva',
  'ml-IN': 'mal_Mlym',
  'mni-IN': 'mni_Mtei',
  'mr-IN': 'mar_Deva',
  'ne-NP': 'npi_Deva',
  'or-IN': 'ory_Orya',
  'pa-IN': 'pan_Guru',
  'sat-IN': 'sat_Olck',
  'sd-IN': 'snd_Arab',
  'ta-IN': 'tam_Taml',
  'te-IN': 'tel_Telu',
  'ur-IN': 'urd_Arab',
});

const MADLAD400_TARGETS = Object.freeze({
  'ar-SA': 'ar',
  'cs-CZ': 'cs',
  'da-DK': 'da',
  'de-DE': 'de',
  'el-GR': 'el',
  'es-ES': 'es',
  'fa-IR': 'fa',
  'fi-FI': 'fi',
  'fil-PH': 'fil',
  'fr-FR': 'fr',
  'he-IL': 'he',
  'hu-HU': 'hu',
  'id-ID': 'id',
  'it-IT': 'it',
  'ja-JP': 'ja',
  'ko-KR': 'ko',
  'ms-MY': 'ms',
  'nl-NL': 'nl',
  'pl-PL': 'pl',
  'pt-BR': 'pt',
  'ro-RO': 'ro',
  'sv-SE': 'sv',
  'sw-KE': 'sw',
  'th-TH': 'th',
  'tr-TR': 'tr',
  'uk-UA': 'uk',
  'vi-VN': 'vi',
  'zh-CN': 'zh',
  'zh-TW': 'zh',
});

const PROTECTED_PATTERN = new RegExp(
  [
    String.raw`https?:\/\/[^\s<>{}"']+`,
    String.raw`[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}`,
    String.raw`\bMenuList\.ai\b`,
    String.raw`\bMenuList\b`,
    String.raw`\bWhatsApp\b`,
    String.raw`\bRazorpay\b`,
    String.raw`\bFirebase\b`,
    String.raw`\bCloudflare\b`,
    String.raw`\bVercel\b`,
    String.raw`\bInstagram\b`,
    String.raw`\bFacebook Pixel ID\b`,
    String.raw`\bFacebook\b`,
    String.raw`\bLinkedIn\b`,
    String.raw`\bGoogle Search Console\b`,
    String.raw`\bGoogle\b`,
    String.raw`\bApple Business Connect\b`,
    String.raw`\bApple\b`,
    String.raw`\biOS\b`,
    String.raw`\biPhone\b`,
    String.raw`\biPad\b`,
    String.raw`\bCanonical URL\b`,
    String.raw`\b(?:GA4|API|CNAME|CSV|DNS|FAQ|ID|N\/A|PDF|PNG|POS|PWA|QR|SEO|SSL|TXT|UPI|URL|X|XLSX|ZIP|AI)\b`,
    String.raw`\b(?:[A-Za-z0-9-]+\.)+(?:ai|app|co|com|digital|in|io|net|org)\b`,
  ].join('|'),
  'g',
);
const PLACEHOLDER_PATTERN = /(?:\{\d+\}|%\d+\$s)/g;
const QUALITY_MANUAL_OVERRIDES = Object.freeze({
  'de-DE:BusinessSettings.contactPersonEmail': 'E-Mail-Adresse der Kontaktperson',
  'id-ID:MobileShare.directOfferingLink': 'Tautan langsung {offering}',
  'th-TH:Analytics.googleSearchConsole': 'Google Search Console',
  'th-TH:MobileSeoAnalytics.searchConsole': 'Google Search Console',
  'pl-PL:PosSync.enablePosSync': 'Włącz synchronizację zewnętrzną',
  'ro-RO:BusinessSettings.quickActionButtons': 'Butoane de acțiune rapidă',
  'ro-RO:BusinessSettings.showFeedbackButton': 'Afișează butonul de feedback',
  'ro-RO:Transactions.actions.menu_card_export_design_advisor': 'Ghid pentru exportul cardului de meniu',
  'ro-RO:MobileDesignEditor.previewOfficialPage': 'Previzualizează pagina oficială',
  'el-GR:BusinessSettings.validEmailRequired': 'Εισαγάγετε έγκυρο email',
  'el-GR:FeedbackSettings.googleReviewHowToTitle': 'Λήψη συνδέσμου κριτικής Google',
  'el-GR:MobileSettings.customDomainSubtitle': 'Συνδέστε και επαληθεύστε έναν προσαρμοσμένο τομέα, ώστε οι πελάτες να μπορούν να ανοίγουν το μενού σας στη δική σας διεύθυνση ιστού.',
  'el-GR:MobileShare.outletQrSectionHelper': 'Οι κωδικοί QR καταστήματος είναι έτοιμοι για κάθε ενεργό υποκατάστημα.',
  'sv-SE:Navigation.Business Health Monitor': 'Övervakning av verksamhetens hälsa',
  'da-DK:MobileShare.yourOfferingPage': 'Din {offering}-side',
  'fi-FI:FeedbackSettings.enableFeedback': 'Ota asiakaspalaute käyttöön',
  'fil-PH:BusinessSettings.addCustomBusinessAttribute': 'Magdagdag ng custom na katangian',
  'fil-PH:Billing.cancellationReasons.missing_functionality': 'Kulang ang kakayahang kailangan ko',
  'fil-PH:MobileUsers.staffCreated': 'Nalikha ang miyembro ng staff',
  'fr-FR:BusinessSettings.publicCustomer.menu.messageBusiness': 'Envoyer un message à {businessName}',
  'fr-FR:BusinessSettings.publicCustomer.menu.expressMinutes': 'Service express en {minutes} min',
  'fr-FR:BusinessSettings.publicCustomer.menu.expressMinutesSession': 'Séance express de {minutes} min',
  'fr-FR:BusinessSettings.publicCustomer.menu.manySections': '{count} sections',
  'de-DE:BusinessSettings.publicCustomer.menu.protein': 'Eiweiß {value} g',
  'id-ID:BusinessSettings.publicCustomer.menu.metadataMenuTitle': 'Menu {businessName}',
  'id-ID:BusinessSettings.publicCustomer.menu.protein': 'Protein: {value} g',
  'vi-VN:BusinessSettings.publicCustomer.menu.metadataMenuTitle': 'Thực đơn {businessName}',
  'vi-VN:BusinessSettings.publicCustomer.menu.protein': 'Chất đạm {value} g',
  'tr-TR:BusinessSettings.publicCustomer.menu.businessInformation': 'İşletme bilgileri',
  'tr-TR:BusinessSettings.publicCustomer.menu.protein': 'Protein miktarı: {value} g',
  'ms-MY:BusinessSettings.publicCustomer.menu.metadataMenuTitle': 'Menu {businessName}',
  'ms-MY:BusinessSettings.publicCustomer.menu.protein': 'Protein: {value} g',
  'cs-CZ:BusinessSettings.publicCustomer.menu.protein': 'Bílkoviny {value} g',
  'cs-CZ:BusinessSettings.publicCustomer.menu.expressMinutes': 'Expresně za {minutes} min',
  'sv-SE:BusinessSettings.publicCustomer.menu.updatedMinuteAgo': 'uppdaterad för 1 minut sedan',
  'sv-SE:BusinessSettings.publicCustomer.menu.protein': 'Proteininnehåll {value} g',
  'sv-SE:BusinessSettings.publicCustomer.menu.expressMinutesSession': 'Expressession på {minutes} min',
  'da-DK:BusinessSettings.publicCustomer.menu.protein': 'Proteinindhold {value} g',
  'fi-FI:BusinessSettings.publicCustomer.menu.expressMinutes': 'Pikapalvelu {minutes} min',
  'sw-KE:BusinessSettings.publicCustomer.feedback.addOptionalNote': 'Ongeza ujumbe ukitaka',
  'ar-SA:BusinessSettings.publicCustomer.menu.spice': 'درجة التوابل: {value}',
  'mr-IN:BusinessSettings.publicCustomer.feedback.taglineAndNote': '{tagline} तुमची नोंद थेट {team} कडे जाते.',
  'id-ID:BusinessSettings.publicCustomer.menu.expressMinutesSession': 'Sesi ekspres {minutes} menit',
  'el-GR:BusinessSettings.publicCustomer.menu.redirectingIn': 'Ανακατεύθυνση σε {count} δευτ.…',
  'el-GR:BusinessSettings.publicCustomer.menu.metadataMenuDescription': 'Δείτε το ψηφιακό μενού του {businessName}.',
  'el-GR:BusinessSettings.publicCustomer.menu.termsConditionsDescription': 'Όροι και προϋποθέσεις για το {businessName}.',
  'el-GR:BusinessSettings.publicCustomer.menu.refundCancellationPolicyDescription': 'Πολιτική επιστροφών χρημάτων και ακυρώσεων για το {businessName}.',
  'el-GR:BusinessSettings.publicCustomer.feedback.noteToTeam': 'Η σημείωσή σας πηγαίνει απευθείας στην ομάδα {team}.',
  'fil-PH:BusinessSettings.publicCustomer.menu.businessHome': 'Pangunahing pahina ng {businessName}',
  'he-IL:BusinessSettings.publicCustomer.menu.termsConditionsDescription': 'תנאים והגבלות עבור {businessName}.',
  'brx-IN:BusinessSettings.publicCustomer.menu.nonVeg': 'नन-भेजिटेरियान',
  'brx-IN:BusinessSettings.publicCustomer.menu.followSafariSteps': 'Safari आव बे 3 आगानफोरखौ फालिनः',
  'brx-IN:BusinessSettings.publicCustomer.menu.safariShareStep': 'Safari नि गाहायाव थानाय शेयर बटनखौ टेप खालाम।',
  'ks-IN:BusinessSettings.publicCustomer.menu.itemInCategoryAt': '{categoryName} منز {itemName}، {businessName} پؠٹھ دستیاب۔',
  'ks-IN:BusinessSettings.publicCustomer.menu.followSafariSteps': 'Safari منز کٔرو یم ترٛیٚن مرحلہٕ اختیار:',
  'ks-IN:BusinessSettings.publicCustomer.menu.safariShareStep': 'Safari کس بۄنس حصس منٛز چھو شیئر بٹن پؠٹھ ٹیپ کٔرو۔',
  'mni-IN:BusinessSettings.publicCustomer.common.team': 'ꯇꯤꯝ',
  'mni-IN:BusinessSettings.publicCustomer.menu.today': 'ꯉꯁꯤ',
  'hu-HU:BusinessSettings.publicCustomer.menu.mostBooked': 'Gyakran foglalják',
  'sw-KE:BusinessSettings.publicCustomer.menu.mostBooked': 'Huwekwa nafasi mara kwa mara',
  'sw-KE:BusinessSettings.publicCustomer.menu.expressMinutesSession': 'Kipindi cha haraka cha dakika {minutes}',
  'sw-KE:BusinessSettings.publicCustomer.menu.tempOpeningLate': 'Inafunguliwa baadaye kuliko kawaida leo',
  'sw-KE:BusinessSettings.publicCustomer.feedback.privateFeedback': 'Maoni ya faragha ambayo biashara pekee inaweza kuona',
  'sw-KE:BusinessSettings.publicCustomer.feedback.leaveGoogleReview': 'Andika maoni kwenye Google',
  'as-IN:BusinessSettings.publicCustomer.menu.searchProductsPlaceholder': 'সামগ্ৰী বিচাৰক...',
  'da-DK:BusinessSettings.publicCustomer.menu.reserve': 'Reservér',
  'da-DK:BusinessSettings.publicCustomer.menu.live': 'Live',
  'da-DK:BusinessSettings.publicCustomer.menu.spiceMedium': 'Mellemstærk',
  'da-DK:BusinessSettings.publicCustomer.menu.expressMinutes': 'Ekspres {minutes} min',
  'de-DE:BusinessSettings.publicCustomer.menu.spiceMild': 'Mild',
  'el-GR:BusinessSettings.publicCustomer.menu.bestSeller': 'Κορυφαίο σε πωλήσεις',
  'el-GR:BusinessSettings.publicCustomer.menu.expressMinutes': 'Express {minutes} λεπτά',
  'fi-FI:BusinessSettings.publicCustomer.common.business': 'Yritys',
  'fil-PH:BusinessSettings.publicCustomer.menu.reserve': 'Magpareserba',
  'fil-PH:BusinessSettings.publicCustomer.menu.refund': 'Pagsasauli ng bayad',
  'fil-PH:BusinessSettings.publicCustomer.menu.soldOut': 'Ubos na',
  'fil-PH:BusinessSettings.publicCustomer.menu.outOfStock': 'Wala nang stock',
  'fil-PH:BusinessSettings.publicCustomer.menu.carbs': 'Carbohydrate {value}g',
  'fil-PH:BusinessSettings.publicCustomer.menu.warranty': 'Garantiya: {value}',
  'fil-PH:BusinessSettings.publicCustomer.feedback.starRating': '{count}-star na rating',
  'id-ID:BusinessSettings.publicCustomer.menu.nonVeg': 'Bukan vegetarian',
  'it-IT:BusinessSettings.publicCustomer.menu.calories': '{count} cal',
  'ja-JP:BusinessSettings.publicCustomer.menu.serving': '1食分: {value}',
  'mni-IN:BusinessSettings.publicCustomer.menu.hoursShort': '{count} ꯄꯨꯡ',
  'ms-MY:BusinessSettings.publicCustomer.menu.bestSeller': 'Paling laris',
  'sv-SE:BusinessSettings.publicCustomer.common.business': 'Företag',
  'sv-SE:BusinessSettings.publicCustomer.common.feedback': 'Feedback',
  'sv-SE:BusinessSettings.publicCustomer.menu.policy': 'Policy',
  'sv-SE:BusinessSettings.publicCustomer.menu.live': 'Live',
  'sv-SE:BusinessSettings.publicCustomer.feedback.pageTitle': 'Feedback',
  'sw-KE:BusinessSettings.publicCustomer.menu.calories': 'Kalori {count}',
  'sw-KE:BusinessSettings.publicCustomer.menu.expressMinutes': 'Huduma ya haraka ya dakika {minutes}',
  'or-IN:BusinessSettings.publicCustomer.feedback.privateFeedbackHelp': 'କୌଣସି କାର୍ଯ୍ୟ ଆବଶ୍ୟକ ନାହିଁ। ଆପଣଙ୍କ ବାର୍ତ୍ତା କେବଳ ବ୍ୟବସାୟ ପାଖରେ ରହିବ।',
  'ks-IN:BusinessSettings.publicCustomer.common.poweredByMenuList': 'MenuList ذریعہٕ چلن والہٕ',
});
const QUALITY_MANUAL_SOURCE_OVERRIDES = Object.freeze({
  'es-ES::Saving...': 'Guardando...',
  'es-ES::SEO & Analytics': 'SEO y analítica',
  'fr-FR::Google Maps Link': 'Lien Google Maps',
  'fr-FR::Photo {index}': 'Photo {index}',
  'fr-FR::photo {index}': 'photo {index}',
  'fr-FR::Version {version}': 'Version {version}',
  'fr-FR::Saving...': 'Enregistrement...',
  'fr-FR::SEO & Analytics': 'SEO et analytique',
  'fr-FR::Instagram bio, Google listing, flyers': 'Bio Instagram, fiche Google, prospectus',
  'pt-BR::Use MenuList': 'Usar o MenuList',
  'pt-BR::POS / ordering / website': 'POS / pedidos / site',
  'pt-BR::Feedback QR': 'QR de feedback',
  'pt-BR::Saving...': 'Salvando...',
  'pt-BR::SEO & Analytics': 'SEO e análise',
  'pt-BR::Instagram bio, Google listing, flyers': 'Bio do Instagram, perfil do Google, panfletos',
  'de-DE::Version {version}': 'Version {version}',
  'de-DE::Feedback QR': 'Feedback-QR',
  'de-DE::via QR Code': 'per QR-Code',
  'de-DE::Saving...': 'Speichern...',
  'de-DE::SEO & Analytics': 'SEO & Analysen',
  'it-IT::Token Credits (Audit)': 'Crediti token (audit)',
  'it-IT::File {number}': 'File {number}',
  'it-IT::Feedback QR': 'QR per feedback',
  'it-IT::Saving...': 'Salvataggio...',
  'it-IT::SEO & Analytics': 'SEO e analisi',
  'id-ID::Google Maps Link': 'Tautan Google Maps',
  'id-ID::Uploading...': 'Mengunggah...',
  'id-ID::POS / ordering / website': 'POS / pemesanan / situs web',
  'id-ID::Token Credits (Audit)': 'Kredit token (audit)',
  'id-ID::Total tokens': 'Total token',
  'id-ID::Feedback QR': 'QR masukan',
  'id-ID::via QR Code': 'melalui kode QR',
  'id-ID::Saving...': 'Menyimpan...',
  'id-ID::AI tools': 'Alat AI',
  'id-ID::Menu PDF': 'PDF menu',
  'vi-VN::POS / ordering / website': 'POS / đặt món / trang web',
  'ms-MY::POS / ordering / website': 'POS / pesanan / laman web',
  'ms-MY::Menu PDF': 'PDF menu',
  'nl-NL::POS / ordering / website': 'POS / bestellen / website',
  'nl-NL::Token Credits (Audit)': 'Tokencredits (audit)',
  'nl-NL::Feedback QR': 'Feedback-QR',
  'nl-NL::Saving...': 'Opslaan...',
  'nl-NL::SEO & Analytics': 'SEO en analyses',
  'nl-NL::Instagram bio, Google listing, flyers': 'Instagram-bio, Google-vermelding, flyers',
  'pl-PL::Saving...': 'Zapisywanie...',
  'pl-PL::SEO & Analytics': 'SEO i analityka',
  'uk-UA::POS / ordering / website': 'POS / замовлення / вебсайт',
  'cs-CZ::Saving...': 'Ukládání...',
  'ro-RO::Saving...': 'Se salvează...',
  'ro-RO::SEO & Analytics': 'SEO și analiză',
  'hu-HU::Saving...': 'Mentés...',
  'hu-HU::SEO & Analytics': 'SEO és analitika',
  'sv-SE::Version {version}': 'Version {version}',
  'sv-SE::Saving...': 'Sparar...',
  'sv-SE::SEO & Analytics': 'SEO och analys',
  'da-DK::Version {version}': 'Version {version}',
  'da-DK::Saving...': 'Gemmer...',
  'da-DK::SEO & Analytics': 'SEO og analyse',
  'fi-FI::Saving...': 'Tallennetaan...',
  'fil-PH::POS / ordering / website': 'POS / pag-order / website',
  'fil-PH::Saving...': 'Sine-save...',
  'fil-PH::SEO & Analytics': 'SEO at pagsusuri',
  'sw-KE::Google Maps Link': 'Kiungo cha Google Maps',
  'sw-KE::Saving...': 'Inahifadhi...',
  'sw-KE::Yesterday · {count} {scans}': 'Jana · {count} {scans}',
  'cs-CZ::{businessName} | Menu': '{businessName} | Menu',
  'cs-CZ::{count} min': '{count} min',
  'cs-CZ::Menu': 'Menu',
  'da-DK::Feedback': 'Feedback',
  'da-DK::{businessName} | Menu': '{businessName} | Menu',
  'da-DK::Mild': 'Mild',
  'da-DK::{count} min': '{count} min',
  'da-DK::Protein {value}g': 'Protein {value}g',
  'da-DK::Menu': 'Menu',
  'de-DE::Option': 'Option',
  'de-DE::{count} min': '{count} min',
  'de-DE::Protein {value}g': 'Protein {value}g',
  'de-DE::Express {minutes} min': 'Express {minutes} min',
  'de-DE::Name': 'Name',
  'fi-FI::{count} min': '{count} min',
  'fil-PH::Feedback': 'Feedback',
  'fil-PH::Rating': 'Rating',
  'fil-PH::{businessName} | Menu': '{businessName} | Menu',
  'fil-PH::Vegetarian': 'Vegetarian',
  'fil-PH::{count} min': '{count} min',
  'fil-PH::{count} cal': '{count} cal',
  'fil-PH::Menu': 'Menu',
  'fil-PH::Catalog': 'Catalog',
  'fil-PH::Email address': 'Email address',
  'fr-FR::Sections': 'Sections',
  'fr-FR::Excellent': 'Excellent',
  'hu-HU::{count} min': '{count} min',
  'id-ID::Protein {value}g': 'Protein {value}g',
  'it-IT::Feedback': 'Feedback',
  'it-IT::Privacy': 'Privacy',
  'it-IT::{count} min': '{count} min',
  'ms-MY::{businessName} | Menu': '{businessName} | Menu',
  'ms-MY::Popular': 'Popular',
  'ms-MY::Vegetarian': 'Vegetarian',
  'ms-MY::item': 'item',
  'ms-MY::{count} min': '{count} min',
  'ms-MY::Protein {value}g': 'Protein {value}g',
  'ms-MY::Menu': 'Menu',
  'nl-NL::Feedback': 'Feedback',
  'nl-NL::Privacy': 'Privacy',
  'nl-NL::Mild': 'Mild',
  'nl-NL::{count} min': '{count} min',
  'nl-NL::{count} cal': '{count} cal',
  'nl-NL::Express {minutes} min': 'Express {minutes} min',
  'pl-PL::{businessName} | Menu': '{businessName} | Menu',
  'pl-PL::Menu': 'Menu',
  'pt-BR::{businessName} | Menu': '{businessName} | Menu',
  'pt-BR::Popular': 'Popular',
  'pt-BR::item': 'item',
  'pt-BR::{count} cal': '{count} cal',
  'pt-BR::Menu': 'Menu',
  'ro-RO::Feedback': 'Feedback',
  'ro-RO::Popular': 'Popular',
  'ro-RO::Vegetarian': 'Vegetarian',
  'ro-RO::Non-vegetarian': 'Non-vegetarian',
  'ro-RO::{count} min': '{count} min',
  'ro-RO::{count} cal': '{count} cal',
  'ro-RO::Catalog': 'Catalog',
  'sv-SE::Mild': 'Mild',
  'sv-SE::Medium': 'Medium',
  'sv-SE::{count} min': '{count} min',
  'sv-SE::Protein {value}g': 'Protein {value}g',
  'sv-SE::Express {minutes} min': 'Express {minutes} min',
  'tr-TR::{count} cal': '{count} cal',
  'tr-TR::Protein {value}g': 'Protein {value}g',
});

function readArgument(prefix) {
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function localePath(locale) {
  return path.join(LOCALE_DIR, `${locale}.json`);
}

function parseLocaleRegistry() {
  const common = fs.readFileSync(path.join(ROOT, 'src', 'constants', 'common.ts'), 'utf8');
  const registryMatch = common.match(/export const APP_LANGUAGES = \[([\s\S]*?)\n\]/);
  assert(registryMatch, 'APP_LANGUAGES registry could not be read');
  return [...registryMatch[1].matchAll(/value:\s*"([^"]+)"/g)]
    .map((match) => match[1]);
}

function flattenStrings(value, prefix = '', output = new Map()) {
  if (typeof value === 'string') {
    output.set(prefix, value);
    return output;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return output;
  for (const [key, child] of Object.entries(value)) {
    flattenStrings(child, prefix ? `${prefix}.${key}` : key, output);
  }
  return output;
}

function getByPath(value, dottedPath) {
  return dottedPath.split('.').reduce((current, key) => current?.[key], value);
}

function setByPath(value, dottedPath, nextValue) {
  const parts = dottedPath.split('.');
  let current = value;
  for (const part of parts.slice(0, -1)) {
    if (!current[part] || typeof current[part] !== 'object' || Array.isArray(current[part])) {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts.at(-1)] = nextValue;
}

function sourceOwnerMessages(source) {
  const output = new Map();
  for (const namespace of getOwnerLocaleNamespaces(source)) {
    flattenStrings(source[namespace], namespace, output);
  }
  return output;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function mapDigest(messages) {
  return sha256(JSON.stringify([...messages.entries()].sort(([a], [b]) => a.localeCompare(b))));
}

function providerForLocale(locale) {
  if (INDICTRANS_TARGETS[locale]) {
    return {
      provider: 'indictrans2',
      target: INDICTRANS_TARGETS[locale],
    };
  }
  if (MADLAD400_TARGETS[locale]) {
    return {
      provider: 'madlad400',
      target: MADLAD400_TARGETS[locale],
    };
  }
  throw new Error(`No semantic translation provider is configured for ${locale}`);
}

function providerMetadata() {
  return {
    indictrans2: {
      model: 'naklitechie/indictrans2-en-indic-dist-200M',
      upstream: 'ai4bharat/indictrans2-en-indic-dist-200M',
      revision: 'a814dab1ae6e4ee4c7d785b7e1dcb0ac8e36bcd6',
      upstreamWeightSha256: '0039e4304e9889acc5c8350a193311d07aa5399b6d9fb0445e8fde19e3533bb5',
      license: 'MIT',
      generation: 'greedy; no_repeat_ngram_size=3; repetition_penalty=1.1; max_length=128; token-preserving segment fallback',
    },
    madlad400: {
      model: 'santhosh/madlad400-3b-ct2',
      upstream: 'google/madlad400-3b-mt',
      revision: 'c32ad0cf118807ea6258d14be137547155842723',
      convertedWeightSha256: 'f3c87256a2c888100c179d7dcd7f41df17c767469546c59d32c7dde86c740a6b',
      tokenizerSha256: 'ef11ac9a22c7503492f56d48dce53be20e339b63605983e9f27d2cd0e0f3922c',
      license: 'Apache-2.0',
      generation: 'greedy; no_repeat_ngram_size=3; repetition_penalty=1.1; max_decoding_length=256; token-preserving segment fallback',
    },
  };
}

function originalSlice(source, element) {
  assert(element.location, `ICU element has no source location in '${source}'`);
  return source.slice(element.location.start.offset, element.location.end.offset);
}

function tokenFor(index, provider) {
  assert(
    provider === 'indictrans2' || provider === 'madlad400',
    `Unknown placeholder provider '${provider}'`,
  );
  if (provider === 'indictrans2') return `{${index}}`;
  return `%${index + 1}$s`;
}

function containsTranslatableText(encoded) {
  return /\p{L}/u.test(encoded.replace(PLACEHOLDER_PATTERN, ''));
}

function compileMessage(source, registerUnit, provider) {
  const ast = parse(source, { captureLocation: true });

  function compileSequence(elements) {
    const replacements = [];
    let encoded = '';

    function addReplacement(replacement) {
      const token = tokenFor(replacements.length, provider);
      replacements.push({
        token,
        replacement,
      });
      encoded += token;
    }

    for (const element of elements) {
      if (element.type === TYPE.literal) {
        let cursor = 0;
        for (const match of element.value.matchAll(PROTECTED_PATTERN)) {
          encoded += element.value.slice(cursor, match.index);
          addReplacement({
            kind: 'raw',
            value: match[0],
          });
          cursor = match.index + match[0].length;
        }
        encoded += element.value.slice(cursor);
        continue;
      }

      if (
        element.type === TYPE.argument
        || element.type === TYPE.number
        || element.type === TYPE.date
        || element.type === TYPE.time
        || element.type === TYPE.pound
      ) {
        addReplacement({
          kind: 'raw',
          value: originalSlice(source, element),
        });
        continue;
      }

      if (element.type === TYPE.tag) {
        addReplacement({
          kind: 'tag',
          name: element.value,
          children: compileSequence(element.children),
        });
        continue;
      }

      if (element.type === TYPE.select || element.type === TYPE.plural) {
        addReplacement({
          kind: element.type === TYPE.select ? 'select' : 'plural',
          value: element.value,
          pluralType: element.pluralType,
          offset: element.offset,
          options: Object.fromEntries(
            Object.entries(element.options).map(([selector, option]) => [
              selector,
              compileSequence(option.value),
            ]),
          ),
        });
        continue;
      }

      throw new Error(`Unsupported ICU element type ${element.type} in '${source}'`);
    }

    return {
      kind: 'sequence',
      encoded,
      replacements,
      unitId: containsTranslatableText(encoded) ? registerUnit(encoded) : null,
    };
  }

  return compileSequence(ast);
}

function signatureForMessage(message) {
  const signature = [];

  function visit(elements) {
    for (const element of elements) {
      if (element.type === TYPE.literal || element.type === TYPE.pound) continue;
      if (element.type === TYPE.tag) {
        signature.push(`tag:${element.value}`);
        visit(element.children);
        continue;
      }
      if (element.type === TYPE.select || element.type === TYPE.plural) {
        signature.push(
          [
            TYPE[element.type],
            element.value,
            element.pluralType || '',
            element.offset || 0,
            Object.keys(element.options).sort().join(','),
          ].join(':'),
        );
        for (const option of Object.values(element.options)) visit(option.value);
        continue;
      }
      signature.push(`${TYPE[element.type]}:${element.value}:${originalSlice(message, element)}`);
    }
  }

  visit(parse(message, { captureLocation: true }));
  return signature.sort();
}

function renderPlan(plan, unitResults, context) {
  if (plan.kind === 'raw') return plan.value;
  if (plan.kind === 'tag') {
    return `<${plan.name}>${renderPlan(plan.children, unitResults, context)}</${plan.name}>`;
  }
  if (plan.kind === 'select' || plan.kind === 'plural') {
    const type = plan.kind === 'select'
      ? 'select'
      : plan.pluralType === 'ordinal'
        ? 'selectordinal'
        : 'plural';
    const offset = plan.kind === 'plural' && plan.offset ? ` offset:${plan.offset}` : '';
    const options = Object.entries(plan.options)
      .map(([selector, option]) => `${selector} {${renderPlan(option, unitResults, context)}}`)
      .join(' ');
    return `{${plan.value}, ${type},${offset} ${options}}`;
  }

  assert(plan.kind === 'sequence', `Unknown compiled plan kind '${plan.kind}'`);
  let translated = plan.unitId ? unitResults[plan.unitId] : plan.encoded;
  assert(
    typeof translated === 'string',
    `${context}: missing translated unit ${plan.unitId}`,
  );

  for (const { token } of plan.replacements) {
    if (!plan.encoded.includes(`'${token}`)) {
      translated = translated.replaceAll(`'${token}`, token);
    }
    if (!plan.encoded.includes(`${token}'`)) {
      translated = translated.replaceAll(`${token}'`, token);
    }
  }

  const expectedTokens = plan.replacements.map(({ token }) => token).sort();
  const actualTokens = translated.match(PLACEHOLDER_PATTERN)?.sort() || [];
  assert(
    JSON.stringify(actualTokens) === JSON.stringify(expectedTokens),
    `${context}: protected tokens changed for unit ${plan.unitId || 'literal-only'}`,
  );

  for (const { token, replacement } of plan.replacements) {
    translated = translated.replace(token, renderPlan(replacement, unitResults, context));
  }
  assert(
    (translated.match(PLACEHOLDER_PATTERN) || []).length === 0,
    `${context}: unresolved protected token remains`,
  );
  return translated;
}

function buildTranslationWork(locales, sourceOwner) {
  const units = new Map();
  const plans = new Map();

  function registerUnit(encoded) {
    const unitId = sha256(encoded).slice(0, 24);
    const existing = units.get(unitId);
    assert(!existing || existing === encoded, `Translation unit hash collision for ${unitId}`);
    units.set(unitId, encoded);
    return unitId;
  }

  const localeWork = {};
  for (const locale of locales) {
    if (ENGLISH_OWNER_LOCALES.has(locale)) continue;
    const provider = providerForLocale(locale);
    const messages = readJson(localePath(locale));
    const fallbackSources = new Set();
    for (const [key, sourceValue] of sourceOwner) {
      if (getByPath(messages, key) === sourceValue) fallbackSources.add(sourceValue);
    }

    const usedUnits = new Set();
    for (const sourceValue of fallbackSources) {
      const planKey = `${provider.provider}\0${sourceValue}`;
      if (!plans.has(planKey)) {
        plans.set(
          planKey,
          compileMessage(sourceValue, registerUnit, provider.provider),
        );
      }
      collectUnitIds(plans.get(planKey), usedUnits);
    }

    localeWork[locale] = {
      ...provider,
      fallbackSources: [...fallbackSources].sort(),
      unitIds: [...usedUnits].sort(),
    };
  }

  return {
    localeWork,
    plans,
    units,
  };
}

function collectUnitIds(plan, output) {
  if (plan.kind === 'sequence') {
    if (plan.unitId) output.add(plan.unitId);
    for (const { replacement } of plan.replacements) collectUnitIds(replacement, output);
    return output;
  }
  if (plan.kind === 'tag') return collectUnitIds(plan.children, output);
  if (plan.kind === 'select' || plan.kind === 'plural') {
    for (const option of Object.values(plan.options)) collectUnitIds(option, output);
  }
  return output;
}

function preparePayload(locales, sourceOwner, work) {
  return {
    version: 1,
    sourceLocale: SOURCE_LOCALE,
    sourceOwnerSha256: mapDigest(sourceOwner),
    providers: providerMetadata(),
    locales: Object.fromEntries(
      Object.entries(work.localeWork).map(([locale, localeWork]) => [
        locale,
        {
          provider: localeWork.provider,
          target: localeWork.target,
          fallbackSourceCount: localeWork.fallbackSources.length,
          units: localeWork.unitIds.map((unitId) => ({
            id: unitId,
            text: work.units.get(unitId),
          })),
        },
      ]),
    ),
    registeredLocales: locales,
  };
}

function translationLengthRatio(source, translated) {
  return [...translated].length / Math.max(1, [...source].length);
}

function sentenceBoundaryCount(value) {
  return (value.match(SENTENCE_BOUNDARY_PATTERN) || []).length;
}

function hasUnexpectedSentenceExpansion(sourceValue, translatedValue) {
  return sentenceBoundaryCount(sourceValue) <= 1
    && sentenceBoundaryCount(translatedValue) >= 2;
}

function hasLeakedProviderPlaceholder(value) {
  return LEAKED_PROVIDER_PLACEHOLDER_PATTERN.test(value);
}

function buildQualityPayload(locales, sourceOwner) {
  const units = new Map();
  const plans = new Map();

  function registerUnit(encoded) {
    const unitId = sha256(encoded).slice(0, 24);
    const existing = units.get(unitId);
    assert(!existing || existing === encoded, `Translation unit hash collision for ${unitId}`);
    units.set(unitId, encoded);
    return unitId;
  }

  const localePayloads = {};
  for (const locale of locales) {
    if (ENGLISH_OWNER_LOCALES.has(locale)) continue;
    const provider = providerForLocale(locale);
    const messages = readJson(localePath(locale));
    const qualityEntries = [];
    const usedUnits = new Set();

    for (const [key, sourceValue] of sourceOwner) {
      const currentValue = getByPath(messages, key);
      const isPublicCustomerKey = key.startsWith('BusinessSettings.publicCustomer.');
      const lengthRatio = typeof currentValue === 'string'
        ? translationLengthRatio(sourceValue, currentValue)
        : 1;
      const untranslatedResidue = currentValue === sourceValue
        && /[A-Za-z]/.test(sourceValue)
        && !isProtectedInvariant(sourceValue)
        && !isReviewedExactOverride(locale, key, sourceValue);
      const unexpectedSentenceExpansion = isPublicCustomerKey
        && typeof currentValue === 'string'
        && hasUnexpectedSentenceExpansion(sourceValue, currentValue);
      const leakedProviderPlaceholder = isPublicCustomerKey
        && typeof currentValue === 'string'
        && hasLeakedProviderPlaceholder(currentValue);
      if (
        typeof currentValue !== 'string'
        || (
          !untranslatedResidue
          && !unexpectedSentenceExpansion
          && !leakedProviderPlaceholder
          && [...sourceValue].length < 20
        )
        || (
          !untranslatedResidue
          && !unexpectedSentenceExpansion
          && !leakedProviderPlaceholder
          &&
          lengthRatio >= MIN_TRANSLATION_LENGTH_RATIO
          && lengthRatio <= MAX_TRANSLATION_LENGTH_RATIO
        )
      ) {
        continue;
      }

      const planKey = `${provider.provider}\0${sourceValue}`;
      if (!plans.has(planKey)) {
        plans.set(
          planKey,
          compileMessage(sourceValue, registerUnit, provider.provider),
        );
      }
      collectUnitIds(plans.get(planKey), usedUnits);
      qualityEntries.push({
        key,
        sourceSha256: sha256(sourceValue),
        currentSha256: sha256(currentValue),
      });
    }

    if (qualityEntries.length) {
      localePayloads[locale] = {
        ...provider,
        qualityEntries,
        units: [...usedUnits].sort().map((unitId) => ({
          id: unitId,
          text: units.get(unitId),
        })),
      };
    }
  }

  return {
    version: 1,
    sourceLocale: SOURCE_LOCALE,
    sourceOwnerSha256: mapDigest(sourceOwner),
    providers: providerMetadata(),
    qualityPolicy: {
      trigger: `translated/source Unicode length ratio outside ${MIN_TRANSLATION_LENGTH_RATIO}-${MAX_TRANSLATION_LENGTH_RATIO}, exact non-invariant English residue, unexpected extra sentence, or leaked provider placeholder`,
      generation: 'beam search plus token-preserving segment fallback',
    },
    locales: localePayloads,
    registeredLocales: locales,
  };
}

function firstCompleteTranslation(value) {
  const match = value.match(
    /^([\s\S]*?[.!?。！？؟])(?:\s+|(?=\p{Lu})|$)/u,
  );
  return match?.[1].trim() || null;
}

function beforeRepeatedOpeningToken(value) {
  const words = [...value.matchAll(/[\p{L}\p{N}]+/gu)];
  if (words.length < 3) return null;
  const opening = words[0][0].toLocaleLowerCase();
  if ([...opening].length < 4) return null;
  const repeated = words.slice(2).find(
    (word) => word[0].toLocaleLowerCase() === opening,
  );
  if (!repeated) return null;
  return value.slice(0, repeated.index).trim();
}

function afterLabelSeparator(value) {
  const separator = value.search(/[:：]/u);
  if (separator < 0 || separator === value.length - 1) return null;
  return value.slice(separator + 1).trim();
}

function isProtectedInvariant(sourceValue) {
  function hasUnprotectedLiteral(elements) {
    for (const element of elements) {
      if (element.type === TYPE.literal) {
        if (/[A-Za-z]/.test(element.value.replace(PROTECTED_PATTERN, ''))) {
          return true;
        }
        continue;
      }
      if (element.type === TYPE.tag) {
        if (hasUnprotectedLiteral(element.children)) return true;
        continue;
      }
      if (element.type === TYPE.select || element.type === TYPE.plural) {
        if (
          Object.values(element.options)
            .some((option) => hasUnprotectedLiteral(option.value))
        ) {
          return true;
        }
      }
    }
    return false;
  }

  try {
    return !hasUnprotectedLiteral(parse(sourceValue));
  } catch {
    return !/[A-Za-z]/.test(sourceValue.replace(PROTECTED_PATTERN, ''));
  }
}

function isReviewedExactOverride(locale, key, sourceValue) {
  return (
    QUALITY_MANUAL_OVERRIDES[`${locale}:${key}`] === sourceValue
    || QUALITY_MANUAL_SOURCE_OVERRIDES[`${locale}::${sourceValue}`]
      === sourceValue
  );
}

function isValidQualityCandidate(sourceValue, candidate) {
  if (
    typeof candidate !== 'string'
    || !candidate.trim()
    || candidate.includes('\uFFFD')
    || hasUnexpectedSentenceExpansion(sourceValue, candidate)
    || hasLeakedProviderPlaceholder(candidate)
    || (candidate === sourceValue && !isProtectedInvariant(sourceValue))
  ) {
    return false;
  }
  const ratio = translationLengthRatio(sourceValue, candidate);
  if ([...sourceValue].length >= 20) {
    if (
      ratio < MIN_TRANSLATION_LENGTH_RATIO
      || ratio > MAX_TRANSLATION_LENGTH_RATIO
    ) {
      return false;
    }
  } else if ([...candidate].length > 80) {
    return false;
  }
  try {
    return JSON.stringify(signatureForMessage(candidate))
      === JSON.stringify(signatureForMessage(sourceValue));
  } catch {
    return false;
  }
}

function isValidManualQualityOverride(sourceValue, candidate) {
  if (candidate !== sourceValue) {
    return isValidQualityCandidate(sourceValue, candidate);
  }
  try {
    return JSON.stringify(signatureForMessage(candidate))
      === JSON.stringify(signatureForMessage(sourceValue));
  } catch {
    return false;
  }
}

function selectQualityCandidate(sourceValue, currentValue, generatedValue) {
  const candidates = [
    generatedValue,
    firstCompleteTranslation(generatedValue),
    firstCompleteTranslation(currentValue),
    beforeRepeatedOpeningToken(generatedValue),
    beforeRepeatedOpeningToken(currentValue),
    afterLabelSeparator(generatedValue),
    afterLabelSeparator(currentValue),
  ].filter(Boolean);
  return candidates.find(
    (candidate) => isValidQualityCandidate(sourceValue, candidate),
  );
}

function applyQualityResults(locales, sourceOwner, results) {
  assert(results.version === 1, 'Unsupported semantic quality result version');
  assert(
    results.sourceOwnerSha256 === mapDigest(sourceOwner),
    'Semantic quality results were generated for a different en-US owner source',
  );

  const evidence = readJson(EVIDENCE_PATH);
  assert(
    evidence.sourceOwnerSha256 === mapDigest(sourceOwner),
    'Semantic evidence belongs to a different en-US owner source',
  );

  const localeMessages = new Map();
  let repairedValues = 0;
  let manualOverridesApplied = 0;
  const qualityErrors = [];
  for (const locale of locales) {
    const messages = readJson(localePath(locale));
    const localeResult = results.locales?.[locale];
    if (localeResult?.qualityEntries?.length) {
      const configured = providerForLocale(locale);
      assert(
        localeResult.provider === configured.provider
          && localeResult.target === configured.target,
        `${locale}: semantic quality provider metadata does not match`,
      );

      const units = new Map();
      function registerUnit(encoded) {
        const unitId = sha256(encoded).slice(0, 24);
        const existing = units.get(unitId);
        assert(!existing || existing === encoded, `Translation unit hash collision for ${unitId}`);
        units.set(unitId, encoded);
        return unitId;
      }

      for (const entry of localeResult.qualityEntries) {
        const sourceValue = sourceOwner.get(entry.key);
        const currentValue = getByPath(messages, entry.key);
        assert(sourceValue, `${locale}:${entry.key} is not in the owner source`);
        assert(
          sha256(sourceValue) === entry.sourceSha256,
          `${locale}:${entry.key} source changed after quality preparation`,
        );
        assert(
          sha256(currentValue) === entry.currentSha256,
          `${locale}:${entry.key} locale value changed after quality preparation`,
        );

        const plan = compileMessage(
          sourceValue,
          registerUnit,
          configured.provider,
        );
        const generatedValue = renderPlan(
          plan,
          localeResult.units || {},
          `${locale}:${entry.key}`,
        ).normalize('NFC');
        const manualOverride = QUALITY_MANUAL_OVERRIDES[`${locale}:${entry.key}`]
          || QUALITY_MANUAL_SOURCE_OVERRIDES[`${locale}::${sourceValue}`];
        if (manualOverride) {
          assert(
            isValidManualQualityOverride(sourceValue, manualOverride),
            `${locale}:${entry.key} manual quality override is not bounded and ICU-safe`,
          );
        }
        const selected = manualOverride || selectQualityCandidate(
          sourceValue,
          currentValue,
          generatedValue,
        );
        if (!selected) {
          qualityErrors.push(
            `${locale}:${entry.key} generated '${generatedValue.slice(0, 160)}'`,
          );
          continue;
        }
        setByPath(messages, entry.key, selected);
        repairedValues += 1;
        if (manualOverride) manualOverridesApplied += 1;
      }
    }
    localeMessages.set(locale, messages);
  }
  assert(
    qualityErrors.length === 0,
    `${qualityErrors.length} semantic quality values have no bounded ICU-safe candidate:\n`
    + qualityErrors.slice(0, 200).join('\n'),
  );

  for (const [locale, messages] of localeMessages) {
    const ownerMessages = new Map();
    let identicalValues = 0;
    for (const namespace of getOwnerLocaleNamespaces(messages)) {
      flattenStrings(messages[namespace], namespace, ownerMessages);
    }
    for (const [key, sourceValue] of sourceOwner) {
      if (getByPath(messages, key) === sourceValue) identicalValues += 1;
    }
    assert(evidence.locales?.[locale], `Semantic evidence is missing ${locale}`);
    evidence.locales[locale].ownerSha256 = mapDigest(ownerMessages);
    evidence.locales[locale].ownerValueCount = ownerMessages.size;
    if (!ENGLISH_OWNER_LOCALES.has(locale)) {
      evidence.locales[locale].identicalValues = identicalValues;
    }
  }
  const previousQualityRepair = evidence.qualityRepair || {};
  evidence.qualityRepair = {
    repairedOn: new Date().toISOString().slice(0, 10),
    repairedValues: (previousQualityRepair.repairedValues || 0) + repairedValues,
    manualOverridesApplied:
      (previousQualityRepair.manualOverridesApplied || 0) + manualOverridesApplied,
    lastPassRepairedValues: repairedValues,
    trigger: `translated/source Unicode length ratio outside ${MIN_TRANSLATION_LENGTH_RATIO}-${MAX_TRANSLATION_LENGTH_RATIO}, exact non-invariant English residue, unexpected extra sentence, or leaked provider placeholder`,
    generation: 'provider beam search with token-preserving segment fallback; bounded first-complete-message fallback',
  };
  evidence.qualityGates = [
    ...new Set([
      ...(evidence.qualityGates || []),
      `Translated/source Unicode length ratio at most ${MAX_TRANSLATION_LENGTH_RATIO} for source messages of 20 or more characters`,
      `Translated/source Unicode length ratio at least ${MIN_TRANSLATION_LENGTH_RATIO} for source messages of 20 or more characters`,
      'Exact English source values are limited to approved protected invariants',
      'Single-sentence source messages do not gain unrelated extra sentences',
      'Provider placeholders cannot leak into rendered locale values',
    ]),
  ];

  if (WRITE) {
    for (const [locale, messages] of localeMessages) {
      if (!ENGLISH_OWNER_LOCALES.has(locale)) writeJson(localePath(locale), messages);
    }
    writeJson(EVIDENCE_PATH, evidence);
  }
  return repairedValues;
}

function applyResults(locales, sourceOwner, work, results) {
  assert(results.version === 1, 'Unsupported semantic translation result version');
  assert(
    results.sourceOwnerSha256 === mapDigest(sourceOwner),
    'Semantic translation results were generated for a different en-US owner source',
  );

  const localeEvidence = {};
  const localeMessages = new Map();
  for (const locale of locales) {
    const messages = readJson(localePath(locale));
    let generatedValues = 0;
    let identicalValues = 0;

    if (!ENGLISH_OWNER_LOCALES.has(locale)) {
      const localeResult = results.locales?.[locale];
      assert(localeResult, `Missing semantic translation results for ${locale}`);
      const configured = providerForLocale(locale);
      assert(
        localeResult.provider === configured.provider
          && localeResult.target === configured.target,
        `${locale}: semantic translation provider metadata does not match`,
      );

      const translationsBySource = new Map();
      for (const sourceValue of work.localeWork[locale].fallbackSources) {
        const plan = work.plans.get(`${configured.provider}\0${sourceValue}`);
        const translated = renderPlan(
          plan,
          localeResult.units || {},
          `${locale}: '${sourceValue.slice(0, 80)}'`,
        ).normalize('NFC');
        assert(!translated.includes('\uFFFD'), `${locale}: invalid replacement character generated`);
        assert(
          JSON.stringify(signatureForMessage(translated))
            === JSON.stringify(signatureForMessage(sourceValue)),
          `${locale}: ICU signature changed for '${sourceValue.slice(0, 80)}'; `
          + `generated '${translated.slice(0, 160)}'`,
        );
        translationsBySource.set(sourceValue, translated);
      }

      for (const [key, sourceValue] of sourceOwner) {
        if (getByPath(messages, key) !== sourceValue) continue;
        const translated = translationsBySource.get(sourceValue);
        assert(typeof translated === 'string', `${locale}: missing message translation for ${key}`);
        setByPath(messages, key, translated);
        generatedValues += 1;
        if (translated === sourceValue) identicalValues += 1;
      }
    }

    const ownerMessages = new Map();
    for (const namespace of getOwnerLocaleNamespaces(messages)) {
      flattenStrings(messages[namespace], namespace, ownerMessages);
    }
    localeEvidence[locale] = {
      provider: ENGLISH_OWNER_LOCALES.has(locale)
        ? locale === SOURCE_LOCALE ? 'source' : 'regional-source'
        : work.localeWork[locale].provider,
      target: ENGLISH_OWNER_LOCALES.has(locale)
        ? locale
        : work.localeWork[locale].target,
      generatedValues,
      identicalValues,
      ownerValueCount: ownerMessages.size,
      ownerSha256: mapDigest(ownerMessages),
    };

    localeMessages.set(locale, messages);
  }

  const evidence = {
    version: 1,
    generatedOn: new Date().toISOString().slice(0, 10),
    sourceLocale: SOURCE_LOCALE,
    sourceOwnerSha256: mapDigest(sourceOwner),
    sourceOwnerValueCount: sourceOwner.size,
    policy: 'Existing non-source values were preserved. Only values equal to en-US were generated.',
    qualityGates: [
      'Pinned provider revision and license',
      'Protected product names, technical terms, URLs, emails, and ICU syntax',
      'Exact ICU argument/select/plural/tag signature parity',
      'NFC normalization and invalid-character rejection',
      'Per-locale owner-subtree SHA-256 evidence',
    ],
    providers: results.providers,
    locales: localeEvidence,
  };
  if (WRITE) {
    for (const [locale, messages] of localeMessages) {
      if (locale !== SOURCE_LOCALE) writeJson(localePath(locale), messages);
    }
    writeJson(EVIDENCE_PATH, evidence);
  }
  return evidence;
}

function main() {
  const selectedModes = [
    PREPARE_PATH,
    APPLY_PATH,
    QUALITY_PREPARE_PATH,
    QUALITY_APPLY_PATH,
  ].filter(Boolean);
  assert(
    selectedModes.length === 1,
    'Use exactly one prepare, apply, quality-prepare, or quality-apply path',
  );
  assert(
    !WRITE || APPLY_PATH || QUALITY_APPLY_PATH,
    '--write is only valid with --apply or --quality-apply',
  );

  const locales = parseLocaleRegistry();
  const source = readJson(localePath(SOURCE_LOCALE));
  const sourceOwner = sourceOwnerMessages(source);

  if (QUALITY_PREPARE_PATH) {
    const payload = buildQualityPayload(locales, sourceOwner);
    writeJson(path.resolve(QUALITY_PREPARE_PATH), payload);
    const totalEntries = Object.values(payload.locales)
      .reduce((sum, locale) => sum + locale.qualityEntries.length, 0);
    const totalUnits = Object.values(payload.locales)
      .reduce((sum, locale) => sum + locale.units.length, 0);
    console.log(
      `Prepared ${totalEntries} semantic quality repairs as ${totalUnits} `
      + `protected units across ${Object.keys(payload.locales).length} locale packs.`,
    );
    return;
  }

  if (QUALITY_APPLY_PATH) {
    const results = readJson(path.resolve(QUALITY_APPLY_PATH));
    const repairedValues = applyQualityResults(locales, sourceOwner, results);
    console.log(
      `${WRITE ? 'Applied' : 'Validated'} ${repairedValues} semantic quality repairs.`,
    );
    if (!WRITE) console.log('No locale or evidence files were changed.');
    return;
  }

  const work = buildTranslationWork(locales, sourceOwner);

  if (PREPARE_PATH) {
    const payload = preparePayload(locales, sourceOwner, work);
    writeJson(path.resolve(PREPARE_PATH), payload);
    const totalUnits = Object.values(payload.locales)
      .reduce((sum, locale) => sum + locale.units.length, 0);
    console.log(
      `Prepared ${totalUnits} protected translation units across `
      + `${Object.keys(payload.locales).length} non-English locale packs.`,
    );
    return;
  }

  const results = readJson(path.resolve(APPLY_PATH));
  const evidence = applyResults(locales, sourceOwner, work, results);
  console.log(
    `${WRITE ? 'Applied' : 'Validated'} semantic translations for `
    + `${Object.keys(evidence.locales).length} locale packs.`,
  );
  if (!WRITE) console.log('No locale or evidence files were changed.');
}

if (require.main === module) main();

module.exports = {
  MAX_TRANSLATION_LENGTH_RATIO,
  MIN_TRANSLATION_LENGTH_RATIO,
  isProtectedInvariant,
  isReviewedExactOverride,
  translationLengthRatio,
};
