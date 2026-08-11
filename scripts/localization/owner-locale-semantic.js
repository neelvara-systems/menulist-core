#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { isDeepStrictEqual } = require('node:util');
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
const SHORT_LABEL_MAX_SOURCE_LENGTH = 20;
const MAX_SHORT_LABEL_LENGTH_RATIO = 2.75;
const SENTENCE_BOUNDARY_PATTERN = /(?:[.!?。！？؟]+|…+)(?:\s+|$)/gu;
const LEAKED_PROVIDER_PLACEHOLDER_PATTERN = /(?:%\s*(?:\d+\s*\$\s*)?[sS](?![\p{L}\p{N}])|\$\s*%\s*\d+\s*\$?\s*[sS]?)/u;

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

const M2M100_TARGETS = Object.freeze({
  'ar-SA': 'ar',
  'cs-CZ': 'cs',
  'da-DK': 'da',
  'de-DE': 'de',
  'el-GR': 'el',
  'es-ES': 'es',
  'fa-IR': 'fa',
  'fi-FI': 'fi',
  'fil-PH': 'tl',
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
    String.raw`\bSmart Picks\b`,
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
    String.raw`\bAndroid\b`,
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
  'ar-SA:BusinessSettings.publicCustomer.menu.whatsApp': 'WhatsApp',
  'as-IN:BusinessSettings.publicCustomer.menu.whatsApp': 'WhatsApp',
  'bn-IN:BusinessSettings.publicCustomer.menu.whatsApp': 'WhatsApp',
  'gu-IN:BusinessSettings.publicCustomer.menu.whatsApp': 'WhatsApp',
  'ko-KR:BusinessSettings.publicCustomer.menu.whatsApp': 'WhatsApp',
  'mai-IN:BusinessSettings.publicCustomer.menu.whatsApp': 'WhatsApp',
  'sat-IN:BusinessSettings.publicCustomer.menu.whatsApp': 'WhatsApp',
  'ta-IN:BusinessSettings.publicCustomer.menu.whatsApp': 'WhatsApp',
  'th-TH:BusinessSettings.publicCustomer.menu.whatsApp': 'WhatsApp',
  'brx-IN:Dashboard.owner.businessHealth.checks.low_latest_activity.action': 'रानलाय लिंकफोरखौ नायग्रोम।',
  'brx-IN:Dashboard.owner.menuSetup.actions.openSharingTools': 'रानलाय आगजुफोरखौ खेव।',
  'de-DE:Dashboard.owner.businessHealth.metrics.bestSourceDetail': 'Link aktualisieren: {count} Besuche',
  'doi-IN:Dashboard.owner.businessHealth.summary.watch.headline': 'इक विवरण पर ध्यान देने दी लोड़ होई सकदी ऐ।',
  'doi-IN:Dashboard.owner.businessHealth.summary.needs_review.headline': 'गाह्कें दे विवरण दी समीक्षा करो',
  'es-ES:Dashboard.owner.businessHealth.open': 'Abrir estado del negocio',
  'fr-FR:Dashboard.owner.businessHealth.locations.title': 'Locations',
  'fr-FR:Dashboard.owner.businessHealth.publicTruth.facts.photos': 'Photos',
  'id-ID:Dashboard.owner.businessHealth.assistant.questions.public_menu_status': 'Apakah menu publik saya sudah benar?',
  'id-ID:Dashboard.owner.businessHealth.assistant.questions.feedback_recent': 'Apa yang dikatakan tamu baru-baru ini?',
  'ms-MY:Dashboard.owner.businessHealth.assistant.questions.feedback_recent': 'Apakah maklum balas terkini daripada pelanggan?',
  'nl-NL:Dashboard.owner.businessHealth.publicTruth.facts.contact': 'Contact',
  'nl-NL:Dashboard.owner.businessHealth.publicTruth.actions.fixFact': 'Corrigeer {fact}',
  'ro-RO:Dashboard.owner.businessHealth.publicTruth.status.ready.message': 'Sursa dvs. oficială pentru clienți conține informațiile de bază de care aceștia au nevoie.',
  'hu-HU:Dashboard.owner.businessHealth.publicTruth.actions.fixFact': '{fact} javítása',
  'sv-SE:Dashboard.owner.businessHealth.sources.menuListData': 'MenuList-data',
  'da-DK:Dashboard.owner.businessHealth.sources.menuListData': 'MenuList-data',
  'fil-PH:Dashboard.owner.businessHealth.publicTruth.facts.public_link': 'Link para sa customer',
  'fa-IR:Dashboard.owner.actionPlan.localizedActions.details.title': 'بهبود جزئیات موارد',
  'fil-PH:Dashboard.owner.actionPlan.localizedActions.search.title': 'Suriin ang mga paghahanap ng customer',
  'fil-PH:Dashboard.owner.businessHealth.open': 'Buksan ang kalagayan ng negosyo',
  'fil-PH:Dashboard.owner.publicTruthStatus.link.missing': 'Nawawala ang link ng customer',
  'he-IL:Dashboard.owner.ownerActions.items.openPrivateFeedback.label': 'פתיחת משוב פרטי',
  'hu-HU:Dashboard.owner.details.itemStatus.unavailableDemand': '{count} koppintás nem elérhető elemekre',
  'id-ID:Dashboard.owner.menuSetup.actions.prepareDescriptions': 'Siapkan deskripsi',
  'ks-IN:Dashboard.owner.states.no': 'نہ',
  'ks-IN:Dashboard.owner.actionPlan.markDone': 'Mark as done',
  'mai-IN:Dashboard.owner.offering.product.singular': 'सूची',
  'mai-IN:Dashboard.owner.offering.product.thisMonthLabel': 'एहि मास अहाँक सूची',
  'mni-IN:Dashboard.owner.menuQuality.checkedJustNow': 'ꯍꯧꯖꯤꯛ ꯆꯦꯛ ꯇꯧꯈ꯭ꯔꯦ',
  'ms-MY:Dashboard.owner.actionPlan.localizedActions.details.title': 'Tingkatkan butiran item',
  'or-IN:Dashboard.owner.subtitles.demandChecks': 'ଚାହିଦା ଯାଞ୍ଚ',
  'sw-KE:Dashboard.owner.businessHealth.open': 'Fungua hali ya biashara',
  'tr-TR:Dashboard.owner.offering.menu.singular': 'menü',
  'fr-FR:Dashboard.owner.hoursNudge.brokenTitle': 'Les heures doivent être mises à jour',
  'de-DE:Dashboard.owner.sources.menuKit': 'Menü-Kit',
  'de-DE:Dashboard.owner.graph.charts.menuTrend.title': 'Menütrend',
  'vi-VN:Dashboard.owner.actionPlan.results.no_clear_change.label': 'Không có thay đổi rõ ràng',
  'vi-VN:Dashboard.owner.menuSetup.steps.keyDetailsChecked.label': 'Đã kiểm tra thông tin chính',
  'tr-TR:Dashboard.owner.graph.charts.menuTrend.title': 'Menü eğilimi',
  'nl-NL:Dashboard.owner.sources.menuKit': 'Menukit',
  'nl-NL:Dashboard.owner.graph.charts.menuTrend.title': 'Menutrend',
  'nl-NL:Dashboard.owner.menuSetup.actions.openMenuCheck': 'Menucontrole openen',
  'pl-PL:Dashboard.owner.graph.charts.menuTrend.title': 'Trend menu',
  'cs-CZ:Dashboard.owner.graph.charts.menuTrend.title': 'Trend menu',
  'da-DK:Dashboard.owner.obp.sourceMenu': '{count} menu',
  'da-DK:Dashboard.owner.graph.charts.menuTrend.title': 'Menutrend',
  'fi-FI:Dashboard.owner.graph.charts.menuTrend.title': 'Menutrendi',
  'fil-PH:Dashboard.owner.sources.menuKit': 'Kit ng menu',
  'fil-PH:Dashboard.owner.sources.shortcut': 'Shortcut ng app',
  'fil-PH:Dashboard.owner.graph.trend.summary': 'Buod ng trend',
  'fil-PH:Dashboard.owner.graph.trend.period.week': 'Pagsusuri sa linggo',
  'fil-PH:Dashboard.owner.offering.service.singular': 'listahan ng serbisyo',
  'fil-PH:Dashboard.owner.menuSetup.actions.openSharingTools': 'Buksan ang mga tool sa pagbabahagi',
  'fil-PH:Dashboard.owner.menuSetup.actions.openMenuCheck': 'Buksan ang pagsusuri ng menu',
  'fil-PH:Dashboard.owner.menuSetup.steps.sourceAdded.label': 'Naidagdag ang pinagmulan',
  'fil-PH:Dashboard.owner.menuSetup.steps.linkPlaced.readyLabel': 'Handa na ang link',
  'pt-BR:Dashboard.owner.details.itemStatus.strongItem': '{count} toques em itens',
  'ja-JP:Dashboard.owner.graph.trend.messages.up': '{period}の比較では、{metric}が高くなっています。',
  'ja-JP:Dashboard.owner.graph.trend.messages.down': '{period}の比較では、{metric}が低くなっています。',
  'ja-JP:Dashboard.owner.graph.trend.messages.not_enough_data': '{period}の比較に必要な{metric}の確定データがまだ十分ではありません。',
  'id-ID:Dashboard.owner.details.itemStatus.strongItem': '{count} ketukan item',
  'nl-NL:Dashboard.owner.actionPlan.localizedActions.details.action': 'Itemdetails controleren',
  'nl-NL:Dashboard.owner.details.itemStatus.strongItem': '{count} tikken op items',
  'cs-CZ:Dashboard.owner.graph.trend.versus': '{current} oproti {previous}',
  'da-DK:Dashboard.owner.customerApp.shortcuts.reservation': 'Reservation',
  'fi-FI:Dashboard.owner.graph.trend.versus': '{current} verrattuna {previous}',
  'fa-IR:Dashboard.owner.graph.trend.messages.stable': 'در بررسی {period}، {metric} ثابت است.',
  'es-ES:Dashboard.owner.graph.trend.versus': '{current} frente a {previous}',
  'fr-FR:Dashboard.owner.graph.trend.versus': '{current} par rapport à {previous}',
  'pt-BR:Dashboard.owner.graph.trend.versus': '{current} em relação a {previous}',
  'id-ID:Dashboard.owner.details.itemStatus.gettingAttention': '{count} tayangan',
  'id-ID:Dashboard.owner.graph.trend.versus': '{current} dibandingkan dengan {previous}',
  'vi-VN:Dashboard.owner.graph.trend.versus': '{current} so với {previous}',
  'tr-TR:Dashboard.owner.graph.trend.versus': '{current}, önceki {previous}',
  'ro-RO:Dashboard.owner.graph.trend.versus': '{current} față de {previous}',
  'hu-HU:Dashboard.owner.graph.trend.versus': '{current} kontra {previous}',
  'da-DK:Dashboard.owner.graph.trend.versus': '{current} mod {previous}',
  'fil-PH:Dashboard.owner.graph.trend.versus': '{current} kumpara sa {previous}',
  'sw-KE:Dashboard.owner.graph.trend.versus': '{current} ikilinganishwa na {previous}',
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
  'ar-SA:Dashboard.owner.businessHealth.publicTruth.status.ready.message': 'يحتوي مصدرك الرسمي لمعلومات العملاء على المعلومات الأساسية التي يحتاجون إليها.',
  'ar-SA:Dashboard.owner.businessHealth.publicTruth.nextFixes': 'التصحيحات التالية للمعلومات العامة',
  'de-DE:Dashboard.owner.businessHealth.publicTruth.status.ready.message': 'Ihre offizielle Kundenquelle enthält die grundlegenden Informationen, die Kunden benötigen.',
  'de-DE:Dashboard.owner.businessHealth.publicTruth.nextFixes': 'Nächste Korrekturen an öffentlichen Informationen',
  'fil-PH:Dashboard.owner.businessHealth.publicTruth.title': 'Opisyal na mapagkukunan ng impormasyon para sa customer',
  'fil-PH:Dashboard.owner.businessHealth.publicTruth.modules.customer_link_preview.title': 'Preview ng link para sa customer',
  'he-IL:Dashboard.owner.businessHealth.publicTruth.title': 'מקור המידע הרשמי ללקוחות',
  'he-IL:Dashboard.owner.businessHealth.publicTruth.status.ready.message': 'מקור המידע הרשמי שלך ללקוחות כולל את הפרטים הבסיסיים שהם צריכים.',
  'he-IL:Dashboard.owner.businessHealth.publicTruth.nextFixes': 'התיקונים הבאים למידע הציבורי',
  'he-IL:MobileShell.returnToMobile': 'אתה צופה בגרסת שולחן העבודה. חזור לגרסה הניידת.',
  'id-ID:Dashboard.owner.businessHealth.publicTruth.title': 'Sumber informasi resmi untuk pelanggan',
  'id-ID:Dashboard.owner.businessHealth.publicTruth.nextFixes': 'Perbaikan informasi publik berikutnya',
  'ja-JP:Dashboard.owner.businessHealth.publicTruth.nextFixes': '次に修正する公開情報',
  'ja-JP:Dashboard.owner.overview.statusMessages.low_activity': '顧客の利用状況はまだ集計中です。現在のメニューは引き続き利用できます。',
  'ja-JP:Dashboard.owner.actionPlan.menuIntelligenceTitle': 'メニュー改善アクションプラン',
  'ja-JP:Dashboard.owner.obp.sharedInfo': '「アクション」は、電話、WhatsApp、経路案内、予約、注文の最終クリック数です。「共有」は公式ビジネスリンクカードからの共有数です。「リンクのタップ」は、Googleのクチコミ、Instagram、Facebook、および公開OBPからのウェブサイト訪問数です。',
  'ja-JP:Dashboard.owner.today.refreshHint': 'この画面を再度開くか、10分後に更新すると最新データが表示されます。継続的な自動更新は行われません。',
  'ja-JP:Dashboard.owner.metrics.smartPicksEngagement': 'Smart Picks の利用状況',
  'ja-JP:Dashboard.owner.tooltips.smartPicksShown': 'Smart Picks がページに表示された回数',
  'ja-JP:Dashboard.owner.tooltips.smartPicksUsed': 'Smart Picks を利用した顧客の割合',
  'ja-JP:Dashboard.owner.actionPlan.proDescription': 'Proでは、メニューの分析、オーナー向けアクションリスト、メニュー利用状況のわかりやすい要約を利用できます。',
  'ja-JP:Dashboard.owner.obp.officialBusinessPage': '公式ビジネスページ',
  'ja-JP:Dashboard.owner.obp.titles.overall': '公式ビジネスページ · 全体',
  'ja-JP:Dashboard.owner.obp.titles.weekly': '公式ビジネスページ · 過去7日間',
  'ja-JP:Dashboard.owner.obp.titles.monthly': '公式ビジネスページ · 今月',
  'ja-JP:Dashboard.owner.obp.mobileInfoIntro': 'このカードでは、顧客がメニューを開く前後に公式ビジネスページをどのように利用したかを確認できます。',
  'ja-JP:Dashboard.owner.obp.mobileInfoLinks': '「共有」は公式ビジネスリンクカードからの共有数です。「リンクのタップ」は、Googleのクチコミ、Instagram、Facebook、および公開OBPからのウェブサイト訪問数です。',
  'ja-JP:Dashboard.owner.customerApp.noInstallsDescription': '顧客がメニューアプリをインストールすると、ここに件数が表示されます。',
  'ja-JP:Dashboard.owner.customerApp.mobileNoInstallsDescription': 'まだインストールはありません。顧客がメニューアプリをインストールすると、ここに件数が表示されます。',
  'ja-JP:Dashboard.owner.customerApp.iosInferredNoCount': 'Safariには標準のインストールイベントがありません。iOSのインストール数は、単独起動やホーム画面への追加操作から推定されるため、完全に確認された数ではなく、初回の単独起動後に表示される場合があります。インストールした顧客数は端末とブラウザに基づく推定であり、正確な人数ではありません。',
  'ja-JP:Dashboard.owner.customerApp.mobileIosInferredNoCount': 'iOS Safariのインストール数は推定値の場合があります。Safariには標準のインストールイベントがないため、単独起動やホーム画面への追加操作から推定され、初回の単独起動後に表示される場合があります。インストールした顧客数は端末とブラウザに基づく推定であり、正確な人数ではありません。',
  'ja-JP:Dashboard.owner.businessHealth.checks.no_active_projects.message': '有効な公開メニューが見つかりません。共有する前にメニューを確認してください。',
  'ja-JP:Dashboard.owner.businessHealth.freshness.latest': '利用可能な最新のMenuListデータを使用しています。今日のデータはまだ確定していない場合があります。',
  'ja-JP:Dashboard.owner.businessHealth.page.desktopSettingsOnly': 'デスクトップ版の設定から開いてください。',
  'ja-JP:Dashboard.owner.businessHealth.scope.title': 'ビジネス状態の対象範囲',
  'ja-JP:Dashboard.owner.businessHealth.assistant.englishOnlyDescription': '状態とチェック結果は日本語で表示されます。ビジネス状態について質問するには、アプリの言語を英語に切り替えてください。',
  'ja-JP:Dashboard.owner.businessHealth.publicTruth.boundary': '現在のMenuListのビジネス情報とメニューデータを確認しています。外部サービスの情報はオーナーが確認します。',
  'ja-JP:Dashboard.owner.businessHealth.publicTruth.modules.public_truth_basics.title': '公開情報の基本項目',
  'ja-JP:Dashboard.owner.publicTruthStatus.description.readyToPlace': '顧客リンクの準備ができました。Google、Instagram、WhatsApp、QR、または印刷物に追加し、顧客が最新情報を確認できるようにしてください。',
  'ko-KR:Dashboard.owner.businessHealth.publicTruth.title': '공식 고객 정보 출처',
  'ko-KR:Dashboard.owner.businessHealth.publicTruth.nextFixes': '다음 공개 정보 수정 사항',
  'ms-MY:Dashboard.owner.businessHealth.publicTruth.nextFixes': 'Pembetulan maklumat awam seterusnya',
  'nl-NL:Dashboard.owner.businessHealth.publicTruth.status.ready.message': 'Uw officiële informatiebron voor klanten bevat de basisinformatie die zij nodig hebben.',
  'nl-NL:Dashboard.owner.businessHealth.publicTruth.nextFixes': 'Volgende correcties van openbare informatie',
  'ro-RO:Dashboard.owner.businessHealth.publicTruth.title': 'Sursa oficială de informații pentru clienți',
  'ro-RO:Dashboard.owner.businessHealth.publicTruth.nextFixes': 'Următoarele corecturi ale informațiilor publice',
  'sv-SE:Dashboard.owner.businessHealth.publicTruth.status.ready.message': 'Din officiella informationskälla för kunder innehåller den grundläggande information de behöver.',
  'sw-KE:Dashboard.owner.businessHealth.publicTruth.title': 'Chanzo rasmi cha taarifa za wateja',
  'sw-KE:Dashboard.owner.businessHealth.publicTruth.nextFixes': 'Marekebisho yanayofuata ya taarifa za umma',
  'zh-CN:Dashboard.owner.businessHealth.publicTruth.title': '官方客户信息源',
  'zh-CN:Dashboard.owner.businessHealth.publicTruth.nextFixes': '接下来要修正的公开信息',
  'zh-CN:MobileShell.returnToMobile': '您正在查看桌面版。返回移动版。',
  'zh-CN:Dashboard.owner.obp.sharedInfo': '“操作”统计电话、WhatsApp、路线、预订和订单的最终 OBP 点击。“分享”统计官方商家链接卡的分享次数。“链接点击”统计来自 Google 评论、Instagram、Facebook 和公开 OBP 的网站访问。',
  'zh-CN:Dashboard.owner.overview.statusMessages.low_activity': '客户活动仍在积累中。您当前的菜单仍可正常使用。',
  'zh-CN:Dashboard.owner.obp.mobileInfoLinks': '“分享”统计官方商家链接卡的分享次数。“链接点击”统计来自 Google 评论、Instagram、Facebook 和公开 OBP 的网站访问。',
  'zh-CN:Dashboard.owner.businessHealth.open': '打开业务状态',
  'zh-CN:Dashboard.owner.businessHealth.summary.stale.message': '上次检查的数据已过期。您当前的公开信息保持不变。',
  'zh-CN:Dashboard.owner.businessHealth.checks.no_active_projects.title': '菜单来源需要检查',
  'zh-CN:Dashboard.owner.businessHealth.checks.no_active_projects.message': '找不到有效的公开菜单来源。分享前请先检查菜单。',
  'zh-CN:Dashboard.owner.businessHealth.checks.low_latest_activity.message': '客户活动较少。请检查 QR、Google、Instagram、WhatsApp 和网站链接。',
  'zh-CN:Dashboard.owner.businessHealth.freshness.notReady': '业务状态不是实时数据。首次门店检查后，这里会显示数据日期。',
  'zh-CN:Dashboard.owner.businessHealth.freshness.latest': '使用最新可用的 MenuList 数据。今天的数据可能尚未完整。',
  'zh-CN:Dashboard.owner.businessHealth.scope.title': '业务状态范围',
  'zh-CN:Dashboard.owner.businessHealth.assistant.englishOnlyDescription': '您的状态和检查已本地化。如需提出业务状态问题，请将应用语言切换为英语。',
  'zh-CN:Dashboard.owner.businessHealth.publicTruth.boundary': '根据当前 MenuList 商家和菜单数据进行检查。外部平台的信息仍由商家确认。',
  'zh-CN:Dashboard.owner.businessHealth.publicTruth.historyTitle': '公开信息历史记录',
  'zh-CN:Dashboard.owner.businessHealth.publicTruth.historyBoundary': '仅使用 MenuList 商家和菜单信息。不扫描外部网站。',
  'zh-CN:Dashboard.owner.businessHealth.publicTruth.historyBoundaryShort': '仅使用 MenuList 信息。不扫描外部网站。',
  'zh-CN:Dashboard.owner.businessHealth.publicTruth.downloadEnglishReport': '下载英文报告',
  'zh-CN:Dashboard.owner.businessHealth.publicTruth.modules.customer_question_coverage.title': '常见客户问题',
  'zh-CN:Dashboard.owner.graph.empty.sources': '客户通过链接、QR 或社交页面访问后，这里会显示来源详情。',
  'zh-CN:Dashboard.owner.menuQuality.signals.priceOutliers.help': 'MenuList 会比较同一类别中的单品价格。如果价格是有意设置的，请将其标记为已检查。',
  'zh-CN:Dashboard.owner.publicTruthStatus.description.active': '无需操作。客户可以从一个来源查看您当前的公开信息。',
  'zh-CN:Dashboard.owner.publicTruthStatus.description.readyToPlace': '您的客户链接已就绪。请将其添加到 Google、Instagram、WhatsApp、QR 或印刷品，让客户始终使用当前信息源。',
  'zh-CN:Dashboard.owner.ownerActions.items.prepareStaffHandoff.description': '在一个位置向员工提供菜单链接、QR 和客户回复用语。',
  'zh-TW:Dashboard.owner.businessHealth.publicTruth.title': '官方客戶資訊來源',
  'zh-TW:Dashboard.owner.businessHealth.publicTruth.nextFixes': '接下來要修正的公開資訊',
  'zh-TW:MobileShell.returnToMobile': '您正在檢視桌面版。返回行動版。',
  'zh-TW:Dashboard.owner.obp.sharedInfo': '「操作」統計電話、WhatsApp、路線、預訂和訂單的最終 OBP 點擊。「分享」統計官方商家連結卡的分享次數。「連結點擊」統計來自 Google 評論、Instagram、Facebook 和公開 OBP 的網站造訪。',
  'zh-TW:Dashboard.owner.overview.statusMessages.low_activity': '客戶活動仍在累積中。您目前的選單仍可正常使用。',
  'zh-TW:Dashboard.owner.obp.mobileInfoLinks': '「分享」統計官方商家連結卡的分享次數。「連結點擊」統計來自 Google 評論、Instagram、Facebook 和公開 OBP 的網站造訪。',
  'zh-TW:Dashboard.owner.businessHealth.open': '開啟業務狀態',
  'zh-TW:Dashboard.owner.businessHealth.summary.stale.message': '上次檢查的資料已過期。您目前的公開資訊保持不變。',
  'zh-TW:Dashboard.owner.businessHealth.checks.no_active_projects.title': '選單來源需要檢查',
  'zh-TW:Dashboard.owner.businessHealth.checks.no_active_projects.message': '找不到有效的公開選單來源。分享前請先檢查選單。',
  'zh-TW:Dashboard.owner.businessHealth.checks.low_latest_activity.message': '客戶活動較少。請檢查 QR、Google、Instagram、WhatsApp 和網站連結。',
  'zh-TW:Dashboard.owner.businessHealth.freshness.notReady': '業務狀態不是即時資料。首次門市檢查後，這裡會顯示資料日期。',
  'zh-TW:Dashboard.owner.businessHealth.freshness.latest': '使用最新可用的 MenuList 資料。今天的資料可能尚未完整。',
  'zh-TW:Dashboard.owner.businessHealth.scope.title': '業務狀態範圍',
  'zh-TW:Dashboard.owner.businessHealth.assistant.englishOnlyDescription': '您的狀態和檢查已在地化。如需提出業務狀態問題，請將應用程式語言切換為英語。',
  'zh-TW:Dashboard.owner.businessHealth.publicTruth.boundary': '根據目前 MenuList 商家和選單資料進行檢查。外部平台的資訊仍由商家確認。',
  'zh-TW:Dashboard.owner.businessHealth.publicTruth.historyTitle': '公開資訊歷史記錄',
  'zh-TW:Dashboard.owner.businessHealth.publicTruth.historyBoundary': '僅使用 MenuList 商家和選單資訊。不掃描外部網站。',
  'zh-TW:Dashboard.owner.businessHealth.publicTruth.historyBoundaryShort': '僅使用 MenuList 資訊。不掃描外部網站。',
  'zh-TW:Dashboard.owner.businessHealth.publicTruth.downloadEnglishReport': '下載英文報告',
  'zh-TW:Dashboard.owner.businessHealth.publicTruth.modules.customer_question_coverage.title': '常見客戶問題',
  'zh-TW:Dashboard.owner.graph.empty.sources': '客戶透過連結、QR 或社群頁面造訪後，這裡會顯示來源詳情。',
  'zh-TW:Dashboard.owner.menuQuality.signals.priceOutliers.help': 'MenuList 會比較同一類別中的單品價格。如果價格是刻意設定的，請將其標記為已檢查。',
  'zh-TW:Dashboard.owner.publicTruthStatus.description.active': '無需操作。客戶可以從一個來源查看您目前的公開資訊。',
  'zh-TW:Dashboard.owner.publicTruthStatus.description.readyToPlace': '您的客戶連結已就緒。請將它加入 Google、Instagram、WhatsApp、QR 或印刷品，讓客戶始終使用目前的資訊來源。',
  'zh-TW:Dashboard.owner.ownerActions.items.prepareStaffHandoff.description': '在一個位置向員工提供選單連結、QR 和客戶回覆用語。',
  'cs-CZ:Dashboard.owner.businessHealth.locations.checkCount': '{count, plural, one {# kontrola} other {# kontrol}}',
  'de-DE:Dashboard.owner.businessHealth.locations.checkCount': '{count, plural, one {# Prüfung} other {# Prüfungen}}',
  'es-ES:Dashboard.owner.businessHealth.locations.checkCount': '{count, plural, one {# comprobación} other {# comprobaciones}}',
  'fr-FR:Dashboard.owner.businessHealth.locations.checkCount': '{count, plural, one {# vérification} other {# vérifications}}',
  'hu-HU:Dashboard.owner.businessHealth.locations.checkCount': '{count, plural, one {# ellenőrzés} other {# ellenőrzés}}',
  'hu-HU:MobileShell.returnToMobile': 'Az asztali verziót nézi. Vissza a mobilverzióhoz.',
  'it-IT:Dashboard.owner.businessHealth.locations.checkCount': '{count, plural, one {# controllo} other {# controlli}}',
  'ja-JP:Dashboard.owner.businessHealth.locations.checkCount': '{count, plural, one {# 件のチェック} other {# 件のチェック}}',
  'ko-KR:Dashboard.owner.businessHealth.locations.checkCount': '{count, plural, one {#개 확인} other {#개 확인}}',
  'pl-PL:Dashboard.owner.businessHealth.locations.checkCount': '{count, plural, one {# kontrola} other {# kontroli}}',
  'ro-RO:Dashboard.owner.businessHealth.locations.checkCount': '{count, plural, one {# verificare} other {# verificări}}',
  'sat-IN:MobileShell.returnToMobile': 'ᱟᱢ ᱰᱮᱥᱠᱴᱚᱯ ᱵᱷᱟᱨᱥᱚᱱ ᱧᱮᱞ ᱠᱟᱱᱟᱢ ᱾ ᱢᱚᱵᱟᱭᱤᱞ ᱨᱮ ᱨᱩᱣᱟᱹᱲ ᱢᱮ ᱾',
  'sv-SE:Dashboard.owner.businessHealth.locations.checkCount': '{count, plural, one {# kontroll} other {# kontroller}}',
  'tr-TR:Dashboard.owner.businessHealth.locations.checkCount': '{count, plural, one {# kontrol} other {# kontrol}}',
  'zh-CN:Dashboard.owner.businessHealth.locations.checkCount': '{count, plural, one {# 项检查} other {# 项检查}}',
  'zh-TW:Dashboard.owner.businessHealth.locations.checkCount': '{count, plural, one {# 項檢查} other {# 項檢查}}',
  'hi-IN:Dashboard.owner.details.descriptions.campaignTracking': 'लिंक और QR प्लेसमेंट से UTM ट्रैफ़िक सहेजा गया।',
  'es-ES:Dashboard.owner.ownerActions.items.placeCustomerLink.descriptionUnplaced': 'Añade el mismo enlace para clientes a Google, Instagram, WhatsApp, QR y materiales impresos.',
  'fr-FR:Dashboard.owner.metrics.smartPicksEngagement': 'Engagement Smart Picks',
  'fr-FR:Dashboard.owner.ownerActions.items.placeCustomerLink.descriptionUnplaced': 'Ajoutez le même lien client à Google, Instagram, WhatsApp, au QR et aux supports imprimés.',
  'pt-BR:Dashboard.owner.ownerActions.items.placeCustomerLink.descriptionUnplaced': 'Adicione o mesmo link do cliente ao Google, Instagram, WhatsApp, QR e materiais impressos.',
  'de-DE:Dashboard.owner.ownerActions.items.placeCustomerLink.descriptionUnplaced': 'Fügen Sie denselben Kundenlink bei Google, Instagram, WhatsApp, im QR-Code und auf Drucksachen ein.',
  'it-IT:Dashboard.owner.ownerActions.items.placeCustomerLink.descriptionUnplaced': 'Aggiungi lo stesso link cliente a Google, Instagram, WhatsApp, QR e materiali stampati.',
  'id-ID:Dashboard.owner.ownerActions.items.placeCustomerLink.descriptionUnplaced': 'Tambahkan tautan pelanggan yang sama ke Google, Instagram, WhatsApp, QR, dan materi cetak.',
  'vi-VN:Dashboard.owner.ownerActions.items.placeCustomerLink.descriptionUnplaced': 'Thêm cùng một liên kết khách hàng vào Google, Instagram, WhatsApp, QR và tài liệu in.',
  'tr-TR:Dashboard.owner.businessHealth.checks.low_latest_activity.message': 'Müşteri etkinliği düşük. QR, Google, Instagram, WhatsApp ve web sitesi bağlantılarını kontrol edin.',
  'tr-TR:Dashboard.owner.graph.empty.sources': "Müşteriler bağlantılardan, QR'dan veya sosyal medya sayfalarından geldikten sonra kaynak ayrıntıları görünür.",
  'tr-TR:Dashboard.owner.ownerActions.items.placeCustomerLink.descriptionPlaced': 'Google, Instagram ve WhatsApp bağlantılarının aynı kaynağı göstermesini sağlayın.',
  'tr-TR:Dashboard.owner.ownerActions.items.placeCustomerLink.descriptionUnplaced': 'Aynı müşteri bağlantısını Google, Instagram, WhatsApp, QR ve basılı materyallere ekleyin.',
  'ms-MY:Dashboard.owner.ownerActions.items.placeCustomerLink.descriptionUnplaced': 'Tambahkan pautan pelanggan yang sama pada Google, Instagram, WhatsApp, QR dan bahan bercetak.',
  'nl-NL:Dashboard.owner.metrics.smartPicksEngagement': 'Smart Picks-betrokkenheid',
  'nl-NL:Dashboard.owner.ownerActions.items.placeCustomerLink.descriptionUnplaced': 'Voeg dezelfde klantlink toe aan Google, Instagram, WhatsApp, QR en drukwerk.',
  'pl-PL:Dashboard.owner.obp.mobileInfoLinks': 'Shares come from the official business link card, and link taps count Google review, Instagram, Facebook, and website visits from the public OBP.',
  'pl-PL:Dashboard.owner.ownerActions.items.placeCustomerLink.descriptionUnplaced': 'Dodaj ten sam link klienta do Google, Instagram, WhatsApp, QR i materiałów drukowanych.',
  'cs-CZ:Dashboard.owner.ownerActions.items.placeCustomerLink.descriptionUnplaced': 'Přidejte stejný zákaznický odkaz na Google, Instagram, WhatsApp, QR a tištěné materiály.',
  'hu-HU:Dashboard.owner.obp.sharedInfo': 'Actions count final OBP clicks on Call, WhatsApp, Directions, Reserve, and Order. Shares come from the official business link card, and link taps count Google review, Instagram, Facebook, and website visits from the public OBP.',
  'sv-SE:Dashboard.owner.ownerActions.items.placeCustomerLink.descriptionUnplaced': 'Lägg till samma kundlänk på Google, Instagram, WhatsApp, QR och tryckt material.',
  'da-DK:Dashboard.owner.ownerActions.items.placeCustomerLink.descriptionUnplaced': 'Føj det samme kundelink til Google, Instagram, WhatsApp, QR og trykte materialer.',
  'fi-FI:Dashboard.owner.obp.sharedInfo': 'Actions count final OBP clicks on Call, WhatsApp, Directions, Reserve, and Order. Shares come from the official business link card, and link taps count Google review, Instagram, Facebook, and website visits from the public OBP.',
  'fi-FI:Dashboard.owner.ownerActions.items.placeCustomerLink.descriptionUnplaced': 'Lisää sama asiakaslinkki palveluihin Google, Instagram ja WhatsApp sekä QR-koodiin ja painettuihin materiaaleihin.',
  'fil-PH:Dashboard.owner.ownerActions.items.placeCustomerLink.descriptionUnplaced': 'Idagdag ang parehong link para sa customer sa Google, Instagram, WhatsApp, QR, at mga naka-print na materyal.',
  'fa-IR:Dashboard.owner.obp.mobileInfoLinks': 'Shares come from the official business link card, and link taps count Google review, Instagram, Facebook, and website visits from the public OBP.',
  'sw-KE:Dashboard.owner.ownerActions.items.placeCustomerLink.descriptionUnplaced': 'Ongeza kiungo kilekile cha wateja kwenye Google, Instagram, WhatsApp, QR na machapisho.',
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
  'id-ID:Dashboard.owner.actionPlan.localizedActions.timing.title': 'Tinjau waktu menu',
  'fa-IR:Dashboard.owner.hoursNudge.brokenTitle': 'ساعات باید به‌روزرسانی شوند',
  'ja-JP:Dashboard.owner.businessHealth.summary.needs_review.message': '公開情報を確認する必要があります。',
  'ja-JP:Dashboard.owner.publicTruthStatus.updated.daysAgo': '{count, plural, one {前日に更新} other {#日前に更新}}',
  'ja-JP:Dashboard.owner.ownerActions.placement.daysAgo': '{count, plural, one {前日に確認} other {#日前に確認}}',
  'hi-IN:Dashboard.owner.businessHealth.periods.thisMonth': 'इस महीने',
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
  'ar-SA::Graphs': 'الرسوم البيانية',
  'cs-CZ::Graphs': 'Grafy',
  'da-DK::Graphs': 'Grafer',
  'de-DE::Graphs': 'Diagramme',
  'el-GR::Graphs': 'Γραφήματα',
  'es-ES::Graphs': 'Gráficos',
  'fa-IR::Graphs': 'نمودارها',
  'fi-FI::Graphs': 'Kaaviot',
  'fil-PH::Graphs': 'Mga graph',
  'fr-FR::Graphs': 'Graphiques',
  'he-IL::Graphs': 'גרפים',
  'hu-HU::Graphs': 'Grafikonok',
  'id-ID::Graphs': 'Grafik',
  'it-IT::Graphs': 'Grafici',
  'ja-JP::Graphs': 'グラフ',
  'ko-KR::Graphs': '그래프',
  'ms-MY::Graphs': 'Graf',
  'nl-NL::Graphs': 'Grafieken',
  'pl-PL::Graphs': 'Wykresy',
  'pt-BR::Graphs': 'Gráficos',
  'ro-RO::Graphs': 'Grafice',
  'sv-SE::Graphs': 'Diagram',
  'sw-KE::Graphs': 'Grafu',
  'th-TH::Graphs': 'กราฟ',
  'tr-TR::Graphs': 'Grafikler',
  'uk-UA::Graphs': 'Графіки',
  'vi-VN::Graphs': 'Biểu đồ',
  'zh-CN::Graphs': '图表',
  'zh-TW::Graphs': '圖表',
  'ar-SA::Live': 'مباشر',
  'cs-CZ::Live': 'Aktivní',
  'da-DK::Live': 'Aktiv',
  'de-DE::Live': 'Live',
  'el-GR::Live': 'Ζωντανά',
  'es-ES::Live': 'En vivo',
  'fa-IR::Live': 'فعال',
  'fi-FI::Live': 'Julkaistu',
  'fil-PH::Live': 'Live',
  'fr-FR::Live': 'En ligne',
  'he-IL::Live': 'פעיל',
  'hu-HU::Live': 'Élő',
  'id-ID::Live': 'Aktif',
  'it-IT::Live': 'Online',
  'ja-JP::Live': '公開中',
  'ko-KR::Live': '게시됨',
  'ms-MY::Live': 'Aktif',
  'nl-NL::Live': 'Live',
  'pl-PL::Live': 'Opublikowano',
  'pt-BR::Live': 'No ar',
  'ro-RO::Live': 'Publicat',
  'sv-SE::Live': 'Publicerad',
  'sw-KE::Live': 'Imechapishwa',
  'th-TH::Live': 'เผยแพร่แล้ว',
  'tr-TR::Live': 'Yayında',
  'uk-UA::Live': 'Опубліковано',
  'vi-VN::Live': 'Đang hiển thị',
  'zh-CN::Live': '已上线',
  'zh-TW::Live': '已上線',
  'ar-SA::Set': 'تم الضبط',
  'cs-CZ::Set': 'Nastaveno',
  'da-DK::Set': 'Angivet',
  'de-DE::Set': 'Festgelegt',
  'el-GR::Set': 'Ορίστηκε',
  'es-ES::Set': 'Configurado',
  'fa-IR::Set': 'تنظیم شد',
  'fi-FI::Set': 'Asetettu',
  'fil-PH::Set': 'Nakatakda',
  'fr-FR::Set': 'Défini',
  'he-IL::Set': 'הוגדר',
  'hu-HU::Set': 'Beállítva',
  'id-ID::Set': 'Diatur',
  'it-IT::Set': 'Impostato',
  'ja-JP::Set': '設定済み',
  'ko-KR::Set': '설정됨',
  'ms-MY::Set': 'Ditetapkan',
  'nl-NL::Set': 'Ingesteld',
  'pl-PL::Set': 'Ustawiono',
  'pt-BR::Set': 'Definido',
  'ro-RO::Set': 'Setat',
  'sv-SE::Set': 'Angivet',
  'sw-KE::Set': 'Imewekwa',
  'th-TH::Set': 'ตั้งค่าแล้ว',
  'tr-TR::Set': 'Ayarlandı',
  'uk-UA::Set': 'Налаштовано',
  'vi-VN::Set': 'Đã thiết lập',
  'zh-CN::Set': '已设置',
  'zh-TW::Set': '已設定',
  'ar-SA::Steady': 'مستقر',
  'cs-CZ::Steady': 'Stabilní',
  'da-DK::Steady': 'Stabil',
  'de-DE::Steady': 'Stabil',
  'el-GR::Steady': 'Σταθερά',
  'es-ES::Steady': 'Estable',
  'fa-IR::Steady': 'ثابت',
  'fi-FI::Steady': 'Vakaa',
  'fil-PH::Steady': 'Matatag',
  'fr-FR::Steady': 'Stable',
  'he-IL::Steady': 'יציב',
  'hu-HU::Steady': 'Stabil',
  'id-ID::Steady': 'Stabil',
  'it-IT::Steady': 'Stabile',
  'ja-JP::Steady': '安定',
  'ko-KR::Steady': '안정적',
  'ms-MY::Steady': 'Stabil',
  'nl-NL::Steady': 'Stabiel',
  'pl-PL::Steady': 'Stabilnie',
  'pt-BR::Steady': 'Estável',
  'ro-RO::Steady': 'Stabil',
  'sv-SE::Steady': 'Stabil',
  'sw-KE::Steady': 'Imara',
  'th-TH::Steady': 'คงที่',
  'tr-TR::Steady': 'Sabit',
  'uk-UA::Steady': 'Стабільно',
  'vi-VN::Steady': 'Ổn định',
  'zh-CN::Steady': '稳定',
  'zh-TW::Steady': '穩定',
  'ar-SA::Menu setup': 'إعداد القائمة',
  'cs-CZ::Menu setup': 'Nastavení menu',
  'da-DK::Menu setup': 'Menuopsætning',
  'de-DE::Menu setup': 'Menüeinrichtung',
  'el-GR::Menu setup': 'Ρύθμιση μενού',
  'es-ES::Menu setup': 'Configuración del menú',
  'fa-IR::Menu setup': 'تنظیم منو',
  'fi-FI::Menu setup': 'Valikon määritys',
  'fil-PH::Menu setup': 'Pag-set up ng menu',
  'fr-FR::Menu setup': 'Configuration du menu',
  'he-IL::Menu setup': 'הגדרת תפריט',
  'hu-HU::Menu setup': 'Menü beállítása',
  'id-ID::Menu setup': 'Pengaturan menu',
  'it-IT::Menu setup': 'Configurazione del menu',
  'ja-JP::Menu setup': 'メニュー設定',
  'ko-KR::Menu setup': '메뉴 설정',
  'ms-MY::Menu setup': 'Persediaan menu',
  'nl-NL::Menu setup': 'Menu-instelling',
  'pl-PL::Menu setup': 'Konfiguracja menu',
  'pt-BR::Menu setup': 'Configuração do menu',
  'ro-RO::Menu setup': 'Configurarea meniului',
  'sv-SE::Menu setup': 'Menyinställning',
  'sw-KE::Menu setup': 'Usanidi wa menyu',
  'th-TH::Menu setup': 'การตั้งค่าเมนู',
  'tr-TR::Menu setup': 'Menü kurulumu',
  'uk-UA::Menu setup': 'Налаштування меню',
  'vi-VN::Menu setup': 'Thiết lập thực đơn',
  'zh-CN::Menu setup': '菜单设置',
  'zh-TW::Menu setup': '選單設定',
  'es-ES::Saving...': 'Guardando...',
  'es-ES::SEO & Analytics': 'SEO y analítica',
  'fr-FR::Google Maps Link': 'Lien Google Maps',
  'fr-FR::Photo {index}': 'Photo {index}',
  'fr-FR::photo {index}': 'photo {index}',
  'fr-FR::Version {version}': 'Version {version}',
  'fr-FR::Saving...': 'Enregistrement...',
  'fr-FR::SEO & Analytics': 'SEO et analytique',
  'fr-FR::Menu': 'Menu',
  'fr-FR::Conversion': 'Conversion',
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
  'id-ID::Desktop': 'Desktop',
  'vi-VN::POS / ordering / website': 'POS / đặt món / trang web',
  'ms-MY::POS / ordering / website': 'POS / pesanan / laman web',
  'ms-MY::Menu PDF': 'PDF menu',
  'nl-NL::POS / ordering / website': 'POS / bestellen / website',
  'nl-NL::Token Credits (Audit)': 'Tokencredits (audit)',
  'nl-NL::Feedback QR': 'Feedback-QR',
  'nl-NL::Saving...': 'Opslaan...',
  'nl-NL::SEO & Analytics': 'SEO en analyses',
  'nl-NL::Filters': 'Filters',
  'nl-NL::Website': 'Website',
  'nl-NL::QR code': 'QR code',
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
const DASHBOARD_ONLY_MANUAL_SOURCE_VALUES = new Set([
  'Graphs',
  'Live',
  'Menu setup',
  'Set',
  'Steady',
]);
const DASHBOARD_TERM_OVERRIDES = Object.freeze({
  'ar-SA': { 'This week': 'هذا الأسبوع', 'Last week': 'الأسبوع الماضي', 'This month': 'هذا الشهر', 'Last month': 'الشهر الماضي', 'Last 7 days': 'آخر 7 أيام', 'Last 30 days': 'آخر 30 يومًا', 'Latest activity': 'أحدث نشاط', 'Top demand': 'أعلى طلب', 'Review availability': 'مراجعة التوفر', Taps: 'نقرات' },
  'cs-CZ': { 'This week': 'Tento týden', 'Last week': 'Minulý týden', 'This month': 'Tento měsíc', 'Last month': 'Minulý měsíc', 'Last 7 days': 'Posledních 7 dní', 'Last 30 days': 'Posledních 30 dní', 'Latest activity': 'Nejnovější aktivita', 'Top demand': 'Nejvyšší zájem', 'Review availability': 'Zkontrolovat dostupnost', Taps: 'Klepnutí' },
  'da-DK': { 'This week': 'Denne uge', 'Last week': 'Sidste uge', 'This month': 'Denne måned', 'Last month': 'Sidste måned', 'Last 7 days': 'Seneste 7 dage', 'Last 30 days': 'Seneste 30 dage', 'Latest activity': 'Seneste aktivitet', 'Top demand': 'Størst efterspørgsel', 'Review availability': 'Gennemgå tilgængelighed', Taps: 'Tryk' },
  'de-DE': { 'This week': 'Diese Woche', 'Last week': 'Letzte Woche', 'This month': 'Diesen Monat', 'Last month': 'Letzter Monat', 'Last 7 days': 'Letzte 7 Tage', 'Last 30 days': 'Letzte 30 Tage', 'Latest activity': 'Letzte Aktivität', 'Top demand': 'Höchste Nachfrage', 'Review availability': 'Verfügbarkeit prüfen', Taps: 'Antippen' },
  'el-GR': { 'This week': 'Αυτή την εβδομάδα', 'Last week': 'Προηγούμενη εβδομάδα', 'This month': 'Αυτόν τον μήνα', 'Last month': 'Προηγούμενος μήνας', 'Last 7 days': 'Τελευταίες 7 ημέρες', 'Last 30 days': 'Τελευταίες 30 ημέρες', 'Latest activity': 'Τελευταία δραστηριότητα', 'Top demand': 'Υψηλότερη ζήτηση', 'Review availability': 'Έλεγχος διαθεσιμότητας', Taps: 'Πατήματα' },
  'es-ES': { 'This week': 'Esta semana', 'Last week': 'La semana pasada', 'This month': 'Este mes', 'Last month': 'El mes pasado', 'Last 7 days': 'Últimos 7 días', 'Last 30 days': 'Últimos 30 días', 'Latest activity': 'Actividad más reciente', 'Top demand': 'Mayor demanda', 'Review availability': 'Revisar disponibilidad', Taps: 'Toques' },
  'fa-IR': { 'This week': 'این هفته', 'Last week': 'هفته گذشته', 'This month': 'این ماه', 'Last month': 'ماه گذشته', 'Last 7 days': '۷ روز گذشته', 'Last 30 days': '۳۰ روز گذشته', 'Latest activity': 'آخرین فعالیت', 'Top demand': 'بیشترین تقاضا', 'Review availability': 'بررسی موجود بودن', Taps: 'ضربه‌ها' },
  'fi-FI': { 'This week': 'Tämä viikko', 'Last week': 'Viime viikko', 'This month': 'Tämä kuukausi', 'Last month': 'Viime kuukausi', 'Last 7 days': 'Viimeiset 7 päivää', 'Last 30 days': 'Viimeiset 30 päivää', 'Latest activity': 'Viimeisin toiminta', 'Top demand': 'Suurin kysyntä', 'Review availability': 'Tarkista saatavuus', Taps: 'Napautukset' },
  'fil-PH': { 'This week': 'Ngayong linggo', 'Last week': 'Nakaraang linggo', 'This month': 'Ngayong buwan', 'Last month': 'Nakaraang buwan', 'Last 7 days': 'Huling 7 araw', 'Last 30 days': 'Huling 30 araw', 'Latest activity': 'Pinakabagong aktibidad', 'Top demand': 'Pinakamataas na demand', 'Review availability': 'Suriin ang availability', Taps: 'Mga pag-tap' },
  'fr-FR': { 'This week': 'Cette semaine', 'Last week': 'La semaine dernière', 'This month': 'Ce mois-ci', 'Last month': 'Le mois dernier', 'Last 7 days': '7 derniers jours', 'Last 30 days': '30 derniers jours', 'Latest activity': 'Dernière activité', 'Top demand': 'Demande la plus forte', 'Review availability': 'Vérifier la disponibilité', Taps: 'Appuis' },
  'he-IL': { 'This week': 'השבוע', 'Last week': 'בשבוע שעבר', 'This month': 'החודש', 'Last month': 'בחודש שעבר', 'Last 7 days': '7 הימים האחרונים', 'Last 30 days': '30 הימים האחרונים', 'Latest activity': 'פעילות אחרונה', 'Top demand': 'הביקוש הגבוה ביותר', 'Review availability': 'בדיקת זמינות', Taps: 'הקשות' },
  'hu-HU': { 'This week': 'Ezen a héten', 'Last week': 'Múlt héten', 'This month': 'Ebben a hónapban', 'Last month': 'Múlt hónapban', 'Last 7 days': 'Elmúlt 7 nap', 'Last 30 days': 'Elmúlt 30 nap', 'Latest activity': 'Legutóbbi tevékenység', 'Top demand': 'Legnagyobb kereslet', 'Review availability': 'Elérhetőség ellenőrzése', Taps: 'Koppintások' },
  'id-ID': { 'This week': 'Minggu ini', 'Last week': 'Minggu lalu', 'This month': 'Bulan ini', 'Last month': 'Bulan lalu', 'Last 7 days': '7 hari terakhir', 'Last 30 days': '30 hari terakhir', 'Latest activity': 'Aktivitas terbaru', 'Top demand': 'Permintaan tertinggi', 'Review availability': 'Tinjau ketersediaan', Taps: 'Ketukan' },
  'it-IT': { 'This week': 'Questa settimana', 'Last week': 'Settimana scorsa', 'This month': 'Questo mese', 'Last month': 'Mese scorso', 'Last 7 days': 'Ultimi 7 giorni', 'Last 30 days': 'Ultimi 30 giorni', 'Latest activity': 'Attività recente', 'Top demand': 'Domanda più alta', 'Review availability': 'Verifica disponibilità', Taps: 'Tocchi' },
  'ja-JP': { 'This week': '今週', 'Last week': '先週', 'This month': '今月', 'Last month': '先月', 'Last 7 days': '過去7日間', 'Last 30 days': '過去30日間', 'Latest activity': '最新のアクティビティ', 'Top demand': '最も高い需要', 'Review availability': '提供状況を確認', Taps: 'タップ' },
  'ko-KR': { 'This week': '이번 주', 'Last week': '지난주', 'This month': '이번 달', 'Last month': '지난달', 'Last 7 days': '최근 7일', 'Last 30 days': '최근 30일', 'Latest activity': '최근 활동', 'Top demand': '가장 높은 수요', 'Review availability': '이용 가능 여부 검토', Taps: '탭' },
  'ms-MY': { 'This week': 'Minggu ini', 'Last week': 'Minggu lalu', 'This month': 'Bulan ini', 'Last month': 'Bulan lalu', 'Last 7 days': '7 hari terakhir', 'Last 30 days': '30 hari terakhir', 'Latest activity': 'Aktiviti terkini', 'Top demand': 'Permintaan tertinggi', 'Review availability': 'Semak ketersediaan', Taps: 'Ketikan' },
  'nl-NL': { 'This week': 'Deze week', 'Last week': 'Vorige week', 'This month': 'Deze maand', 'Last month': 'Vorige maand', 'Last 7 days': 'Afgelopen 7 dagen', 'Last 30 days': 'Afgelopen 30 dagen', 'Latest activity': 'Laatste activiteit', 'Top demand': 'Hoogste vraag', 'Review availability': 'Beschikbaarheid controleren', Taps: 'Tikken' },
  'pl-PL': { 'This week': 'Ten tydzień', 'Last week': 'Poprzedni tydzień', 'This month': 'Ten miesiąc', 'Last month': 'Poprzedni miesiąc', 'Last 7 days': 'Ostatnie 7 dni', 'Last 30 days': 'Ostatnie 30 dni', 'Latest activity': 'Ostatnia aktywność', 'Top demand': 'Największy popyt', 'Review availability': 'Sprawdź dostępność', Taps: 'Dotknięcia' },
  'pt-BR': { 'This week': 'Esta semana', 'Last week': 'Semana passada', 'This month': 'Este mês', 'Last month': 'Mês passado', 'Last 7 days': 'Últimos 7 dias', 'Last 30 days': 'Últimos 30 dias', 'Latest activity': 'Atividade mais recente', 'Top demand': 'Maior demanda', 'Review availability': 'Revisar disponibilidade', Taps: 'Toques' },
  'ro-RO': { 'This week': 'Săptămâna aceasta', 'Last week': 'Săptămâna trecută', 'This month': 'Luna aceasta', 'Last month': 'Luna trecută', 'Last 7 days': 'Ultimele 7 zile', 'Last 30 days': 'Ultimele 30 de zile', 'Latest activity': 'Cea mai recentă activitate', 'Top demand': 'Cea mai mare cerere', 'Review availability': 'Verifică disponibilitatea', Taps: 'Atingeri' },
  'sv-SE': { 'This week': 'Denna vecka', 'Last week': 'Förra veckan', 'This month': 'Denna månad', 'Last month': 'Förra månaden', 'Last 7 days': 'Senaste 7 dagarna', 'Last 30 days': 'Senaste 30 dagarna', 'Latest activity': 'Senaste aktivitet', 'Top demand': 'Högst efterfrågan', 'Review availability': 'Kontrollera tillgänglighet', Taps: 'Tryck' },
  'sw-KE': { 'This week': 'Wiki hii', 'Last week': 'Wiki iliyopita', 'This month': 'Mwezi huu', 'Last month': 'Mwezi uliopita', 'Last 7 days': 'Siku 7 zilizopita', 'Last 30 days': 'Siku 30 zilizopita', 'Latest activity': 'Shughuli ya hivi karibuni', 'Top demand': 'Mahitaji makubwa zaidi', 'Review availability': 'Kagua upatikanaji', Taps: 'Miguso' },
  'th-TH': { 'This week': 'สัปดาห์นี้', 'Last week': 'สัปดาห์ที่แล้ว', 'This month': 'เดือนนี้', 'Last month': 'เดือนที่แล้ว', 'Last 7 days': '7 วันที่ผ่านมา', 'Last 30 days': '30 วันที่ผ่านมา', 'Latest activity': 'กิจกรรมล่าสุด', 'Top demand': 'ความต้องการสูงสุด', 'Review availability': 'ตรวจสอบความพร้อมให้บริการ', Taps: 'การแตะ' },
  'tr-TR': { 'This week': 'Bu hafta', 'Last week': 'Geçen hafta', 'This month': 'Bu ay', 'Last month': 'Geçen ay', 'Last 7 days': 'Son 7 gün', 'Last 30 days': 'Son 30 gün', 'Latest activity': 'Son etkinlik', 'Top demand': 'En yüksek talep', 'Review availability': 'Kullanılabilirliği kontrol et', Taps: 'Dokunmalar' },
  'uk-UA': { 'This week': 'Цього тижня', 'Last week': 'Минулого тижня', 'This month': 'Цього місяця', 'Last month': 'Минулого місяця', 'Last 7 days': 'Останні 7 днів', 'Last 30 days': 'Останні 30 днів', 'Latest activity': 'Остання активність', 'Top demand': 'Найвищий попит', 'Review availability': 'Перевірити доступність', Taps: 'Натискання' },
  'vi-VN': { 'This week': 'Tuần này', 'Last week': 'Tuần trước', 'This month': 'Tháng này', 'Last month': 'Tháng trước', 'Last 7 days': '7 ngày qua', 'Last 30 days': '30 ngày qua', 'Latest activity': 'Hoạt động gần nhất', 'Top demand': 'Nhu cầu cao nhất', 'Review availability': 'Kiểm tra tình trạng còn hàng', Taps: 'Lượt nhấn' },
  'zh-CN': { 'This week': '本周', 'Last week': '上周', 'This month': '本月', 'Last month': '上月', 'Last 7 days': '过去 7 天', 'Last 30 days': '过去 30 天', 'Latest activity': '最新活动', 'Top demand': '最高需求', 'Review availability': '检查供应情况', Taps: '点击' },
  'zh-TW': { 'This week': '本週', 'Last week': '上週', 'This month': '本月', 'Last month': '上月', 'Last 7 days': '過去 7 天', 'Last 30 days': '過去 30 天', 'Latest activity': '最新活動', 'Top demand': '最高需求', 'Review availability': '檢查供應情況', Taps: '點擊' },
});
const DASHBOARD_COMPACT_TERM_OVERRIDES = Object.freeze({
  'ar-SA': { '7 days': '7 أيام', '30 days': '30 يومًا', 'Item taps': 'نقرات العناصر', 'Update prices': 'تحديث الأسعار', 'Review details': 'مراجعة التفاصيل', 'Publish menu': 'نشر القائمة', 'Create menu': 'إنشاء قائمة', 'High priority': 'أولوية عالية', 'Medium priority': 'أولوية متوسطة', 'Low priority': 'أولوية منخفضة' },
  'cs-CZ': { '7 days': '7 dní', '30 days': '30 dní', 'Item taps': 'Klepnutí na položky', 'Update prices': 'Aktualizovat ceny', 'Review details': 'Zkontrolovat podrobnosti', 'Publish menu': 'Publikovat menu', 'Create menu': 'Vytvořit menu', 'High priority': 'Vysoká priorita', 'Medium priority': 'Střední priorita', 'Low priority': 'Nízká priorita' },
  'da-DK': { '7 days': '7 dage', '30 days': '30 dage', 'Item taps': 'Tryk på varer', 'Update prices': 'Opdater priser', 'Review details': 'Gennemgå detaljer', 'Publish menu': 'Udgiv menu', 'Create menu': 'Opret menu', 'High priority': 'Høj prioritet', 'Medium priority': 'Mellem prioritet', 'Low priority': 'Lav prioritet' },
  'de-DE': { '7 days': '7 Tage', '30 days': '30 Tage', 'Item taps': 'Tippen auf Artikel', 'Update prices': 'Preise aktualisieren', 'Review details': 'Details prüfen', 'Publish menu': 'Menü veröffentlichen', 'Create menu': 'Menü erstellen', 'High priority': 'Hohe Priorität', 'Medium priority': 'Mittlere Priorität', 'Low priority': 'Niedrige Priorität' },
  'el-GR': { '7 days': '7 ημέρες', '30 days': '30 ημέρες', 'Item taps': 'Πατήματα σε στοιχεία', 'Update prices': 'Ενημέρωση τιμών', 'Review details': 'Έλεγχος λεπτομερειών', 'Publish menu': 'Δημοσίευση μενού', 'Create menu': 'Δημιουργία μενού', 'High priority': 'Υψηλή προτεραιότητα', 'Medium priority': 'Μεσαία προτεραιότητα', 'Low priority': 'Χαμηλή προτεραιότητα' },
  'es-ES': { '7 days': '7 días', '30 days': '30 días', 'Item taps': 'Toques en artículos', 'Update prices': 'Actualizar precios', 'Review details': 'Revisar detalles', 'Publish menu': 'Publicar menú', 'Create menu': 'Crear menú', 'High priority': 'Prioridad alta', 'Medium priority': 'Prioridad media', 'Low priority': 'Prioridad baja' },
  'fa-IR': { '7 days': '۷ روز', '30 days': '۳۰ روز', 'Item taps': 'ضربه‌های روی موارد', 'Update prices': 'به‌روزرسانی قیمت‌ها', 'Review details': 'بررسی جزئیات', 'Publish menu': 'انتشار منو', 'Create menu': 'ایجاد منو', 'High priority': 'اولویت بالا', 'Medium priority': 'اولویت متوسط', 'Low priority': 'اولویت پایین' },
  'fi-FI': { '7 days': '7 päivää', '30 days': '30 päivää', 'Item taps': 'Tuotenapautukset', 'Update prices': 'Päivitä hinnat', 'Review details': 'Tarkista tiedot', 'Publish menu': 'Julkaise menu', 'Create menu': 'Luo menu', 'High priority': 'Korkea prioriteetti', 'Medium priority': 'Keskitasoinen prioriteetti', 'Low priority': 'Matala prioriteetti' },
  'fil-PH': { '7 days': '7 araw', '30 days': '30 araw', 'Item taps': 'Mga pag-tap sa item', 'Update prices': 'I-update ang mga presyo', 'Review details': 'Suriin ang mga detalye', 'Publish menu': 'I-publish ang menu', 'Create menu': 'Gumawa ng menu', 'High priority': 'Mataas na priyoridad', 'Medium priority': 'Katamtamang priyoridad', 'Low priority': 'Mababang priyoridad' },
  'fr-FR': { '7 days': '7 jours', '30 days': '30 jours', 'Item taps': 'Appuis sur les articles', 'Update prices': 'Mettre à jour les prix', 'Review details': 'Vérifier les détails', 'Publish menu': 'Publier le menu', 'Create menu': 'Créer le menu', 'High priority': 'Priorité élevée', 'Medium priority': 'Priorité moyenne', 'Low priority': 'Priorité faible' },
  'he-IL': { '7 days': '7 ימים', '30 days': '30 ימים', 'Item taps': 'הקשות על פריטים', 'Update prices': 'עדכון מחירים', 'Review details': 'בדיקת פרטים', 'Publish menu': 'פרסום התפריט', 'Create menu': 'יצירת תפריט', 'High priority': 'עדיפות גבוהה', 'Medium priority': 'עדיפות בינונית', 'Low priority': 'עדיפות נמוכה' },
  'hu-HU': { '7 days': '7 nap', '30 days': '30 nap', 'Item taps': 'Elemkoppintások', 'Update prices': 'Árak frissítése', 'Review details': 'Részletek ellenőrzése', 'Publish menu': 'Menü közzététele', 'Create menu': 'Menü létrehozása', 'High priority': 'Magas prioritás', 'Medium priority': 'Közepes prioritás', 'Low priority': 'Alacsony prioritás' },
  'id-ID': { '7 days': '7 hari', '30 days': '30 hari', 'Item taps': 'Ketukan item', 'Update prices': 'Perbarui harga', 'Review details': 'Tinjau detail', 'Publish menu': 'Publikasikan menu', 'Create menu': 'Buat menu', 'High priority': 'Prioritas tinggi', 'Medium priority': 'Prioritas sedang', 'Low priority': 'Prioritas rendah' },
  'it-IT': { '7 days': '7 giorni', '30 days': '30 giorni', 'Item taps': 'Tocchi sugli articoli', 'Update prices': 'Aggiorna prezzi', 'Review details': 'Controlla dettagli', 'Publish menu': 'Pubblica menu', 'Create menu': 'Crea menu', 'High priority': 'Priorità alta', 'Medium priority': 'Priorità media', 'Low priority': 'Priorità bassa' },
  'ja-JP': { '7 days': '7日', '30 days': '30日', 'Item taps': 'アイテムのタップ', 'Update prices': '価格を更新', 'Review details': '詳細を確認', 'Publish menu': 'メニューを公開', 'Create menu': 'メニューを作成', 'High priority': '優先度：高', 'Medium priority': '優先度：中', 'Low priority': '優先度：低' },
  'ko-KR': { '7 days': '7일', '30 days': '30일', 'Item taps': '항목 탭', 'Update prices': '가격 업데이트', 'Review details': '세부 정보 검토', 'Publish menu': '메뉴 게시', 'Create menu': '메뉴 만들기', 'High priority': '높은 우선순위', 'Medium priority': '중간 우선순위', 'Low priority': '낮은 우선순위' },
  'ms-MY': { '7 days': '7 hari', '30 days': '30 hari', 'Item taps': 'Ketikan item', 'Update prices': 'Kemas kini harga', 'Review details': 'Semak butiran', 'Publish menu': 'Terbitkan menu', 'Create menu': 'Cipta menu', 'High priority': 'Keutamaan tinggi', 'Medium priority': 'Keutamaan sederhana', 'Low priority': 'Keutamaan rendah' },
  'nl-NL': { '7 days': '7 dagen', '30 days': '30 dagen', 'Item taps': 'Tikken op items', 'Update prices': 'Prijzen bijwerken', 'Review details': 'Details controleren', 'Publish menu': 'Menu publiceren', 'Create menu': 'Menu maken', 'High priority': 'Hoge prioriteit', 'Medium priority': 'Gemiddelde prioriteit', 'Low priority': 'Lage prioriteit' },
  'pl-PL': { '7 days': '7 dni', '30 days': '30 dni', 'Item taps': 'Kliknięcia pozycji', 'Update prices': 'Aktualizuj ceny', 'Review details': 'Sprawdź szczegóły', 'Publish menu': 'Opublikuj menu', 'Create menu': 'Utwórz menu', 'High priority': 'Wysoki priorytet', 'Medium priority': 'Średni priorytet', 'Low priority': 'Niski priorytet' },
  'pt-BR': { '7 days': '7 dias', '30 days': '30 dias', 'Item taps': 'Toques em itens', 'Update prices': 'Atualizar preços', 'Review details': 'Revisar detalhes', 'Publish menu': 'Publicar menu', 'Create menu': 'Criar menu', 'High priority': 'Prioridade alta', 'Medium priority': 'Prioridade média', 'Low priority': 'Prioridade baixa' },
  'ro-RO': { '7 days': '7 zile', '30 days': '30 de zile', 'Item taps': 'Atingeri pe articole', 'Update prices': 'Actualizează prețurile', 'Review details': 'Verifică detaliile', 'Publish menu': 'Publică meniul', 'Create menu': 'Creează meniu', 'High priority': 'Prioritate ridicată', 'Medium priority': 'Prioritate medie', 'Low priority': 'Prioritate scăzută' },
  'sv-SE': { '7 days': '7 dagar', '30 days': '30 dagar', 'Item taps': 'Tryck på objekt', 'Update prices': 'Uppdatera priser', 'Review details': 'Granska detaljer', 'Publish menu': 'Publicera meny', 'Create menu': 'Skapa meny', 'High priority': 'Hög prioritet', 'Medium priority': 'Medelhög prioritet', 'Low priority': 'Låg prioritet' },
  'sw-KE': { '7 days': 'Siku 7', '30 days': 'Siku 30', 'Item taps': 'Miguso ya bidhaa', 'Update prices': 'Sasisha bei', 'Review details': 'Kagua maelezo', 'Publish menu': 'Chapisha menyu', 'Create menu': 'Unda menyu', 'High priority': 'Kipaumbele cha juu', 'Medium priority': 'Kipaumbele cha kati', 'Low priority': 'Kipaumbele cha chini' },
  'th-TH': { '7 days': '7 วัน', '30 days': '30 วัน', 'Item taps': 'การแตะรายการ', 'Update prices': 'อัปเดตราคา', 'Review details': 'ตรวจสอบรายละเอียด', 'Publish menu': 'เผยแพร่เมนู', 'Create menu': 'สร้างเมนู', 'High priority': 'ลำดับความสำคัญสูง', 'Medium priority': 'ลำดับความสำคัญปานกลาง', 'Low priority': 'ลำดับความสำคัญต่ำ' },
  'tr-TR': { '7 days': '7 gün', '30 days': '30 gün', 'Item taps': 'Öğe dokunmaları', 'Update prices': 'Fiyatları güncelle', 'Review details': 'Ayrıntıları incele', 'Publish menu': 'Menüyü yayınla', 'Create menu': 'Menü oluştur', 'High priority': 'Yüksek öncelik', 'Medium priority': 'Orta öncelik', 'Low priority': 'Düşük öncelik' },
  'uk-UA': { '7 days': '7 днів', '30 days': '30 днів', 'Item taps': 'Натискання на позиції', 'Update prices': 'Оновити ціни', 'Review details': 'Перевірити деталі', 'Publish menu': 'Опублікувати меню', 'Create menu': 'Створити меню', 'High priority': 'Високий пріоритет', 'Medium priority': 'Середній пріоритет', 'Low priority': 'Низький пріоритет' },
  'vi-VN': { '7 days': '7 ngày', '30 days': '30 ngày', 'Item taps': 'Lượt nhấn vào món', 'Update prices': 'Cập nhật giá', 'Review details': 'Kiểm tra chi tiết', 'Publish menu': 'Đăng thực đơn', 'Create menu': 'Tạo thực đơn', 'High priority': 'Ưu tiên cao', 'Medium priority': 'Ưu tiên trung bình', 'Low priority': 'Ưu tiên thấp' },
  'zh-CN': { '7 days': '7 天', '30 days': '30 天', 'Item taps': '商品点击', 'Update prices': '更新价格', 'Review details': '检查详情', 'Publish menu': '发布菜单', 'Create menu': '创建菜单', 'High priority': '高优先级', 'Medium priority': '中优先级', 'Low priority': '低优先级' },
  'zh-TW': { '7 days': '7 天', '30 days': '30 天', 'Item taps': '品項點擊', 'Update prices': '更新價格', 'Review details': '檢查詳情', 'Publish menu': '發布選單', 'Create menu': '建立選單', 'High priority': '高優先順序', 'Medium priority': '中優先順序', 'Low priority': '低優先順序' },
});
const DASHBOARD_SOURCE_FALLBACK_KEYS = Object.freeze({
  'ar-SA': new Set([
    'Dashboard.owner.businessHealth.scope.close',
    'Dashboard.owner.businessHealth.feedback.clear',
    'Dashboard.owner.businessHealth.page.notReady',
    'Dashboard.owner.businessHealth.locations.checkCount',
  ]),
  'da-DK': new Set([
    'Dashboard.owner.businessHealth.locations.checkCount',
  ]),
  'de-DE': new Set([
    'Dashboard.owner.businessHealth.publicTruth.actions.fixFact',
  ]),
  'el-GR': new Set([
    'Dashboard.owner.businessHealth.locations.checkCount',
  ]),
  'fa-IR': new Set([
    'Dashboard.owner.businessHealth.scope.menuCount',
    'Dashboard.owner.businessHealth.locations.checkCount',
  ]),
  'fi-FI': new Set([
    'Dashboard.owner.businessHealth.locations.checkCount',
  ]),
  'fil-PH': new Set([
    'Dashboard.owner.businessHealth.summary.needs_review.headline',
    'Dashboard.owner.businessHealth.scope.menuCount',
    'Dashboard.owner.businessHealth.locations.checkCount',
  ]),
  'he-IL': new Set([
    'Dashboard.owner.businessHealth.locations.checkCount',
    'Dashboard.owner.businessHealth.publicTruth.targetActions.basic_settings',
  ]),
  'hu-HU': new Set([
    'Dashboard.owner.businessHealth.scope.menuCount',
  ]),
  'id-ID': new Set([
    'Dashboard.owner.businessHealth.scope.menuCount',
    'Dashboard.owner.businessHealth.locations.checkCount',
  ]),
  'it-IT': new Set([
    'Dashboard.owner.businessHealth.scope.menuCount',
  ]),
  'ja-JP': new Set([
    'Dashboard.owner.businessHealth.page.desktopSettingsOnly',
  ]),
  'ko-KR': new Set([
    'Dashboard.owner.businessHealth.scope.menuCount',
  ]),
  'ms-MY': new Set([
    'Dashboard.owner.businessHealth.scope.menuCount',
  ]),
  'mni-IN': new Set([
    'Dashboard.owner.weekly.changeVsLastWeek',
    'Dashboard.owner.businessHealth.scope.thisMenuHelper',
    'Dashboard.owner.businessHealth.scope.allMenusHelper',
    'Dashboard.owner.businessHealth.assistant.suggestedUnavailable',
    'Dashboard.owner.businessHealth.assistant.answerError',
    'Dashboard.owner.businessHealth.assistant.send',
    'Dashboard.owner.businessHealth.assistant.questions.feedback_reviews',
    'Dashboard.owner.businessHealth.sources.guestFeedback',
    'Dashboard.owner.businessHealth.publicTruth.modules.customer_faq_reply_pack.description',
    'Dashboard.owner.businessHealth.checks.guest_feedback_needs_attention.action',
    'Dashboard.owner.graph.trend.versus',
    'Dashboard.owner.menuSetup.steps.translationsReady.label',
    'Dashboard.owner.menuQuality.signals.translations.warning',
  ]),
  'nl-NL': new Set([
    'Dashboard.owner.businessHealth.scope.menuCount',
    'Dashboard.owner.businessHealth.locations.checkCount',
  ]),
  'ro-RO': new Set([
    'Dashboard.owner.businessHealth.publicTruth.checking',
  ]),
  'sat-IN': new Set([
    'Dashboard.owner.overall.actionsSummary',
    'Dashboard.owner.weekly.changeVsLastWeek',
    'Dashboard.owner.googleListing.couldNotOpen',
    'Dashboard.owner.businessHealth.checks.guest_feedback_needs_attention.title',
    'Dashboard.owner.businessHealth.page.loadingMessage',
    'Dashboard.owner.businessHealth.page.desktopSettingsOnly',
    'Dashboard.owner.businessHealth.scope.thisMenuHelper',
    'Dashboard.owner.businessHealth.scope.allMenusHelper',
    'Dashboard.owner.businessHealth.assistant.englishOnlyDescription',
    'Dashboard.owner.businessHealth.assistant.suggestedUnavailable',
    'Dashboard.owner.businessHealth.assistant.freeTextUnavailable',
    'Dashboard.owner.businessHealth.assistant.suggestedQuestions',
    'Dashboard.owner.businessHealth.assistant.empty',
    'Dashboard.owner.businessHealth.assistant.send',
    'Dashboard.owner.businessHealth.assistant.questions.profile_status',
    'Dashboard.owner.businessHealth.assistant.questions.feedback_recent',
    'Dashboard.owner.businessHealth.sources.ownerAnalytics',
    'Dashboard.owner.businessHealth.sources.guestFeedback',
    'Dashboard.owner.obp.mobileInfoActions',
    'Dashboard.owner.businessHealth.publicTruth.boundary',
    'Dashboard.owner.businessHealth.publicTruth.status.missing_basics.message',
    'Dashboard.owner.businessHealth.publicTruth.evidence.owner_selected',
    'Dashboard.owner.businessHealth.publicTruth.evidence.priceNotLoaded',
    'Dashboard.owner.businessHealth.publicTruth.targetActions.basic_settings',
    'Dashboard.owner.businessHealth.publicTruth.targetActions.domain_settings',
    'Dashboard.owner.businessHealth.publicTruth.targetActions.menu_tab',
    'Dashboard.owner.businessHealth.publicTruth.targetActions.official_page',
    'Dashboard.owner.businessHealth.publicTruth.targetActions.presence_monitor',
    'Dashboard.owner.businessHealth.publicTruth.targetActions.share_tab',
    'Dashboard.owner.businessHealth.publicTruth.actions.openCustomerSource',
    'Dashboard.owner.businessHealth.publicTruth.actions.openShareTools',
    'Dashboard.owner.businessHealth.publicTruth.modules.business_facts_copy_pack.description',
    'Dashboard.owner.businessHealth.publicTruth.modules.social_bio_link_consistency.title',
    'Dashboard.owner.businessHealth.publicTruth.modules.social_bio_link_consistency.description',
    'Dashboard.owner.businessHealth.publicTruth.modules.whatsapp_action_link.description',
    'Dashboard.owner.businessHealth.publicTruth.modules.whatsapp_reply_pack.description',
    'Dashboard.owner.businessHealth.publicTruth.modules.customer_question_coverage.title',
    'Dashboard.owner.businessHealth.publicTruth.modules.customer_question_coverage.description',
    'Dashboard.owner.businessHealth.publicTruth.modules.customer_faq_reply_pack.description',
    'Dashboard.owner.businessHealth.publicTruth.modules.booking_inquiry_readiness.description',
    'Dashboard.owner.businessHealth.publicTruth.modules.google_profile_handoff.title',
    'Dashboard.owner.businessHealth.publicTruth.modules.google_profile_handoff.description',
    'Dashboard.owner.businessHealth.publicTruth.modules.menu_freshness.title',
    'Dashboard.owner.overview.statusMessages.no_data',
    'Dashboard.owner.aiSummary.localized.menuViews',
    'Dashboard.owner.actionPlan.confidence.stable.message',
    'Dashboard.owner.actionPlan.localizedActions.menuOrder.description',
    'Dashboard.owner.menuQuality.signals.categoryIcons.help',
    'Dashboard.owner.menuQuality.signals.priceOutliers.help',
    'Dashboard.owner.menuQuality.signals.projectContent.ok',
    'Dashboard.owner.menuQuality.signals.translations.warning',
    'Dashboard.owner.menuQuality.signals.projectContent.warning',
    'Dashboard.owner.sources.shortcut',
    'Dashboard.owner.businessHealth.checks.guest_feedback_needs_attention.action',
    'Dashboard.owner.businessHealth.checks.guest_feedback_needs_attention.message',
    'Dashboard.owner.businessHealth.feedback.clear',
    'Dashboard.owner.businessHealth.metrics.topDemand',
    'Dashboard.owner.graph.trend.versus',
    'Dashboard.owner.graph.comparison.title',
    'Dashboard.owner.graph.charts.menuTrend.title',
    'Dashboard.owner.graph.charts.customerActions.description',
    'Dashboard.owner.graph.charts.sources.title',
    'Dashboard.owner.graph.charts.items.description',
    'Dashboard.owner.graph.legends.noResult',
    'Dashboard.owner.graph.empty.menuActivity',
    'Dashboard.owner.graph.empty.itemInterest',
    'Dashboard.owner.graph.empty.officialPage',
    'Dashboard.owner.offering.menu.viewsTooltip',
    'Dashboard.owner.offering.product.viewsTooltip',
    'Dashboard.owner.offering.product.thisMonthLabel',
    'Dashboard.owner.offering.service.viewsTooltip',
    'Dashboard.owner.googleListing.updateProfileWebsite',
    'Dashboard.owner.publicTruthStatus.updated.notUpdated',
    'Dashboard.owner.ownerActions.title',
    'Dashboard.owner.ownerActions.items.setCustomerLink.description',
    'Dashboard.owner.ownerActions.items.publishMenu.labelOpen',
    'Dashboard.owner.ownerActions.items.openPrivateFeedback.label',
    'Dashboard.owner.ownerActions.items.openPrivateFeedback.description',
    'Dashboard.owner.ownerActions.items.setTodayStatus.description',
    'Dashboard.owner.ownerActions.items.prepareStaffHandoff.description',
    'Dashboard.owner.ownerActions.items.updatePrices.description',
    'Dashboard.owner.menuSetup.actions.openMenu',
    'Dashboard.owner.menuSetup.actions.openSharingTools',
    'Dashboard.owner.menuSetup.actions.openMenuCheck',
    'Dashboard.owner.menuSetup.steps.sourceAdded.nextDescription',
    'Dashboard.owner.menuSetup.steps.menuImported.label',
    'Dashboard.owner.menuSetup.steps.linkPlaced.nextDescription',
    'Dashboard.owner.menuSetup.steps.translationsReady.label',
  ]),
  'sv-SE': new Set([
    'Dashboard.owner.businessHealth.publicTruth.modules.menu_freshness.title',
  ]),
  'sw-KE': new Set([
    'Dashboard.owner.businessHealth.freshness.latest',
    'Dashboard.owner.businessHealth.freshness.throughDate',
    'Dashboard.owner.businessHealth.locations.checkCount',
  ]),
  'th-TH': new Set([
    'Dashboard.owner.businessHealth.page.desktopSettingsOnly',
    'Dashboard.owner.businessHealth.publicTruth.evidence.not_provided',
  ]),
  'uk-UA': new Set([
    'Dashboard.owner.businessHealth.assistant.send',
    'Dashboard.owner.businessHealth.locations.checkCount',
  ]),
  'vi-VN': new Set([
    'Dashboard.owner.businessHealth.locations.checkCount',
  ]),
  'zh-CN': new Set([
    'Dashboard.owner.businessHealth.checks.no_active_projects.title',
    'Dashboard.owner.businessHealth.checks.no_active_projects.message',
  ]),
  'zh-TW': new Set([
    'Dashboard.owner.businessHealth.checks.no_active_projects.title',
  ]),
});
const DASHBOARD_NATIVE_SCRIPTS = Object.freeze({
  'mni-IN': 'Meetei_Mayek',
  'sat-IN': 'Ol_Chiki',
});
const dashboardNativeScriptPatterns = new Map();

// These dashboard labels already have an established translation elsewhere in
// the checked-in locale pack. Reusing that wording prevents a second machine
// translation from giving the same owner concept a different name.
const DASHBOARD_TRANSLATION_REUSE = Object.freeze({
  'Dashboard.owner.empty.lowActivityTitle': 'MobileDashboard.lowActivity',
  'Dashboard.owner.actionPlan.confidence.stable.label': 'Dashboard.owner.health.states.stable',
  'Dashboard.owner.actionPlan.localizedActions.pricing.action': 'MobileMenu.menuCompletionReviewPrices',
  'Dashboard.owner.details.itemStatus.gettingAttention': 'Dashboard.owner.units.views',
  'Dashboard.owner.sources.menuKit': 'Website.FeatureDetail.printReadyKit.galleryAsset6Title',
  'Dashboard.owner.sources.obp': 'BusinessSettings.publicCustomer.feedback.businessPage',
  'Dashboard.owner.sources.other': 'Billing.cancellationReasons.other',
  'Dashboard.owner.sources.qr': 'Website.Workflow.pipelineQrCode',
  'Dashboard.owner.businessHealth.title': 'MobileDashboard.businessHealth',
  'Dashboard.owner.businessHealth.today': 'MobileDashboard.viewModes.today',
  'Dashboard.owner.businessHealth.noActionNeeded': 'MobileMenuQualitySignals.allClearTitle',
  'Dashboard.owner.businessHealth.status.stable': 'Dashboard.owner.health.states.stable',
  'Dashboard.owner.businessHealth.status.watch': 'MobileMenu.menuCompletionNeedsAttention',
  'Dashboard.owner.businessHealth.status.needs_review': 'MobileIntegrations.needsReview',
  'Dashboard.owner.businessHealth.periods.today': 'MobileDashboard.viewModes.today',
  'Dashboard.owner.businessHealth.periods.yesterday': 'Dashboard.owner.views.yesterday',
  'Dashboard.owner.businessHealth.periods.overall': 'MobileDashboard.viewModes.overall',
  'Dashboard.owner.businessHealth.metrics.menuViews': 'Dashboard.owner.details.metrics.menuViews',
  'Dashboard.owner.graph.metrics.menu_activity': 'Website.FeatureDetail.analytics.journey0Card1Title',
  'Dashboard.owner.graph.metrics.customer_actions': 'Website.Surfaces.surface3Title',
  'Dashboard.owner.graph.charts.customerActions.title': 'Website.Surfaces.surface3Title',
  'Dashboard.owner.graph.legends.actionSessions': 'Dashboard.owner.details.metrics.actionSessions',
  'Dashboard.owner.offering.menu.singular': 'UseMenuList.projectFallback',
  'Dashboard.owner.offering.menu.viewsLabel': 'Dashboard.owner.details.metrics.menuViews',
  'Dashboard.owner.publicTruthStatus.title.needsAttention': 'Dashboard.owner.health.states.watch',
  'Dashboard.owner.publicTruthStatus.states.missing': 'Website.PublicTruthCheckPage.results.missing',
  'Dashboard.owner.publicTruthStatus.states.ready': 'MobileMenu.menuCompletionReady',
  'Dashboard.owner.publicTruthStatus.states.hidden': 'MobileMenu.hidden',
  'Dashboard.owner.publicTruthStatus.updated.today': 'BusinessSettings.publicCustomer.menu.updatedToday',
  'Dashboard.owner.ownerActions.open': 'Common.open',
  'Dashboard.owner.ownerActions.status.ready': 'MobileMenu.menuCompletionReady',
  'Dashboard.owner.ownerActions.status.missing': 'Website.PublicTruthCheckPage.results.missing',
  'Dashboard.owner.ownerActions.status.on': 'Common.on',
  'Dashboard.owner.ownerActions.status.off': 'Common.off',
  'Dashboard.owner.ownerActions.status.stable': 'Dashboard.owner.health.states.stable',
  'Dashboard.owner.ownerActions.items.updatePrices.label': 'MobileMenu.updatePrices',
  'Dashboard.owner.menuSetup.title': 'MobileMenu.menuSetup',
});

const DASHBOARD_SEMANTIC_TRANSLATION_REUSE = Object.freeze({
  'Dashboard.owner.businessHealth.signals.clicks': 'Dashboard.owner.details.metrics.itemTaps',
  'Dashboard.owner.graph.legends.taps': 'Dashboard.owner.details.metrics.itemTaps',
  'Dashboard.owner.publicTruthStatus.states.live': 'MobileProjectSelector.statusActive',
  'Dashboard.owner.ownerActions.status.live': 'MobileProjectSelector.statusActive',
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

function refreshPublicCustomerAudit(evidence, localeMessages) {
  const audit = evidence.publicCustomerSemanticAudit;
  const sourceMessages = localeMessages.get(SOURCE_LOCALE);
  if (!audit || !sourceMessages?.BusinessSettings?.publicCustomer) return;

  const sourcePublicCustomer = flattenStrings(
    sourceMessages.BusinessSettings.publicCustomer,
  );
  const localeAudit = {};

  for (const [locale, messages] of localeMessages) {
    const publicCustomer = flattenStrings(messages.BusinessSettings?.publicCustomer);
    assert(
      publicCustomer.size === sourcePublicCustomer.size,
      `${locale}: public-customer value count changed during owner locale apply`,
    );
    for (const key of sourcePublicCustomer.keys()) {
      assert(
        publicCustomer.has(key),
        `${locale}: public-customer key ${key} is missing during owner locale apply`,
      );
    }

    let sourceEqualValues = 0;
    for (const [key, sourceValue] of sourcePublicCustomer) {
      if (publicCustomer.get(key) === sourceValue) sourceEqualValues += 1;
    }
    localeAudit[locale] = {
      ...(audit.locales?.[locale] || {}),
      publicCustomerValueCount: publicCustomer.size,
      sourceEqualValues,
      publicCustomerSha256: mapDigest(publicCustomer),
    };
  }

  evidence.publicCustomerSemanticAudit = {
    ...audit,
    auditedOn: new Date().toISOString().slice(0, 10),
    sourceLocale: SOURCE_LOCALE,
    sourceMessageCount: sourcePublicCustomer.size,
    localeCount: localeMessages.size,
    translatedLocaleCount: [...localeMessages.keys()]
      .filter((locale) => !ENGLISH_OWNER_LOCALES.has(locale)).length,
    locales: localeAudit,
  };
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

function qualityProviderForLocale(locale) {
  if (INDICTRANS_TARGETS[locale]) return providerForLocale(locale);
  if (M2M100_TARGETS[locale]) {
    return {
      provider: 'm2m100',
      target: M2M100_TARGETS[locale],
    };
  }
  throw new Error(`No semantic quality provider is configured for ${locale}`);
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
    m2m100: {
      model: 'facebook/m2m100_418M',
      revision: '55c2e61bbf05dfb8d7abccdc3fae6fc8512fd636',
      weightSha256: 'd907ea45e4e4b9db163382a6674f6218b3c59566fe06d77f4055c208b4e87ed1',
      license: 'MIT',
      usage: 'local semantic quality repair for MADLAD-400 owner-label anomalies',
      generation: 'beam search 5; no_repeat_ngram_size=3; repetition_penalty=1.1; max_new_tokens=256; token-preserving segment fallback',
    },
  };
}

function assertProviderMetadata(actual) {
  assert(
    isDeepStrictEqual(actual, providerMetadata()),
    'Semantic translation provider metadata does not match the pinned local model contract',
  );
}

function originalSlice(source, element) {
  assert(element.location, `ICU element has no source location in '${source}'`);
  return source.slice(element.location.start.offset, element.location.end.offset);
}

function tokenFor(index, provider) {
  assert(
    provider === 'indictrans2' || provider === 'madlad400' || provider === 'm2m100',
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
  if (sentenceBoundaryCount(sourceValue) > 1) return false;
  if (sentenceBoundaryCount(translatedValue) >= 2) return true;
  const firstSentence = firstCompleteTranslation(translatedValue);
  return Boolean(firstSentence && firstSentence.length < translatedValue.trim().length);
}

function hasLeakedProviderPlaceholder(value) {
  return LEAKED_PROVIDER_PLACEHOLDER_PATTERN.test(value);
}

function protectedTokenCounts(value) {
  const counts = new Map();
  for (const match of value.matchAll(PROTECTED_PATTERN)) {
    counts.set(match[0], (counts.get(match[0]) || 0) + 1);
  }
  return counts;
}

function hasChangedProtectedTokens(sourceValue, translatedValue) {
  const sourceTokens = protectedTokenCounts(sourceValue);
  if (sourceTokens.size === 0) return false;
  const translatedTokens = protectedTokenCounts(translatedValue);
  for (const [token, count] of sourceTokens) {
    if (translatedTokens.get(token) !== count) return true;
  }
  return false;
}

function labelWords(value) {
  return [...value.matchAll(/[\p{L}\p{M}\p{N}]+/gu)]
    .map((match) => match[0]);
}

function normalizedLabelWord(value) {
  const normalized = value
    .normalize('NFC')
    .toLocaleLowerCase();
  // Arabic's definite article should not hide duplicated glossary variants
  // such as "البيانية بيانية".
  return normalized.replace(/^ال(?=\p{L}{3})/u, '');
}

function labelWordStem(value) {
  return normalizedLabelWord(value);
}

function commonPrefixLength(left, right) {
  const limit = Math.min(left.length, right.length);
  let index = 0;
  while (index < limit && left[index] === right[index]) index += 1;
  return index;
}

function hasRepeatedLabelWord(value) {
  const words = labelWords(value).map(normalizedLabelWord);
  for (let index = 1; index < words.length; index += 1) {
    const previous = words[index - 1];
    const current = words[index];
    if (previous === current) return true;
    const previousStem = labelWordStem(previous);
    const currentStem = labelWordStem(current);
    if (previousStem.length >= 3 && previousStem === currentStem) return true;
  }
  return false;
}

function hasRepeatedOpeningLabelWord(value) {
  const words = labelWords(value).map(labelWordStem);
  if (words.length < 3 || words[0].length < 4) return false;
  return words.slice(2).some((word) => {
    return words[0] === word;
  });
}

function hasRepeatedLabelSequence(value) {
  const words = labelWords(value).map(labelWordStem);
  for (let width = 2; width <= Math.min(4, Math.floor(words.length / 2)); width += 1) {
    for (let start = 0; start + width * 2 <= words.length; start += 1) {
      const sequence = words.slice(start, start + width).join('\0');
      for (let next = start + width; next + width <= words.length; next += 1) {
        if (words.slice(next, next + width).join('\0') === sequence) return true;
      }
    }
  }
  return false;
}

function normalizedAsciiLabel(value) {
  return value
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function hasEmbeddedSourcePhrase(sourceValue, translatedValue) {
  const source = normalizedAsciiLabel(sourceValue);
  const translated = normalizedAsciiLabel(translatedValue);
  if (source.split(/\s+/).length < 2 || source.length < 8 || translated === source) return false;
  return translated.includes(source);
}

function hasJoinedCjkAlternatives(sourceValue, translatedValue) {
  if (/[{}]/u.test(sourceValue)) return false;
  const cjk = String.raw`[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]`;
  return new RegExp(`${cjk}[^\\s]*\\s+${cjk}`, 'u').test(translatedValue);
}

function hasNumericArtifact(sourceValue, translatedValue) {
  const sourceNumbers = sourceValue.match(/[0-9]+/gu) || [];
  const translatedNumbers = translatedValue.match(/[0-9]+/gu) || [];
  const remaining = [...sourceNumbers];
  for (const value of translatedNumbers) {
    const index = remaining.indexOf(value);
    if (index < 0) return true;
    remaining.splice(index, 1);
  }
  return false;
}

function normalizeOwnerLocaleValue(locale, key, value) {
  if (
    locale !== 'mni-IN'
    || !key.startsWith('Dashboard.owner.')
    || typeof value !== 'string'
  ) return value;
  return value.replace(/\s*꯭\s*/gu, '꯭');
}

function hasDashboardScriptCorruption(locale, value) {
  const script = DASHBOARD_NATIVE_SCRIPTS[locale];
  if (!script || typeof value !== 'string') return false;
  if (!dashboardNativeScriptPatterns.has(locale)) {
    dashboardNativeScriptPatterns.set(
      locale,
      new RegExp(
        `[^\\p{Script=${script}}\\p{Script=Latin}\\p{N}\\p{M}\\p{P}\\p{S}\\p{Z}\\p{Cf}]`,
        'u',
      ),
    );
  }
  return dashboardNativeScriptPatterns.get(locale).test(value);
}

function hasSuspiciousShortLabelExpansion(sourceValue, translatedValue) {
  const sourceLength = [...sourceValue].length;
  const repetitionScope = sourceLength < 40 && labelWords(translatedValue).length <= 12;
  if (repetitionScope && (
    hasRepeatedLabelWord(translatedValue)
    && !hasRepeatedLabelWord(sourceValue)
  )) return true;
  if (repetitionScope && (
    hasRepeatedOpeningLabelWord(translatedValue)
    && !hasRepeatedOpeningLabelWord(sourceValue)
  )) return true;
  if (repetitionScope && (
    hasRepeatedLabelSequence(translatedValue)
    && !hasRepeatedLabelSequence(sourceValue)
  )) return true;
  if (hasEmbeddedSourcePhrase(sourceValue, translatedValue)) return true;
  if (hasJoinedCjkAlternatives(sourceValue, translatedValue)) return true;
  if (sourceLength >= SHORT_LABEL_MAX_SOURCE_LENGTH) return false;

  const lengthRatio = translationLengthRatio(sourceValue, translatedValue);
  const sourceWords = labelWords(sourceValue);
  const translatedWords = labelWords(translatedValue);
  const translatedLooksLikeSentence = /[.!?。！？؟]\s*$/u.test(translatedValue);
  return (
    [...translatedValue].length > Math.max(24, sourceLength * MAX_SHORT_LABEL_LENGTH_RATIO)
    || (
      !/[{}]/u.test(sourceValue)
      // Compact English labels can require articles, auxiliaries, and
      // agreement in the target language. Treat only a materially larger
      // expansion as suspicious; repetition and sentence checks above still
      // catch the common model-failure shapes.
      && translatedWords.length > Math.max(sourceWords.length + 4, sourceWords.length * 3)
    )
    || (
      lengthRatio > MAX_TRANSLATION_LENGTH_RATIO
      && /[,;:，、؛：.!?。！？؟]/u.test(translatedValue)
    )
    || (
      sentenceBoundaryCount(sourceValue) === 0
      && translatedLooksLikeSentence
      && translatedWords.length > sourceWords.length + 1
    )
    || (
      sentenceBoundaryCount(sourceValue) === 0
      && translatedLooksLikeSentence
      && /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(translatedValue)
    )
  );
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
    const provider = qualityProviderForLocale(locale);
    const messages = readJson(localePath(locale));
    const qualityEntries = [];
    const usedUnits = new Set();

    for (const [key, sourceValue] of sourceOwner) {
      const currentValue = getByPath(messages, key);
      const normalizedCurrentValue = normalizeOwnerLocaleValue(locale, key, currentValue);
      const hasOrthographyArtifact = normalizedCurrentValue !== currentValue;
      const isDashboardOwnerKey = key.startsWith('Dashboard.owner.');
      const hasScriptCorruption = isDashboardOwnerKey
        && hasDashboardScriptCorruption(locale, currentValue);
      const isPublicCustomerKey = key.startsWith('BusinessSettings.publicCustomer.');
      const lengthRatio = typeof currentValue === 'string'
        ? translationLengthRatio(sourceValue, currentValue)
        : 1;
      const manualOverride = getManualQualityOverride(locale, key, sourceValue);
      const requiredManualOverride = getRequiredManualQualityOverride(
        locale,
        key,
        sourceValue,
      );
      if (
        typeof currentValue === 'string'
        && typeof requiredManualOverride === 'string'
        && currentValue === requiredManualOverride
        && !hasOrthographyArtifact
        && !hasScriptCorruption
      ) {
        continue;
      }
      const untranslatedResidue = currentValue === sourceValue
        && /[A-Za-z]/.test(sourceValue)
        && !isProtectedInvariant(sourceValue)
        && !isReviewedExactOverride(locale, key, sourceValue);
      const usesIndicQualityProvider = provider.provider === 'indictrans2';
      const unexpectedSentenceExpansion = !usesIndicQualityProvider
        && (isDashboardOwnerKey || isPublicCustomerKey)
        && typeof currentValue === 'string'
        && hasUnexpectedSentenceExpansion(sourceValue, currentValue);
      const suspiciousShortLabelExpansion = !usesIndicQualityProvider
        && isDashboardOwnerKey
        && typeof currentValue === 'string'
        && hasSuspiciousShortLabelExpansion(sourceValue, currentValue);
      const leakedProviderPlaceholder = (isDashboardOwnerKey || isPublicCustomerKey)
        && typeof currentValue === 'string'
        && hasLeakedProviderPlaceholder(currentValue);
      const introducedNumericArtifact = isDashboardOwnerKey
        && typeof currentValue === 'string'
        && hasNumericArtifact(sourceValue, currentValue);
      const changedProtectedInvariant = isDashboardOwnerKey
        && typeof currentValue === 'string'
        && isProtectedInvariant(sourceValue)
        && currentValue !== sourceValue;
      const changedProtectedTokens = (isDashboardOwnerKey || isPublicCustomerKey)
        && typeof currentValue === 'string'
        && hasChangedProtectedTokens(sourceValue, currentValue);
      const differsFromManualOverride = typeof requiredManualOverride === 'string'
        && currentValue !== requiredManualOverride;
      if (
        typeof currentValue !== 'string'
        || (
          !untranslatedResidue
          && !unexpectedSentenceExpansion
          && !suspiciousShortLabelExpansion
          && !leakedProviderPlaceholder
          && !introducedNumericArtifact
          && !changedProtectedInvariant
          && !changedProtectedTokens
          && !differsFromManualOverride
          && !hasOrthographyArtifact
          && !hasScriptCorruption
          && [...sourceValue].length < 20
        )
        || (
          !untranslatedResidue
          && !unexpectedSentenceExpansion
          && !suspiciousShortLabelExpansion
          && !leakedProviderPlaceholder
          && !introducedNumericArtifact
          && !changedProtectedInvariant
          && !changedProtectedTokens
          && !differsFromManualOverride
          && !hasOrthographyArtifact
          && !hasScriptCorruption
          &&
          lengthRatio >= MIN_TRANSLATION_LENGTH_RATIO
          && lengthRatio <= MAX_TRANSLATION_LENGTH_RATIO
        )
      ) {
        continue;
      }

      if (!manualOverride && !hasOrthographyArtifact) {
        const planKey = `${provider.provider}\0${sourceValue}`;
        if (!plans.has(planKey)) {
          plans.set(
            planKey,
            compileMessage(sourceValue, registerUnit, provider.provider),
          );
        }
        collectUnitIds(plans.get(planKey), usedUnits);
      }
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
      trigger: `translated/source Unicode length ratio outside ${MIN_TRANSLATION_LENGTH_RATIO}-${MAX_TRANSLATION_LENGTH_RATIO}, exact non-invariant English residue, duplicated or sentence-expanded dashboard label, changed protected dashboard term, invented dashboard number, mixed native-script output, invalid locale orthography, unexpected extra sentence, or leaked provider placeholder`,
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

function beforeRepeatedOpeningStem(value) {
  const words = [...value.matchAll(/[\p{L}\p{M}\p{N}]+/gu)];
  if (words.length < 2) return null;
  const opening = labelWordStem(words[0][0]);
  const repeated = words.slice(1).find((word) => {
    const candidate = labelWordStem(word[0]);
    const shorterLength = Math.min(opening.length, candidate.length);
    return opening === candidate || (
      shorterLength >= 5
      && commonPrefixLength(opening, candidate) >= Math.max(4, Math.floor(shorterLength * 0.7))
    );
  });
  return repeated ? value.slice(0, repeated.index).trim() : null;
}

function beforeClauseSeparator(value) {
  const separator = value.search(/[,;，、؛]/u);
  return separator > 0 ? value.slice(0, separator).trim() : null;
}

function compactShortLabelCandidate(sourceValue, value) {
  const sourceWords = labelWords(sourceValue);
  const words = [...value.matchAll(/[\p{L}\p{M}\p{N}]+/gu)];
  if (
    [...sourceValue].length >= SHORT_LABEL_MAX_SOURCE_LENGTH
    || sourceWords.length === 0
    || sourceWords.length > 2
    || words.length <= sourceWords.length + 1
  ) {
    return null;
  }
  const keep = sourceWords.length === 1 ? 1 : sourceWords.length + 1;
  const lastWord = words[keep - 1];
  return value.slice(0, lastWord.index + lastWord[0].length).trim();
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
  const reusedSourceKey = DASHBOARD_TRANSLATION_REUSE[key];
  return (
    QUALITY_MANUAL_OVERRIDES[`${locale}:${key}`] === sourceValue
    || getManualQualityOverride(locale, key, sourceValue) === sourceValue
    || (
      reusedSourceKey
      && QUALITY_MANUAL_OVERRIDES[`${locale}:${reusedSourceKey}`] === sourceValue
    )
  );
}

function hasReviewedQualityOverride(locale, key, sourceValue) {
  return Boolean(getManualQualityOverride(locale, key, sourceValue));
}

function getManualQualityOverride(locale, key, sourceValue) {
  if (DASHBOARD_SOURCE_FALLBACK_KEYS[locale]?.has(key)) return sourceValue;
  const keyOverride = QUALITY_MANUAL_OVERRIDES[`${locale}:${key}`];
  if (keyOverride) return keyOverride;
  if (key.startsWith('Dashboard.owner.')) {
    const termKey = sourceValue === 'taps' ? 'Taps' : sourceValue;
    const termOverride = DASHBOARD_TERM_OVERRIDES[locale]?.[termKey]
      || DASHBOARD_COMPACT_TERM_OVERRIDES[locale]?.[termKey];
    if (termOverride) return termOverride;
  }
  if (
    DASHBOARD_ONLY_MANUAL_SOURCE_VALUES.has(sourceValue)
    && !key.startsWith('Dashboard.owner.')
  ) {
    return undefined;
  }
  return QUALITY_MANUAL_SOURCE_OVERRIDES[`${locale}::${sourceValue}`];
}

function getRequiredManualQualityOverride(locale, key, sourceValue) {
  if (DASHBOARD_SOURCE_FALLBACK_KEYS[locale]?.has(key)) return sourceValue;
  const keyOverride = QUALITY_MANUAL_OVERRIDES[`${locale}:${key}`];
  if (keyOverride) return keyOverride;
  if (key.startsWith('Dashboard.owner.')) {
    const termKey = sourceValue === 'taps' ? 'Taps' : sourceValue;
    const termOverride = DASHBOARD_TERM_OVERRIDES[locale]?.[termKey]
      || DASHBOARD_COMPACT_TERM_OVERRIDES[locale]?.[termKey];
    if (termOverride) return termOverride;
  }
  if (
    key.startsWith('Dashboard.owner.')
    && DASHBOARD_ONLY_MANUAL_SOURCE_VALUES.has(sourceValue)
  ) {
    return QUALITY_MANUAL_SOURCE_OVERRIDES[`${locale}::${sourceValue}`];
  }
  return undefined;
}

function isValidQualityCandidate(sourceValue, candidate) {
  if (
    typeof candidate !== 'string'
    || !candidate.trim()
    || candidate.includes('\uFFFD')
    || hasUnexpectedSentenceExpansion(sourceValue, candidate)
    || hasSuspiciousShortLabelExpansion(sourceValue, candidate)
    || hasNumericArtifact(sourceValue, candidate)
    || hasLeakedProviderPlaceholder(candidate)
    || hasChangedProtectedTokens(sourceValue, candidate)
    || (isProtectedInvariant(sourceValue) && candidate !== sourceValue)
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
  if (
    typeof candidate !== 'string'
    || !candidate.trim()
    || candidate.includes('\uFFFD')
    || hasLeakedProviderPlaceholder(candidate)
    || hasChangedProtectedTokens(sourceValue, candidate)
    || hasNumericArtifact(sourceValue, candidate)
    || (isProtectedInvariant(sourceValue) && candidate !== sourceValue)
  ) return false;
  try {
    return JSON.stringify(signatureForMessage(candidate))
      === JSON.stringify(signatureForMessage(sourceValue));
  } catch {
    return false;
  }
}

function withoutTerminalLabelPunctuation(sourceValue, candidate) {
  if (
    [...sourceValue].length >= SHORT_LABEL_MAX_SOURCE_LENGTH
    || /[.!?。！？؟]\s*$/u.test(sourceValue)
  ) return null;
  const compact = candidate.replace(/[.!?。！？؟]+\s*$/u, '').trim();
  return compact && compact !== candidate.trim() ? compact : null;
}

function selectQualityCandidate(sourceValue, currentValue, generatedValue) {
  const candidates = [
    generatedValue,
    withoutTerminalLabelPunctuation(sourceValue, generatedValue),
    withoutTerminalLabelPunctuation(sourceValue, currentValue),
    firstCompleteTranslation(generatedValue),
    firstCompleteTranslation(currentValue),
    beforeClauseSeparator(generatedValue),
    beforeClauseSeparator(currentValue),
    beforeRepeatedOpeningStem(generatedValue),
    beforeRepeatedOpeningStem(currentValue),
    beforeRepeatedOpeningToken(generatedValue),
    beforeRepeatedOpeningToken(currentValue),
    compactShortLabelCandidate(sourceValue, generatedValue),
    compactShortLabelCandidate(sourceValue, currentValue),
    afterLabelSeparator(generatedValue),
    afterLabelSeparator(currentValue),
  ].filter(Boolean);
  return candidates.find(
    (candidate) => isValidQualityCandidate(sourceValue, candidate),
  );
}

function getDashboardTranslationReuseCandidate(
  locale,
  dashboardKey,
  messages,
  sourceMessages,
) {
  const dashboardSource = getByPath(sourceMessages, dashboardKey);
  const manualOverride = getManualQualityOverride(
    locale,
    dashboardKey,
    dashboardSource,
  );
  if (
    manualOverride
    && isValidManualQualityOverride(dashboardSource, manualOverride)
  ) {
    return manualOverride;
  }

  if (dashboardKey === 'Dashboard.owner.details.itemStatus.strongItem') {
    const itemTapsKey = 'Dashboard.owner.details.metrics.itemTaps';
    const itemTapsSource = getByPath(sourceMessages, itemTapsKey);
    const itemTaps = getManualQualityOverride(
      locale,
      itemTapsKey,
      itemTapsSource,
    ) || getByPath(messages, itemTapsKey);
    const candidate = `{count} ${itemTaps}`;
    if (isValidQualityCandidate(dashboardSource, candidate)) return candidate;
  }

  const sourceKey = DASHBOARD_TRANSLATION_REUSE[dashboardKey];
  if (sourceKey) {
    const establishedSource = getByPath(sourceMessages, sourceKey);
    assert(
      typeof dashboardSource === 'string' && dashboardSource === establishedSource,
      `${dashboardKey} cannot reuse ${sourceKey} because their en-US values differ`,
    );
    const candidate = getByPath(messages, sourceKey);
    if (isValidQualityCandidate(dashboardSource, candidate) || (
        candidate === dashboardSource
        && isReviewedExactOverride(locale, sourceKey, dashboardSource)
    )) return candidate;
  }

  const semanticSourceKey = DASHBOARD_SEMANTIC_TRANSLATION_REUSE[dashboardKey];
  if (semanticSourceKey) {
    const candidate = getByPath(messages, semanticSourceKey);
    if (isValidQualityCandidate(dashboardSource, candidate)) return candidate;
  }
  return null;
}

function applyDashboardTranslationReuse(locale, messages, sourceMessages) {
  let reusedValues = 0;
  const dashboardKeys = new Set([
    ...Object.keys(DASHBOARD_TRANSLATION_REUSE),
    ...Object.keys(DASHBOARD_SEMANTIC_TRANSLATION_REUSE),
    'Dashboard.owner.details.itemStatus.strongItem',
  ]);
  for (const dashboardKey of dashboardKeys) {
    const candidate = getDashboardTranslationReuseCandidate(
      locale,
      dashboardKey,
      messages,
      sourceMessages,
    );
    if (!candidate) continue;
    if (getByPath(messages, dashboardKey) !== candidate) {
      setByPath(messages, dashboardKey, candidate);
      reusedValues += 1;
    }
  }
  return reusedValues;
}

function applyQualityResults(locales, sourceOwner, results) {
  assert(results.version === 1, 'Unsupported semantic quality result version');
  assert(
    results.sourceOwnerSha256 === mapDigest(sourceOwner),
    'Semantic quality results were generated for a different en-US owner source',
  );
  assertProviderMetadata(results.providers);

  const evidence = readJson(EVIDENCE_PATH);
  assert(
    evidence.sourceOwnerSha256 === mapDigest(sourceOwner),
    'Semantic evidence belongs to a different en-US owner source',
  );

  const localeMessages = new Map();
  let repairedValues = 0;
  let manualOverridesApplied = 0;
  let establishedTranslationsReused = 0;
  let orthographicNormalizationsApplied = 0;
  const qualityErrors = [];
  const sourceMessages = readJson(localePath(SOURCE_LOCALE));
  for (const locale of locales) {
    const messages = readJson(localePath(locale));
    const localeResult = results.locales?.[locale];
    if (localeResult?.qualityEntries?.length) {
      const configured = qualityProviderForLocale(locale);
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
        const normalizedCurrentValue = normalizeOwnerLocaleValue(locale, entry.key, currentValue);
        assert(sourceValue, `${locale}:${entry.key} is not in the owner source`);
        assert(
          sha256(sourceValue) === entry.sourceSha256,
          `${locale}:${entry.key} source changed after quality preparation`,
        );
        assert(
          sha256(currentValue) === entry.currentSha256,
          `${locale}:${entry.key} locale value changed after quality preparation`,
        );

        const manualOverride = getManualQualityOverride(
          locale,
          entry.key,
          sourceValue,
        );
        if (manualOverride) {
          assert(
            isValidManualQualityOverride(sourceValue, manualOverride),
            `${locale}:${entry.key} manual quality override is not bounded and ICU-safe`,
          );
        }
        if (normalizedCurrentValue !== currentValue) {
          assert(
            isValidManualQualityOverride(sourceValue, normalizedCurrentValue),
            `${locale}:${entry.key} orthographic normalization is not ICU-safe`,
          );
        }
        let selected = manualOverride || (
          normalizedCurrentValue !== currentValue ? normalizedCurrentValue : null
        ) || getDashboardTranslationReuseCandidate(
          locale,
          entry.key,
          messages,
          sourceMessages,
        );
        let generatedValue = '';
        if (!selected) {
          const plan = compileMessage(
            sourceValue,
            registerUnit,
            configured.provider,
          );
          generatedValue = renderPlan(
            plan,
            localeResult.units || {},
            `${locale}:${entry.key}`,
          ).normalize('NFC');
          selected = selectQualityCandidate(
            sourceValue,
            currentValue,
            generatedValue,
          );
        }
        if (!selected) {
          qualityErrors.push(
            `${locale}:${entry.key} generated '${generatedValue.slice(0, 160)}'`,
          );
          continue;
        }
        setByPath(messages, entry.key, selected);
        repairedValues += 1;
        if (manualOverride) manualOverridesApplied += 1;
        if (!manualOverride && normalizedCurrentValue !== currentValue) {
          orthographicNormalizationsApplied += 1;
        }
      }
    }
    if (!ENGLISH_OWNER_LOCALES.has(locale)) {
      establishedTranslationsReused += applyDashboardTranslationReuse(
        locale,
        messages,
        sourceMessages,
      );
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
    orthographicNormalizationsApplied:
      (previousQualityRepair.orthographicNormalizationsApplied || 0)
      + orthographicNormalizationsApplied,
    establishedTranslationsReused:
      (previousQualityRepair.establishedTranslationsReused || 0)
      + establishedTranslationsReused,
    lastPassRepairedValues: repairedValues,
    lastPassEstablishedTranslationsReused: establishedTranslationsReused,
    trigger: `translated/source Unicode length ratio outside ${MIN_TRANSLATION_LENGTH_RATIO}-${MAX_TRANSLATION_LENGTH_RATIO}, exact non-invariant English residue, duplicated or sentence-expanded dashboard label, changed protected dashboard term or embedded token, invented dashboard number, mixed native-script output, invalid locale orthography, unexpected extra sentence, or leaked provider placeholder`,
    generation: 'provider beam search with token-preserving segment fallback; bounded first-complete-message fallback',
  };
  evidence.providers = results.providers;
  evidence.qualityGates = [
    ...new Set([
      ...(evidence.qualityGates || []),
      `Translated/source Unicode length ratio at most ${MAX_TRANSLATION_LENGTH_RATIO} for source messages of 20 or more characters`,
      `Translated/source Unicode length ratio at least ${MIN_TRANSLATION_LENGTH_RATIO} for source messages of 20 or more characters`,
      'Exact English source values are limited to approved protected invariants',
      'Compact dashboard labels cannot contain duplicated or sentence-expanded machine output',
      'Protected dashboard product and platform terms remain byte-for-byte invariant',
      'Protected product and platform tokens remain byte-for-byte invariant inside complete owner messages',
      'Dashboard translations cannot invent numeric values absent from the source message',
      'Meitei and Santali dashboard messages cannot contain characters from another native script',
      'Locale-specific orthography normalization cannot change ICU structure',
      'Single-sentence source messages do not gain unrelated extra sentences',
      'Provider placeholders cannot leak into rendered locale values',
    ]),
  ];
  refreshPublicCustomerAudit(evidence, localeMessages);

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
  assertProviderMetadata(results.providers);

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

  const previousEvidence = fs.existsSync(EVIDENCE_PATH)
    ? readJson(EVIDENCE_PATH)
    : {};
  const evidence = {
    ...previousEvidence,
    version: 1,
    generatedOn: new Date().toISOString().slice(0, 10),
    sourceLocale: SOURCE_LOCALE,
    sourceOwnerSha256: mapDigest(sourceOwner),
    sourceOwnerValueCount: sourceOwner.size,
    policy: 'Existing non-source values were preserved. Only values equal to en-US were generated.',
    qualityGates: [...new Set([
      ...(previousEvidence.qualityGates || []),
      'Pinned provider revision and license',
      'Protected product names, technical terms, URLs, emails, and ICU syntax',
      'Exact ICU argument/select/plural/tag signature parity',
      'NFC normalization and invalid-character rejection',
      'Per-locale owner-subtree SHA-256 evidence',
    ])],
    providers: results.providers,
    locales: localeEvidence,
  };
  refreshPublicCustomerAudit(evidence, localeMessages);
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
  assertProviderMetadata,
  isProtectedInvariant,
  isReviewedExactOverride,
  hasLeakedProviderPlaceholder,
  hasNumericArtifact,
  hasDashboardScriptCorruption,
  hasSuspiciousShortLabelExpansion,
  hasUnexpectedSentenceExpansion,
  hasReviewedQualityOverride,
  normalizeOwnerLocaleValue,
  providerMetadata,
  qualityProviderForLocale,
  translationLengthRatio,
};
