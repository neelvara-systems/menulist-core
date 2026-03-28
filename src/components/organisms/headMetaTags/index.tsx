import Head from "next/head";
import { DEFAULT_DESCRIPTION_METATAG, DEFAULT_IMAGE_METATAG, DEFAULT_KEYWORD_METATAG, DEFAULT_SITENAME_METATAG, DEFAULT_TITLE_METATAG } from "src/constants/defaultValues";
export default function HeadMetaTags({ title, description, image, siteName, storeData }) {
  if (!storeData) storeData = {};
  const titleTagData = title || DEFAULT_TITLE_METATAG;
  const descriptionTagData = description || DEFAULT_DESCRIPTION_METATAG;
  const imageTagData = image || DEFAULT_IMAGE_METATAG;
  const siteNameTagData = siteName || DEFAULT_SITENAME_METATAG;
  const keywordsTagData = descriptionTagData + ' ' + DEFAULT_KEYWORD_METATAG;
  // enable pwa
  // let manifestString: any = '';
  // if (storeData?.configData?.storeConfig?.manifestConfig) {
  //   const theme_color = '';
  //   const manifestConfig = storeData.configData.storeConfig.manifestConfig;
  //   const start_url = manifestConfig.start_url != "/" ? manifestConfig.start_url : ((storeData.host.includes('localhost') ? `http://${storeData.host}${storeData.baseRouteUrl}` : `https://${storeData.host}${storeData.baseRouteUrl}` || '/'))
  //   manifestString = JSON.stringify({
  //     ...{
  //       "name": `${manifestConfig.name}` || 'Respark',
  //       "short_name": manifestConfig.short_name || `${storeData.tenant}` || 'Respark',
  //       "start_url": start_url,
  //       "scope": start_url,
  //       "display": "standalone",
  //       "background_color": manifestConfig.background_color || theme_color || "#dee1ec",
  //       "theme_color": manifestConfig.theme_color || theme_color || "#dee1ec",
  //       "orientation": "portrait",
  //       "description": manifestConfig.description || storeData.description,
  //       "id": storeData.tenantId,
  //       "icons": [
  //         {
  //           "src": manifestConfig.icons['180'],
  //           "type": "image/png",
  //           "sizes": "180x180"
  //         },
  //         {
  //           "src": manifestConfig.icons['192'],
  //           "type": "image/png",
  //           "sizes": "192x192"
  //         },
  //         {
  //           "src": manifestConfig.icons['384'],
  //           "type": "image/png",
  //           "sizes": "384x384"
  //         },
  //         {
  //           "src": manifestConfig.icons['512'],
  //           "type": "image/png",
  //           "sizes": "512x512"
  //         },
  //         {
  //           "src": manifestConfig.icons['1024'],
  //           "type": "image/png",
  //           "sizes": "1024x1024"
  //         }
  //       ],
  //       "related_applications": [{
  //         "platform": "webapp",
  //         "url": storeData.host.includes('localhost') ? `http://${storeData.host}/manifest.json` : `https://${storeData.host}/manifest.json`
  //       }]
  //     },
  //   });
  // }
  // enable pwa

  return (
    <Head>
      {/* // enable pwa */}
      {/* <link rel="manifest" id="manifest" href={`data:application/json;charset=utf-8,${encodeURIComponent(manifestString)}`} /> */}
      {/* // enable pwa */}

      {/* Coomon meta tags */}
      <title>{titleTagData}</title>
      <meta name="title" key="title" content={titleTagData} />
      <meta name="description" key="description" content={descriptionTagData} />
      <meta name="keywords" key="keywords" content={keywordsTagData}
      />

      <meta name="application-name" content="Respark" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="Respark" />
      <meta name="description" content="Best Respark in the world" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="mobile-web-app-capable" content="yes" />

      {/* FB meta Tags */}
      <meta property="og:site_name" content={siteNameTagData} key="ogsitename" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={titleTagData} key="ogtitle" />
      <meta property="og:description" content={descriptionTagData} key="ogdesc" />
      <meta property="og:image" content={imageTagData} key="ogimage" />

      {/* Twitter meta Tags */}
      <meta name="twitter:title" content={titleTagData} key="twittertitle" />
      <meta name="twitter:description" content={descriptionTagData} key="twitterdesc" />
      <meta name="twitter:image" content={imageTagData} key="twitterimage" />
      <meta name="twitter:site" content="Ecoms.ai Salon" key="twittersitename" />
      <meta name="twitter:creator" content="Ecoms.ai" />
      {/* application meta tags */}

      {/* <meta name="viewport" content="width=device-width,initial-scale=1" /> */}
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      <meta name="robots" content="index, follow" />
      <link rel="shortcut icon" type="image/png" href="/favicon.ico" />

    </Head>
  );
}
