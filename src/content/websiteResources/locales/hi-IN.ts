import { WEBSITE_RESOURCE_SOURCE_VERSION } from '../sourceVersion';
import type { WebsiteResourceTranslationPack } from '../types';

export const hiINResourceTranslationPack: WebsiteResourceTranslationPack = {
    locale: 'hi-IN',
    status: 'reviewed',
    sourceVersion: WEBSITE_RESOURCE_SOURCE_VERSION,
    reviewedAt: '2026-06-01',
    clusterLabels: {
        'source-audit': 'Menu source check',
        'official-source': 'Official menu source',
        'qr-menu': 'QR menu',
        'google-menu': 'Google menu',
        'menu-seo': 'Menu SEO',
        'ai-discovery': 'AI discovery',
        'menu-engineering': 'Menu engineering',
        'checklists': 'Checklist',
        'multi-location': 'Multi-location',
    },
    labels: {
        allResources: 'All resources',
        backToHub: 'Resources पर वापस',
        checklist: 'Checklist',
        comparison: 'Comparison',
        faqTitle: 'Owners के सवाल',
        onThisPage: 'इस page पर',
        primaryAction: 'Next step',
        quickAnswer: 'Quick answer',
        readingTime: 'Read time',
        readResource: 'Resource पढ़ें',
        relatedResources: 'Related resources',
        resources: 'Resources',
        updated: 'Updated',
    },
    hub: {
        eyebrow: 'Menu correctness resources',
        title: 'एक public menu current रखना सीखें.',
        titleHighlight: 'public menu current',
        subtitle: 'Owners के लिए plain guides, audits, worksheets और checklists ताकि customers QR, Google, WhatsApp, websites, screens और print material पर वही current menu देखें.',
        primaryCta: { label: 'Menu upload करें', href: '/create-menu' },
        secondaryCta: { label: 'Audit से start करें', href: '/resources/menu-source-audit' },
        proofItems: [
            'Owner guides',
            'Search और answer systems के लिए visible HTML',
            'No ranking or citation promises',
        ],
        clusterTitle: 'Customer वाली problem से शुरू करें',
        clusterSubtitle: 'हर resource एक practical surface explain करता है जहां menus stale होते हैं, फिर owner को one approved source पर वापस लाता है.',
        toolTitle: 'Tools और checklists',
        toolSubtitle: 'इन pages को staff, printers, consultants या location managers के साथ working checklist की तरह use करें.',
    },
    articles: {
        'menu-source-audit': {
            title: 'हर जगह देखें जहां customers पुराना menu देख सकते हैं',
            metaTitle: 'Menu Source Audit for Restaurants | MenuList',
            metaDescription: 'Google, QR codes, WhatsApp, Instagram, PDFs, staff files, websites और branch copies में पुराने menu versions check करें.',
            description: 'Customers को confuse करने से पहले old menu copies खोजने के लिए practical audit.',
            quickAnswer: 'Menu source audit हर public और staff-shared जगह check करता है जहां customer पुरानी price, पुराने items या outdated menu file देख सकता है. Goal है कि हर surface के पीछे one current approved menu link रहे.',
            primaryCtaLabel: 'Current menu upload करें',
            distributionSnippets: [
                'Most menu problems menu के अंदर नहीं होते. वे Google, WhatsApp, QR cards और staff files में बचे पुराने copies में होते हैं.',
                'New QR code print करने से पहले check करें कि old menu अभी भी कहां share हो रहा है.',
            ],
            sections: {
                'why-old-menus-remain': {
                    title: 'पुराने menus visible क्यों रहते हैं',
                    body: [
                        'Business के अंदर menu change करना simple होता है, लेकिन पुराना version घूमता रहता है. PDF WhatsApp में रह जाता है. Table QR old file खोलता है. Customer photo Google पर रहती है. Staff member पिछले महीने का screenshot भेज देता है.',
                        'Customer को सिर्फ mismatch दिखता है. उसे नहीं पता कौन सा version सही है.',
                    ],
                },
                'places-to-check': {
                    title: 'पहले कौन सी जगह check करें',
                    body: [
                        'उन surfaces से शुरू करें जिन्हें customers call, visit, order या share करने से पहले use करते हैं.',
                    ],
                    checklist: [
                        'Google Business Profile menu link',
                        'Owner या customers द्वारा upload की गई Google menu photos',
                        'Tables, counters, windows, packaging और bill folders पर QR codes',
                        'WhatsApp catalog links, groups और saved replies',
                        'Instagram bio link, story highlights और old posts',
                        'Business website menu page या PDF',
                        'Printed PDFs, takeaway flyers और table tents',
                        'Staff phones, staff shared folders और front-desk files',
                        'Delivery या ordering links जहां menu content दिखता है',
                        'हर location के branch-specific copies',
                    ],
                },
                'monthly-check': {
                    title: 'Monthly check',
                    body: [
                        'Audit इतना छोटा होना चाहिए कि price changes, availability changes और seasonal menu changes के बाद चल सके.',
                    ],
                    checklist: [
                        'Customer phone से QR code खोलें.',
                        'Google पर business search करें और दिख रहे हर menu surface को खोलें.',
                        'Customers को दिखने वाले Instagram और WhatsApp links खोलें.',
                        'एक staff member से पूछें कि customer पूछे तो वह कौन सी menu file भेजता है.',
                        'Confirm करें कि branch managers किसी older outlet से copied menu use नहीं कर रहे.',
                    ],
                },
                'how-menulist-fits': {
                    title: 'MenuList कैसे fit होता है',
                    body: [
                        'MenuList business को one approved menu source और public link देता है. QR, website links, saved menu shortcuts, print assets और official pages उस current source पर वापस point कर सकते हैं.',
                        'External platforms फिर भी खुद decide करते हैं कि वे क्या crawl, show, cache या refresh करते हैं. MenuList का काम official source को clearer और reuse करना आसान बनाना है.',
                    ],
                },
            },
            faq: {
                'audit-frequency': {
                    question: 'Business को यह audit कितनी बार करना चाहिए?',
                    answer: 'हर price change, seasonal menu change, branch change या printed QR update के बाद करें. Stable menus के लिए monthly check enough है.',
                },
                'google-photos-removal': {
                    question: 'क्या MenuList पुराने Google photos हटाता है?',
                    answer: 'नहीं. Google Business Profile content Google control करता है. MenuList owner को current official menu source देता है जिसे सही fields और public links में रखा जा सके.',
                },
                'old-pdf-deletion': {
                    question: 'क्या हर old PDF delete करनी चाहिए?',
                    answer: 'Old public PDFs main customer source नहीं रहनी चाहिए. Current PDF print या backup के लिए useful रह सकती है जब वह approved menu से generate हो.',
                },
            },
        },
        'menu-engineering': {
            title: 'Menu engineering उसी menu से शुरू होती है जो customers देखते हैं',
            metaTitle: 'Menu Engineering Starts With the Public Menu | MenuList',
            metaDescription: 'Menu engineering basics तभी useful हैं जब customer-facing menu current, clear और owner-approved हो.',
            description: 'Owner-friendly menu engineering guide without false POS or food-cost claims.',
            quickAnswer: 'Menu engineering items, pricing, placement और customer clarity review करती है. यह पहले current public menu से शुरू होनी चाहिए, क्योंकि owner उस menu को improve नहीं कर सकता जो customers असल में देख ही नहीं रहे.',
            primaryCtaLabel: 'Current menu upload करें',
            distributionSnippets: [
                'Menu engineering spreadsheet में शुरू नहीं होती. यह उस menu से शुरू होती है जो customers actually देखते हैं.',
            ],
            sections: {
                meaning: {
                    title: 'Menu engineering का मतलब',
                    body: [
                        'Menu engineering usually items को popularity और margin के हिसाब से group करती है. Owners उस view से decide करते हैं कि कौन से items feature, rewrite, reprice, move या remove करने हैं.',
                        'MenuList full profitability calculate करने का claim नहीं करना चाहिए जब तक food-cost और sales data connected न हो. Safe first step है public menu को current और review करना आसान रखना.',
                    ],
                },
                'customer-facing-first': {
                    title: 'Customer-facing menu पहले आता है',
                    body: [
                        'अगर customers old prices या old items देख रहे हैं, तो better item labels और placement main problem fix नहीं करेंगे. Owner को improve करने से पहले one current menu चाहिए.',
                    ],
                    bullets: [
                        'Item names वही होने चाहिए जो staff और customers use करते हैं.',
                        'Prices current approved menu से match होनी चाहिए.',
                        'Descriptions choice आसान बनाएं, लंबी नहीं.',
                        'Photos उसी item से match होनी चाहिए जो sell हो रहा है.',
                        'Sections customers के decision flow के हिसाब से होने चाहिए.',
                    ],
                },
                matrix: {
                    title: 'Basic menu engineering matrix',
                    comparisonRows: [
                        { label: 'Stars', left: 'High popularity वाले items', right: 'High margin वाले items' },
                        { label: 'Puzzles', left: 'Low popularity वाले items', right: 'High margin वाले items' },
                        { label: 'Plowhorses', left: 'High popularity वाले items', right: 'Low margin वाले items' },
                        { label: 'Dogs', left: 'Low popularity वाले items', right: 'Low margin वाले items' },
                    ],
                },
                actions: {
                    title: 'Useful actions',
                    checklist: [
                        'Stars को visible और order करना आसान रखें.',
                        'Puzzles को remove करने से पहले rewrite या reposition करें.',
                        'Plowhorses की pricing, portion और placement review करें.',
                        'Dogs को remove या hide करने से पहले operational need check करें.',
                        'New material print करने से पहले public prices aligned रखें.',
                    ],
                },
                'how-menulist-fits': {
                    title: 'MenuList कैसे fit होता है',
                    body: [
                        'MenuList public menu source को structured, current और owner-approved रखता है. इससे owner को menu review, QR placement, public search copy और print material के लिए cleaner starting point मिलता है.',
                    ],
                },
            },
            faq: {
                'profitability-calculation': {
                    question: 'क्या MenuList item profitability calculate करता है?',
                    answer: 'नहीं. MenuList public menu source को current और structured रख सकता है. Full profitability engineering के लिए food-cost और sales data चाहिए.',
                },
                'engineering-without-pos': {
                    question: 'क्या POS data के बिना menu engineering हो सकती है?',
                    answer: 'Basic review owner knowledge, staff input और customer clarity से हो सकता है. POS data इसे stronger बनाता है, लेकिन public menu पहले current होना चाहिए.',
                },
            },
        },
        'qr-menu-for-restaurants': {
            title: 'QR code तभी useful है जब उसके पीछे current menu हो',
            metaTitle: 'QR Menu for Restaurants | MenuList',
            metaDescription: 'QR menus को one stable menu link, table placement, scan testing और current customer-facing content के around plan करें.',
            description: 'QR menu guide focused on the source behind the code.',
            quickAnswer: 'Restaurant QR code को one stable, current, mobile-friendly menu link खोलना चाहिए. QR सिर्फ doorway है. Trust menu source से आता है.',
            primaryCtaLabel: 'Official QR menu बनाएं',
            sections: {
                'what-qr-opens': {
                    title: 'QR क्या खोलना चाहिए',
                    body: [
                        'QR को current public menu page खोलना चाहिए जो phone पर काम करे, business identity दिखाए और heavy file download किए बिना readable रहे.',
                    ],
                    bullets: [
                        'Current item names और prices',
                        'Clear sections',
                        'Available हो तो open status और business details',
                        'Business use करता हो तो call, WhatsApp, directions या ordering handoffs',
                        'Stable URL जो menu changes के बाद भी वही रह सके',
                    ],
                },
                'why-qr-fails': {
                    title: 'QR menus fail क्यों होते हैं',
                    checklist: [
                        'QR old PDF खोलता है.',
                        'Page phone पर पढ़ना hard है.',
                        'हर menu update के बाद link change होता है.',
                        'Staff old cards check किए बिना new QR cards print करता है.',
                        'Customers poor lighting में या बहुत दूर से scan करते हैं.',
                    ],
                },
                placement: {
                    title: 'QR codes कहां लगाएं',
                    body: [
                        'QR placement उस जगह से match होना चाहिए जहां customers decide करते हैं. Table QR browsing के लिए useful है. Counter QR takeaway के लिए काम करता है. Packaging QR customers के जाने के बाद repeat visits में help करता है.',
                    ],
                    checklist: [
                        'Tables और counters',
                        'Entrance या waiting area',
                        'Bill folders और receipts',
                        'Takeaway packaging',
                        'Delivery bag stickers',
                        'Window posters',
                    ],
                },
                testing: {
                    title: 'Printing से पहले scan testing',
                    checklist: [
                        'iPhone और Android से test करें.',
                        'उसी lighting में test करें जिसमें customers use करेंगे.',
                        'Link mobile data पर खोलें, सिर्फ Wi-Fi पर नहीं.',
                        'Confirm करें कि page current menu खोलता है.',
                        'QR के नीचे readable short URL print रखें.',
                    ],
                },
            },
            faq: {
                'qr-opens-pdf': {
                    question: 'क्या QR code PDF खोलना चाहिए?',
                    answer: 'PDF backup के रूप में काम कर सकती है, लेकिन menu अक्सर change होता है तो वह main customer source नहीं होनी चाहिए.',
                },
                'same-qr-after-changes': {
                    question: 'क्या menu changes के बाद वही QR काम कर सकता है?',
                    answer: 'हां, जब QR stable MenuList link पर point करे और उस link के पीछे menu update हो.',
                },
            },
        },
        'digital-menu-vs-pdf-menu': {
            title: 'PDF useful हो सकता है, पर main public menu source नहीं होना चाहिए',
            metaTitle: 'Digital Menu vs PDF Menu | MenuList',
            metaDescription: 'QR codes, WhatsApp, Google links, updates और customer trust के लिए mobile digital menus, PDFs और print files compare करें.',
            description: 'उन owners के लिए comparison page जो हर जगह menu PDFs और print files use करते हैं.',
            quickAnswer: 'PDF या print file print, controlled sharing और backup के लिए useful है, लेकिन main public source के लिए mobile digital menu usually better है क्योंकि वह current, searchable और phone पर readable रह सकता है.',
            primaryCtaLabel: 'Old PDF menu replace करें',
            sections: {
                'pdf-useful': {
                    title: 'PDFs कहां useful हैं',
                    bullets: [
                        'Printer handoff packet',
                        'Staff के लिए backup file',
                        'जब prices rarely change हों तो static takeaway menu',
                        'Current approved menu से generated downloadable version',
                    ],
                },
                'pdf-problems': {
                    title: 'PDFs कहां problems create करती हैं',
                    body: [
                        'Menu change होने के बाद भी PDFs circulate होती रहती हैं. Customer पिछले महीने की saved file खोलकर उसे current मान सकता है.',
                    ],
                    checklist: [
                        'Old prices WhatsApp में रह जाती हैं.',
                        'Large files mobile data पर slow load होती हैं.',
                        'Text zoom और scan करना hard हो सकता है.',
                        'Multiple PDF versions source confusion create करते हैं.',
                    ],
                },
                comparison: {
                    title: 'Digital menu vs PDF menu',
                    comparisonRows: [
                        { label: 'Mobile reading', left: 'Phone browsing के लिए built', right: 'अक्सर zoom करना पड़ता है' },
                        { label: 'Updates', left: 'Same link latest menu दिखा सकता है', right: 'New file old copies replace करे तभी सही' },
                        { label: 'Search', left: 'Customers search और section jump कर सकते हैं', right: 'PDF quality पर depend करता है' },
                        { label: 'Print', left: 'Current PDF और printer handoff files generate कर सकता है', right: 'Direct printing के लिए अच्छा' },
                    ],
                },
                'safe-setup': {
                    title: 'Safer setup',
                    body: [
                        'Main customer source के रूप में current digital menu page use करें. जब paper, WhatsApp या printer handoff चाहिए, तो separate file maintain करने के बजाय approved menu से PDF या packet generate करें.',
                    ],
                },
            },
            faq: {
                'stop-using-pdfs': {
                    question: 'क्या business को PDFs completely बंद कर देनी चाहिए?',
                    answer: 'नहीं. PDFs और print packets print और controlled sharing के लिए still work करते हैं. वे current approved menu से generate होने चाहिए, main public source के रूप में अलग से maintain नहीं.',
                },
            },
        },
        'google-business-profile-menu': {
            title: 'Google को पढ़ने के लिए एक clearer menu source दें',
            metaTitle: 'Google Business Profile Menu Source | MenuList',
            metaDescription: 'Google Business Profile के लिए one current menu link use करें, without ranking, refresh timing या automatic Google update claims.',
            description: 'Google menu links, photos और old menu cleanup के लिए careful owner guide.',
            quickAnswer: 'Google Business Profile menu links, menu photos और customer-uploaded images दिखा सकता है. Current official menu link confusion कम करता है, लेकिन Google खुद decide करता है कि वह क्या crawl, show और refresh करता है.',
            primaryCtaLabel: 'Official menu link use करें',
            distributionSnippets: [
                'Scattered menu system को Google अपने आप fix नहीं कर सकता. उसे पढ़ने के लिए one clearer current source दें.',
            ],
            sections: {
                'why-outdated': {
                    title: 'Google menu information outdated क्यों होती है',
                    body: [
                        'Google business links, menu links, photos, customer-uploaded images और other discovered content दिखा सकता है. अगर old files public रहती हैं, customers उन्हें अभी भी find कर सकते हैं.',
                    ],
                },
                'what-to-check': {
                    title: 'Google Business Profile में क्या check करें',
                    checklist: [
                        'Menu URL या website field',
                        'Owner-uploaded menu photos',
                        'Customer-uploaded menu photos',
                        'Business website पर old PDF links',
                        'Available हो तो preferred menu source settings',
                        'Business hours, phone और address consistency',
                    ],
                },
                'old-menu-cleanup': {
                    title: 'Old menu cleanup',
                    body: [
                        'Owner को उन menu photos और links को remove या replace करना चाहिए जिन्हें वह control करता है. Customer-uploaded photos को Google tools से report या manage करना पड़ सकता है.',
                    ],
                    checklist: [
                        'Menu link को current official menu URL से replace करें.',
                        'Owner-uploaded outdated menu photos remove करें.',
                        'Appropriate हो तो customer-uploaded old menu photos report करें.',
                        'Changes के बाद visible customer view check करें.',
                        'QR, Instagram, WhatsApp और business website पर same current menu URL रखें.',
                    ],
                },
                'claim-limit': {
                    title: 'MenuList क्या control नहीं करता',
                    body: [
                        'MenuList Google ranking, Google Maps placement, photo removal decisions, crawl timing या AI summaries control नहीं करता. MenuList एक clearer official menu source prepare करता है जिसे owners वहां रख सकते हैं जहां Google और customers देखते हैं.',
                    ],
                },
            },
            faq: {
                'automatic-google-update': {
                    question: 'क्या MenuList link Google को automatically update करेगा?',
                    answer: 'नहीं. Owners अभी भी Google Business Profile manage करते हैं. MenuList उन्हें current official menu link देता है जिसे वे use कर सकें.',
                },
                'old-customer-photos': {
                    question: 'क्या old customer menu photos visible रह सकती हैं?',
                    answer: 'हां. Customer-uploaded photos Google control करता है. Owners उन्हें Google Business Profile tools से manage या report कर सकते हैं.',
                },
            },
        },
        'official-menu-source': {
            title: 'Customers को guess नहीं करना चाहिए कि कौन सा menu सही है',
            metaTitle: 'Official Menu Source for Restaurants | MenuList',
            metaDescription: 'QR codes, Google, WhatsApp, Instagram, websites, print और multi-location teams के लिए one approved public menu source define करें.',
            description: 'MenuList का core concept owner language में.',
            quickAnswer: 'Official menu source वह owner-approved menu version है जिस पर every public link and material point करना चाहिए. Customers को PDFs, photos और QR links compare करके current version guess नहीं करना चाहिए.',
            primaryCtaLabel: 'Official menu source बनाएं',
            sections: {
                problem: {
                    title: 'हर जगह menu copies होने की problem',
                    body: [
                        'Business के अंदर one current menu हो सकता है और बाहर many outdated copies. Customers screenshots, saved PDFs, old QR links, Google photos, Instagram posts और staff-shared files देखते हैं.',
                        'Official source हर surface को एक single place पर point करने देता है.',
                    ],
                },
                'what-source-includes': {
                    title: 'Official menu source में क्या होना चाहिए',
                    checklist: [
                        'Business name और identity',
                        'Current sections, items, prices और availability',
                        'Menu update या freshness signals',
                        'Phone-friendly layout',
                        'Use होते हों तो call, WhatsApp, directions, order या reservation handoffs',
                        'QR, Google, Instagram, WhatsApp, print और website links के लिए stable URL',
                    ],
                },
                'when-prices-change': {
                    title: 'जब prices या items change हों',
                    body: [
                        'Owner approved source update करता है. QR और customer links को current version खोलते रहना चाहिए, ताकि owner को हर old file chase न करनी पड़े.',
                    ],
                },
                'how-menulist-fits': {
                    title: 'MenuList कैसे fit होता है',
                    body: [
                        'MenuList current menu को structured public source में बदलता है. Same source QR menus, official pages, sharing links, print/PDF assets, screens और multi-location control support कर सकता है.',
                    ],
                },
            },
            faq: {
                'official-source-vs-website': {
                    question: 'क्या official menu source website जैसा ही है?',
                    answer: 'Exactly नहीं. Website में many pages हो सकते हैं. Official menu source वह current menu truth है जहां customers को every public surface से पहुंचना चाहिए.',
                },
            },
        },
        'restaurant-menu-seo': {
            title: 'Menu को customers और search systems के लिए समझना आसान बनाएं',
            metaTitle: 'Restaurant Menu SEO Guide | MenuList',
            metaDescription: 'Visible menu text, stable URLs, headings, metadata, internal links और structured data कैसे menu discovery support करते हैं, without ranking promises.',
            description: 'Restaurant menu pages के लिए practical SEO guide.',
            quickAnswer: 'Restaurant menu SEO visible text, stable menu URL, clear headings, useful metadata, internal links और page से matching structured data से शुरू होता है. कोई system rankings guarantee नहीं कर सकता.',
            primaryCtaLabel: 'Official menu page publish करें',
            sections: {
                'visible-text': {
                    title: 'Visible text matter करता है',
                    body: [
                        'Search systems और answer engines को readable page content चाहिए. Image या old PDF में फंसा menu, visible item names, sections, prices और business context वाले structured page से समझना harder होता है.',
                    ],
                },
                'stable-url': {
                    title: 'Stable menu URL matter करता है',
                    body: [
                        'Stable URL QR codes, Google fields, social profiles और customers को same place पर point करने देता है. Link familiar रह सकता है और उसके पीछे content update हो सकता है.',
                    ],
                },
                'seo-basics': {
                    title: 'Useful menu SEO basics',
                    checklist: [
                        'Page के लिए one H1.',
                        'Clear section headings.',
                        'Readable item names और descriptions.',
                        'Metadata जो visible page content से match करे.',
                        'Homepage या business page से menu तक internal links.',
                        'Schema जो सिर्फ वही describe करे जो page visibly दिखाता है.',
                    ],
                },
                'claim-limit': {
                    title: 'SEO क्या promise नहीं कर सकता',
                    body: [
                        'Search engines crawling, ranking, rich results और snippets decide करते हैं. Better menu page उन्हें clearer source देता है, पर placement force नहीं करता.',
                    ],
                },
            },
            faq: {
                'structured-data-guarantee': {
                    question: 'क्या structured data rich results guarantee करता है?',
                    answer: 'नहीं. Structured data visible content से match होना चाहिए. Search engines decide करते हैं कि उसे use करना है या नहीं.',
                },
            },
        },
        'ai-search-menu-discovery': {
            title: 'Current menu को search और AI systems के लिए समझना आसान बनाएं',
            metaTitle: 'AI Search Menu Discovery | MenuList',
            metaDescription: 'Visible HTML, schema, sitemap, robots और LLM context files के साथ search और AI systems के लिए clearer public menu source prepare करें.',
            description: 'Ranking या citation promises के बिना careful AEO guide.',
            quickAnswer: 'AI search systems clear public sources के साथ बेहतर काम करते हैं. Visible text, schema, sitemap signals, robots policy और LLM context वाला current menu page scattered PDFs और old images से easier source होता है.',
            primaryCtaLabel: 'Official menu source बनाएं',
            sections: {
                'why-ai-needs-source': {
                    title: 'AI systems को clear source क्यों चाहिए',
                    body: [
                        'AI assistants और answer systems public information को search results, crawled pages, user-triggered fetches और structured data से summarize कर सकते हैं. जब old menu copies online रहती हैं, summaries uncertain या stale हो सकती हैं.',
                    ],
                },
                'what-readable-means': {
                    title: 'Readable का मतलब',
                    checklist: [
                        'Important menu text HTML में visible है.',
                        'Schema visible page content से match करता है.',
                        'Sitemap active public pages list करता है.',
                        'Robots policy intentional है.',
                        'LLM context files public facts और boundaries explain करती हैं.',
                        'Page बताता है कि external systems खुद क्या decide करते हैं.',
                    ],
                },
                'scattered-sources': {
                    title: 'Scattered files answers को confuse क्यों करती हैं',
                    body: [
                        'Current menu page एक बात कहता है. Old PDF, old Google photo और old WhatsApp image कुछ और कहते हैं. Clearer source वही होना चाहिए जिसे owner maintain करता है.',
                    ],
                },
                'claim-limit': {
                    title: 'MenuList क्या guarantee नहीं करता',
                    body: [
                        'MenuList Google rankings, ChatGPT citations, AI answer placement, crawl timing या external platform refreshes guarantee नहीं करता. MenuList उन systems के लिए clearer public source prepare करता है जिसे वे choose करें तो read कर सकें.',
                    ],
                },
            },
            faq: {
                'llms-required-google-ai': {
                    question: 'क्या Google AI features के लिए llms.txt required है?',
                    answer: 'नहीं. Google कहता है कि normal search fundamentals अभी भी matter करते हैं. MenuList LLM context files को additional public-agent contract की तरह use करता है, Google requirement की तरह नहीं.',
                },
            },
        },
        'menu-update-checklist': {
            title: 'हर update से पहले और बाद public menu check करें',
            metaTitle: 'Restaurant Menu Update Checklist | MenuList',
            metaDescription: 'Prices, availability, descriptions, QR links, Google menu links, PDFs और staff-shared menu files बदलने से पहले यह checklist use करें.',
            description: 'Safe menu changes के लिए working checklist.',
            quickAnswer: 'Menu update तब finish नहीं होता जब owner internal menu change करता है. यह तब finish होता है जब customers उन public surfaces पर current approved version देख सकें जिन्हें वे use करते हैं.',
            primaryCtaLabel: 'Menu source review करें',
            sections: {
                'before-update': {
                    title: 'Update से पहले',
                    checklist: [
                        'Item names और spelling confirm करें.',
                        'Current prices और currency confirm करें.',
                        'Unavailable items clearly mark करें.',
                        'Photos अभी भी items से match करती हैं या नहीं check करें.',
                        'Descriptions short और useful हैं या नहीं check करें.',
                        'Categories अभी भी sense बनाती हैं या नहीं confirm करें.',
                    ],
                },
                'after-update': {
                    title: 'Update के बाद',
                    checklist: [
                        'Public menu phone पर खोलें.',
                        'Main QR code scan करें.',
                        'Use हो तो Google menu link खोलें.',
                        'Instagram और WhatsApp links खोलें.',
                        'Changed हों तो old PDFs या print files replace करें.',
                        'Staff को बताएं कि customers को कौन सा link भेजना है.',
                    ],
                },
                'branch-updates': {
                    title: 'Branch और outlet updates',
                    body: [
                        'Multi-location businesses के लिए confirm करें कि change हर outlet पर apply होता है या सिर्फ one location पर.',
                    ],
                    checklist: [
                        'Shared master menu update हो गया.',
                        'Location-level price differences check हो गए.',
                        'Local unavailable items check हो गए.',
                        'Branch QR links test हो गए.',
                    ],
                },
            },
            faq: {
                'biggest-update-mistake': {
                    question: 'सबसे बड़ी update mistake क्या है?',
                    answer: 'Menu को एक जगह change करना, जबकि customers दूसरी जगह old prices देख रहे हों.',
                },
            },
        },
        'qr-code-placement-checklist': {
            title: 'QR codes ऐसी जगह लगाएं जहां customers staff से पूछे बिना scan कर सकें',
            metaTitle: 'QR Code Placement Checklist for Restaurants | MenuList',
            metaDescription: 'QR code size, table placement, counter placement, packaging, lighting, fallback URLs और scan testing के लिए checklist.',
            description: 'Owners, staff और printers के लिए practical QR placement checklist.',
            quickAnswer: 'Good QR setup सही size, clear placement, good lighting, readable fallback URL और real customer phones पर scan testing से बनता है, bulk printing से पहले.',
            primaryCtaLabel: 'QR menu source बनाएं',
            sections: {
                placement: {
                    title: 'Placement checklist',
                    checklist: [
                        'Table card normal seated position से visible हो.',
                        'Counter QR ordering या payment point के पास हो.',
                        'Use हो तो window QR बाहर से readable हो.',
                        'Packaging QR flat visible area पर हो.',
                        'Bill-folder या receipt QR code पर fold न हो.',
                        'Fallback short URL code के नीचे printed हो.',
                    ],
                },
                'size-lighting': {
                    title: 'Size और lighting',
                    checklist: [
                        'Bulk printing से पहले final size पर print test करें.',
                        'जहां lighting strong हो, glossy glare avoid करें.',
                        'QR के around quiet space रखें.',
                        'Strong contrast use करें.',
                        'Curved या heavily textured surfaces पर न लगाएं.',
                    ],
                },
                'scan-test': {
                    title: 'Scan test',
                    checklist: [
                        'iPhone camera test करें.',
                        'Android camera test करें.',
                        'In-store Wi-Fi और mobile data दोनों पर test करें.',
                        'Confirm करें कि page current menu खोलता है.',
                        'Cards tables पर रखने से पहले staff से test करवाएं.',
                    ],
                },
            },
            faq: {
                'table-specific-qr': {
                    question: 'क्या हर table का अलग QR होना चाहिए?',
                    answer: 'Menu source के लिए नहीं. Single official menu link simpler है. Table-specific codes तभी matter करते हैं जब separate ordering system को table identity चाहिए.',
                },
            },
        },
        'menu-engineering-worksheet': {
            title: 'Simple worksheet से menu items review करें',
            metaTitle: 'Menu Engineering Worksheet | MenuList',
            metaDescription: 'Section, price, cost estimate, popularity estimate, margin estimate, clarity और next action के लिए simple item worksheet use करें.',
            description: 'Public menus change करने से पहले menu items review करने के लिए HTML-first worksheet.',
            quickAnswer: 'Useful menu worksheet हर item को section, current price, rough cost, popularity estimate, margin estimate, customer clarity score और next action देता है.',
            primaryCtaLabel: 'Current menu से शुरू करें',
            sections: {
                'worksheet-fields': {
                    title: 'Worksheet fields',
                    checklist: [
                        'Item name',
                        'Section',
                        'Current price',
                        'Cost estimate',
                        'Popularity estimate',
                        'Margin estimate',
                        'Customer clarity',
                        'Action: keep, rewrite, reprice, move, remove या test',
                    ],
                },
                'how-to-use': {
                    title: 'कैसे use करें',
                    body: [
                        'Worksheet को current public menu structured होने के बाद use करें. एक section at a time review करें ताकि owner को पूरा menu एक साथ redesign करने के लिए force न किया जाए.',
                    ],
                    checklist: [
                        'Best-known items पहले mark करें.',
                        'Confusing item names mark करें.',
                        'Unclear prices या weak descriptions वाले items find करें.',
                        'Decide करें कि क्या more visible होना चाहिए.',
                        'Owner approval के बाद ही public menu update करें.',
                    ],
                },
                'claim-limit': {
                    title: 'यह worksheet क्या नहीं है',
                    body: [
                        'यह POS profitability report नहीं है. यह practical owner review tool है. Exact margin analysis के लिए food-cost और sales systems use करें.',
                    ],
                },
            },
            faq: {
                'staff-worksheet': {
                    question: 'क्या staff यह worksheet fill कर सकता है?',
                    answer: 'Staff notes add कर सकता है, लेकिन public changes live होने से पहले owner approval final source रहना चाहिए.',
                },
            },
        },
        'multi-location-menu-management': {
            title: 'Outlet menus aligned रखें without hiding local differences',
            metaTitle: 'Multi-location Menu Management | MenuList',
            metaDescription: 'One approved source से master menus, outlet differences, branch price drift, local availability और public link consistency manage करें.',
            description: 'एक से ज्यादा location चलाने वाले brands के लिए guide.',
            quickAnswer: 'Multi-location menu management में one approved master source और price, availability, local items तथा branch-specific details के लिए controlled outlet differences चाहिए.',
            primaryCtaLabel: 'First location setup करें',
            sections: {
                'why-branches-drift': {
                    title: 'Branch menus drift क्यों होते हैं',
                    body: [
                        'एक outlet price change करता है. दूसरा item से out हो जाता है. तीसरा old QR material print करता है. समय के साथ brand के पास many menu versions हो जाते हैं और customers क्या देखते हैं यह जानना simple नहीं रहता.',
                    ],
                },
                'master-vs-outlet': {
                    title: 'Master menu और outlet menu',
                    comparisonRows: [
                        { label: 'Master menu', left: 'Shared item structure, brand sections, common descriptions', right: 'Approved source के रूप में used' },
                        { label: 'Outlet menu', left: 'Local price, availability, local item, branch details', right: 'उस branch की customer truth के लिए used' },
                    ],
                },
                'what-to-control': {
                    title: 'क्या control करें',
                    checklist: [
                        'Shared item names और sections',
                        'Outlet-level price differences',
                        'Local availability',
                        'Branch-specific service modes',
                        'हर outlet के QR links',
                        'हर outlet के Google और social links',
                        'हर outlet के printed materials',
                    ],
                },
                'how-menulist-fits': {
                    title: 'MenuList कैसे fit होता है',
                    body: [
                        'MenuList master menu और outlet-aware control support करता है ताकि businesses shared source stable रख सकें और जहां जरूरत हो वहां local differences preserve कर सकें.',
                    ],
                },
            },
            faq: {
                'same-menu-every-outlet': {
                    question: 'क्या हर outlet exactly same menu दिखाए?',
                    answer: 'सिर्फ तब जब business actually ऐसे operate करता हो. Safer setup shared structure with controlled outlet differences है.',
                },
            },
        },
    },
};
