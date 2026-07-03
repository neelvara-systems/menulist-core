require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS' },
  require: ['tsconfig-paths/register'],
});

const fs = require('fs');
const path = require('path');

const {
  enUSWebsiteResources,
} = require('../../src/content/websiteResources/en-US');
const {
  WEBSITE_RESOURCE_DEFAULT_LOCALE,
  WEBSITE_RESOURCE_REVIEWED_ROUTE_LOCALES,
  buildWebsiteResourcePath,
  getWebsiteResourcesCopy,
} = require('../../src/content/websiteResources');
const {
  WEBSITE_RESOURCE_PLANNED_INDIAN_LOCALES,
  WEBSITE_RESOURCE_TRANSLATION_PACKS,
} = require('../../src/content/websiteResources/locales');
const {
  WEBSITE_RESOURCE_SOURCE_VERSION,
} = require('../../src/content/websiteResources/sourceVersion');
const {
  WEBSITE_RESOURCE_FORBIDDEN_PUBLIC_CLAIMS,
} = require('../../src/content/websiteResources/glossary');
const {
  DEFAULT_WEBSITE_LANGUAGE,
  WEBSITE_LANGUAGES,
} = require('../../src/config/websiteLanguages');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} must include ${needle}`);
}

function assertNotIncludes(content, needle, label) {
  assert(!content.includes(needle), `${label} must not include ${needle}`);
}

function assertText(value, label) {
  assert(typeof value === 'string' && value.trim().length > 0, `${label} is required`);
}

function assertArray(value, label) {
  assert(Array.isArray(value) && value.length > 0, `${label} must be a non-empty array`);
}

function assertNotFullyFallback(sourceValues, translatedValues, label) {
  const source = sourceValues.filter((value) => typeof value === 'string');
  const translated = translatedValues.filter((value) => typeof value === 'string');
  assert(translated.length > 0, `${label} has no translated values`);

  const allSame = source.length === translated.length
    && source.every((value, index) => value === translated[index]);
  assert(!allSame, `${label} still matches en-US exactly`);
}

function collectArticleText(article) {
  const values = [
    article.title,
    article.metaTitle,
    article.metaDescription,
    article.description,
    article.quickAnswer,
    article.primaryCta?.label,
    ...(article.distributionSnippets || []),
  ];

  for (const section of article.sections || []) {
    values.push(section.title);
    values.push(...(section.body || []));
    values.push(...(section.bullets || []));
    values.push(...(section.checklist || []));
    for (const row of section.comparisonRows || []) {
      values.push(row.label, row.left, row.right);
    }
  }

  for (const faq of article.faq || []) {
    values.push(faq.question, faq.answer);
  }

  return values.filter(Boolean).join('\n');
}

function verifySection(sourceSection, translatedSection, locale, slug) {
  const label = `${locale} ${slug} section ${sourceSection.id}`;
  assert(translatedSection, `${label} missing`);
  assertText(translatedSection.title, `${label} title`);

  if (sourceSection.body) {
    assertArray(translatedSection.body, `${label} body`);
    assertNotFullyFallback(sourceSection.body, translatedSection.body, `${label} body`);
  }

  if (sourceSection.bullets) {
    assertArray(translatedSection.bullets, `${label} bullets`);
    assertNotFullyFallback(sourceSection.bullets, translatedSection.bullets, `${label} bullets`);
  }

  if (sourceSection.checklist) {
    assertArray(translatedSection.checklist, `${label} checklist`);
    assertNotFullyFallback(sourceSection.checklist, translatedSection.checklist, `${label} checklist`);
  }

  if (sourceSection.comparisonRows) {
    assertArray(translatedSection.comparisonRows, `${label} comparisonRows`);
    assert(
      translatedSection.comparisonRows.length === sourceSection.comparisonRows.length,
      `${label} comparisonRows length must match en-US`,
    );
    assertNotFullyFallback(
      sourceSection.comparisonRows.flatMap((row) => [row.label, row.left, row.right]),
      translatedSection.comparisonRows.flatMap((row) => [row.label, row.left, row.right]),
      `${label} comparisonRows`,
    );
  }
}

function verifyPack(pack) {
  assert(pack.sourceVersion === WEBSITE_RESOURCE_SOURCE_VERSION, `${pack.locale} sourceVersion is stale`);
  assert(pack.status === 'reviewed', `${pack.locale} must be reviewed before verification`);
  assertText(pack.reviewedAt, `${pack.locale} reviewedAt`);
  assertText(pack.locale, 'locale');

  const renderedCopy = getWebsiteResourcesCopy(pack.locale);
  assert(renderedCopy.locale === pack.locale, `${pack.locale} is not registered in resource copy resolver`);
  assert(renderedCopy.localeStatus === 'reviewed', `${pack.locale} rendered copy must be reviewed`);
  assert(renderedCopy.sourceVersion === WEBSITE_RESOURCE_SOURCE_VERSION, `${pack.locale} rendered sourceVersion is stale`);

  for (const sourceArticle of enUSWebsiteResources.articles) {
    const articleTranslation = pack.articles[sourceArticle.slug];
    assert(articleTranslation, `${pack.locale} missing article ${sourceArticle.slug}`);
    assertText(articleTranslation.title, `${pack.locale} ${sourceArticle.slug} title`);
    assertText(articleTranslation.metaTitle, `${pack.locale} ${sourceArticle.slug} metaTitle`);
    assertText(articleTranslation.metaDescription, `${pack.locale} ${sourceArticle.slug} metaDescription`);
    assertText(articleTranslation.description, `${pack.locale} ${sourceArticle.slug} description`);
    assertText(articleTranslation.quickAnswer, `${pack.locale} ${sourceArticle.slug} quickAnswer`);
    assertText(articleTranslation.primaryCtaLabel, `${pack.locale} ${sourceArticle.slug} primaryCtaLabel`);

    assertNotFullyFallback(
      [sourceArticle.title, sourceArticle.description, sourceArticle.quickAnswer, sourceArticle.primaryCta.label],
      [articleTranslation.title, articleTranslation.description, articleTranslation.quickAnswer, articleTranslation.primaryCtaLabel],
      `${pack.locale} ${sourceArticle.slug} core copy`,
    );

    for (const sourceSection of sourceArticle.sections) {
      verifySection(
        sourceSection,
        articleTranslation.sections[sourceSection.id],
        pack.locale,
        sourceArticle.slug,
      );
    }

    if (sourceArticle.faq?.length) {
      assert(articleTranslation.faq, `${pack.locale} ${sourceArticle.slug} faq missing`);
      for (const sourceFaq of sourceArticle.faq) {
        const translatedFaq = articleTranslation.faq[sourceFaq.id];
        assert(translatedFaq, `${pack.locale} ${sourceArticle.slug} faq ${sourceFaq.id} missing`);
        assertText(translatedFaq.question, `${pack.locale} ${sourceArticle.slug} faq ${sourceFaq.id} question`);
        assertText(translatedFaq.answer, `${pack.locale} ${sourceArticle.slug} faq ${sourceFaq.id} answer`);
        assertNotFullyFallback(
          [sourceFaq.question, sourceFaq.answer],
          [translatedFaq.question, translatedFaq.answer],
          `${pack.locale} ${sourceArticle.slug} faq ${sourceFaq.id}`,
        );
      }
    }
  }

  for (const article of renderedCopy.articles) {
    const articleText = collectArticleText(article);
    for (const forbiddenClaim of WEBSITE_RESOURCE_FORBIDDEN_PUBLIC_CLAIMS) {
      assert(!articleText.includes(forbiddenClaim), `${pack.locale} ${article.slug} includes forbidden claim: ${forbiddenClaim}`);
    }
  }
}

function verifyReviewedLocaleRoutes() {
  const sitemap = read('public/sitemap.xml');
  const llms = read('public/llms.txt');
  const llmsFull = read('public/llms-full.txt');
  const reviewedPackLocales = WEBSITE_RESOURCE_TRANSLATION_PACKS
    .filter((pack) => pack.status === 'reviewed')
    .map((pack) => pack.locale)
    .filter((locale) => locale !== 'en-US');
  const activeWebsiteLocales = WEBSITE_LANGUAGES
    .map((language) => language.code)
    .filter((locale) => locale !== DEFAULT_WEBSITE_LANGUAGE);

  assert(exists('src/app/(website)/[locale]/layout.tsx'), 'Locale resource layout route is required');
  assert(exists('src/app/(website)/[locale]/resources/page.tsx'), 'Locale resource hub route is required');
  assert(exists('src/app/(website)/[locale]/resources/[slug]/page.tsx'), 'Locale resource article route is required');
  assert(
    JSON.stringify([...WEBSITE_RESOURCE_REVIEWED_ROUTE_LOCALES].sort()) === JSON.stringify(reviewedPackLocales.sort()),
    'Reviewed route locales must match reviewed translation packs',
  );
  assert(
    JSON.stringify([...reviewedPackLocales].sort()) === JSON.stringify(activeWebsiteLocales.sort()),
    'Reviewed resource translation packs must cover every active non-default website language',
  );

  for (const locale of WEBSITE_RESOURCE_REVIEWED_ROUTE_LOCALES) {
    const hubPath = buildWebsiteResourcePath(null, locale);
    assertIncludes(sitemap, `https://menulist.ai${hubPath}`, `${locale} sitemap hub URL`);
    assertIncludes(sitemap, `hreflang="${locale}" href="https://menulist.ai${hubPath}"`, `${locale} sitemap hub hreflang`);
    assertIncludes(llms, `https://menulist.ai${hubPath}`, `${locale} llms hub URL`);
    assertIncludes(llmsFull, `https://menulist.ai${hubPath}`, `${locale} llms-full hub URL`);

    for (const sourceArticle of enUSWebsiteResources.articles) {
      const localizedPath = buildWebsiteResourcePath(sourceArticle.slug, locale);
      assertIncludes(sitemap, `https://menulist.ai${localizedPath}`, `${locale} sitemap ${sourceArticle.slug}`);
      assertIncludes(sitemap, `hreflang="${locale}" href="https://menulist.ai${localizedPath}"`, `${locale} hreflang ${sourceArticle.slug}`);
      assertIncludes(llmsFull, `https://menulist.ai${localizedPath}`, `${locale} llms-full ${sourceArticle.slug}`);
    }
  }

  for (const plannedLocale of WEBSITE_RESOURCE_PLANNED_INDIAN_LOCALES) {
    assert(!sitemap.includes(`https://menulist.ai/${plannedLocale}/resources`), `${plannedLocale} must stay out of sitemap until reviewed`);
    assert(!llms.includes(`https://menulist.ai/${plannedLocale}/resources`), `${plannedLocale} must stay out of llms.txt until reviewed`);
    assert(!llmsFull.includes(`https://menulist.ai/${plannedLocale}/resources`), `${plannedLocale} must stay out of llms-full.txt until reviewed`);
  }
}

function verifyDefaultResourceRoutes() {
  const hubRoute = read('src/app/(website)/resources/page.tsx');
  const articleRoute = read('src/app/(website)/resources/[slug]/page.tsx');
  const shell = read('src/components/website/resources/ResourcePageShell.tsx');
  const articleSection = read('src/components/website/resources/ArticleSection.tsx');
  const defaultRoutes = [
    ['default resource hub route', hubRoute],
    ['default resource article route', articleRoute],
  ];

  for (const [label, content] of defaultRoutes) {
    assert(!content.includes('next-intl/server'), `${label} must not derive content from the user locale cookie`);
    assertIncludes(content, 'DefaultWebsiteResourceLocaleBoundary', label);
    assertIncludes(content, 'WEBSITE_RESOURCE_DEFAULT_LOCALE', label);
  }

  assertIncludes(shell, 'DefaultWebsiteResourceLocaleBoundary', 'resource shell');
  assertIncludes(shell, `locale={WEBSITE_RESOURCE_DEFAULT_LOCALE}`, 'default resource locale boundary');
  assertIncludes(shell, `lang={WEBSITE_RESOURCE_DEFAULT_LOCALE}`, 'default resource locale boundary language wrapper');
  assertIncludes(shell, `dir="ltr"`, 'default resource locale boundary direction');
  assertIncludes(shell, 'public/locales/menulist.ai/en-US.json', 'default resource locale boundary messages');
  assertIncludes(articleSection, 'copyResourceChecklistToClipboard', 'resource article checklist copy helper');
  assertIncludes(articleSection, 'website_resource_checklist_copy_unavailable', 'resource article checklist clipboard unavailable code');
  assertIncludes(articleSection, 'website_resource_checklist_copy_failed', 'resource article checklist copy diagnostics');
  assertIncludes(articleSection, 'hasClipboardWrite', 'resource article checklist copy support metadata');
  assertIncludes(articleSection, 'hasCopyFallback', 'resource article checklist copy fallback metadata');
  assertIncludes(articleSection, 'clipboardWriteError', 'resource article checklist copy falls through after Clipboard API rejection');
  assertIncludes(articleSection, 'hasResourceChecklistCopyFallback()', 'resource article checklist copy checks fallback before textarea setup');
  assertIncludes(articleSection, "const copied = document.execCommand('copy');", 'resource article checklist fallback acknowledgement');
  assertNotIncludes(
    articleSection,
    "await navigator.clipboard.writeText(checklistText);\n        return;",
    'resource article checklist copy must not stop at rejected Clipboard API writes',
  );
  assertNotIncludes(
    articleSection,
    'await navigator.clipboard.writeText(checklistText);\n            setCopied(true);',
    'resource article checklist copy direct success flow',
  );
  assertNotIncludes(
    articleSection,
    '} catch {\n            setCopied(false);\n        }',
    'resource article checklist copy silent catch',
  );
  assert(
    WEBSITE_RESOURCE_DEFAULT_LOCALE === DEFAULT_WEBSITE_LANGUAGE,
    'Default website resource locale must match the public default website language',
  );
}

assert(WEBSITE_RESOURCE_TRANSLATION_PACKS.length > 0, 'At least one resource translation pack must exist');

for (const pack of WEBSITE_RESOURCE_TRANSLATION_PACKS) {
  verifyPack(pack);
}

verifyReviewedLocaleRoutes();
verifyDefaultResourceRoutes();

console.log(`Website resource locale packs verified: ${WEBSITE_RESOURCE_TRANSLATION_PACKS.map((pack) => pack.locale).join(', ')}`);
