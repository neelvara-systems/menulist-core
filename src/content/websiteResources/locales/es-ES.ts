import { WEBSITE_RESOURCE_SOURCE_VERSION } from '../sourceVersion';
import type { WebsiteResourceTranslationPack } from '../types';

export const esESResourceTranslationPack: WebsiteResourceTranslationPack = {
    "locale": "es-ES",
    "status": "reviewed",
    "sourceVersion": WEBSITE_RESOURCE_SOURCE_VERSION,
    "reviewedAt": "2026-06-01",
    "clusterLabels": {
        "source-audit": "Auditoría de origen",
        "official-source": "fuente oficial",
        "qr-menu": "Menú QR",
        "google-menu": "Menú Google",
        "menu-seo": "Menú SEO",
        "ai-discovery": "descubrimiento AI",
        "menu-engineering": "Ingeniería de menú",
        "checklists": "Lista de verificación",
        "multi-location": "Ubicación múltiple"
    },
    "labels": {
        "allResources": "Todos los recursos",
        "backToHub": "Volver a recursos",
        "checklist": "Lista de verificación",
        "comparison": "Comparación",
        "copiedChecklist": "Lista copiada",
        "copyChecklist": "Copiar lista",
        "faqTitle": "Preguntas que hacen los propietarios",
        "onThisPage": "En esta pagina",
        "primaryAction": "Siguiente paso",
        "quickAnswer": "respuesta rapida",
        "readingTime": "tiempo de lectura",
        "readResource": "Leer recurso",
        "relatedResources": "Recursos relacionados",
        "resources": "Recursos",
        "updated": "Actualizado"
    },
    "hub": {
        "eyebrow": "Recursos de corrección del menú",
        "title": "Aprenda cómo mantener actualizado un menú público.",
        "titleHighlight": "un menú público actual",
        "subtitle": "Guías sencillas, auditorías, hojas de trabajo y listas de verificación para propietarios que desean que los clientes vean el mismo menú actual en QR, Google, WhatsApp, sitios web, pantallas y material impreso.",
        "primaryCta": {
            "label": "Sube tu menú",
            "href": "/create-menu"
        },
        "secondaryCta": {
            "label": "Comience con la auditoría",
            "href": "/resources/menu-source-audit"
        },
        "proofItems": [
            "Guías del propietario de hoja perenne",
            "Visible HTML para sistemas de búsqueda y respuesta.",
            "Sin promesas de clasificación o citas"
        ],
        "clusterTitle": "Empiece por el problema que ven los clientes",
        "clusterSubtitle": "Cada recurso explica una superficie práctica donde los menús se vuelven obsoletos y luego dirige al propietario de regreso a una fuente aprobada.",
        "toolTitle": "Herramientas y listas de verificación",
        "toolSubtitle": "Utilice estas páginas como listas de verificación de trabajo con el personal, impresores, consultores o gerentes de ubicación."
    },
    "articles": {
        "menu-source-audit": {
            "title": "Encuentre todos los lugares en los que los clientes aún puedan ver un menú antiguo",
            "metaTitle": "Auditoría de fuentes de menús para restaurantes | MenuList",
            "metaDescription": "Verifique Google, QR codes, WhatsApp, Instagram, PDFs, archivos de personal, sitios web y copias de sucursales para ver versiones antiguas del menú.",
            "description": "Una auditoría práctica para encontrar copias de menús antiguas antes de que confundan a los clientes.",
            "quickAnswer": "Una auditoría de fuente de menú verifica todos los lugares públicos y compartidos por el personal donde un cliente aún puede ver precios antiguos, artículos antiguos o un archivo de menú desactualizado. El objetivo es un enlace de menú aprobado actualmente detrás de cada superficie.",
            "primaryCtaLabel": "Sube tu menú actual",
            "sections": {
                "why-old-menus-remain": {
                    "title": "Por qué los menús antiguos siguen siendo visibles",
                    "body": [
                        "Los cambios en el menú son simples dentro del negocio, pero la versión anterior sigue viajando. Un PDF permanece en WhatsApp. Una tabla QR abre un archivo antiguo. Una foto del cliente permanece en Google. Un miembro del personal envía la captura de pantalla del mes pasado.",
                        "El cliente sólo ve el desajuste. No saben qué versión es la correcta."
                    ]
                },
                "places-to-check": {
                    "title": "Lugares para comprobar primero",
                    "body": [
                        "Comience con las superficies que utilizan los clientes antes de llamar, visitar, realizar pedidos o compartir el negocio."
                    ],
                    "checklist": [
                        "Enlace del menú Google Business Profile",
                        "Fotos del menú Google subidas por el propietario o los clientes.",
                        "QR codes en mesas, mostradores, ventanas, embalajes y carpetas de facturas",
                        "Enlaces del catálogo WhatsApp, grupos y respuestas guardadas",
                        "Enlace de biografía Instagram, historias destacadas y publicaciones antiguas",
                        "Página de menú del sitio web empresarial o PDF",
                        "PDFs impreso, folletos para llevar y carpas de mesa",
                        "Teléfonos del personal, carpetas compartidas del personal y archivos de recepción",
                        "Enlaces de entrega o pedidos que muestran el contenido del menú.",
                        "Copias específicas de sucursal para cada ubicación"
                    ]
                },
                "monthly-check": {
                    "title": "cheque mensual",
                    "body": [
                        "La auditoría debe ser lo suficientemente breve como para ejecutarse después de cambios de precios, cambios de disponibilidad y cambios de menú estacionales."
                    ],
                    "checklist": [
                        "Abra el QR code con un teléfono de cliente.",
                        "Busque la empresa en Google y abra cada superficie de menú que se muestra.",
                        "Abra los enlaces Instagram y WhatsApp que ven los clientes.",
                        "Pregúntele a un miembro del personal qué archivo de menú envía cuando un cliente pregunta.",
                        "Confirme que los gerentes de sucursal no estén utilizando menús copiados de un establecimiento anterior."
                    ]
                },
                "how-menulist-fits": {
                    "title": "Cómo encaja MenuList",
                    "body": [
                        "MenuList le brinda a la empresa una fuente de menú aprobada y un enlace público. QR, enlaces a sitios web, accesos directos a menús guardados, recursos impresos y páginas oficiales pueden apuntar a esa fuente actual.",
                        "Las plataformas externas aún deciden qué rastrean, muestran, almacenan en caché o actualizan. El trabajo de MenuList es hacer que la fuente oficial sea más clara y más fácil de reutilizar."
                    ]
                }
            },
            "distributionSnippets": [
                "La mayoría de los problemas del menú no están dentro del menú. Se encuentran en copias antiguas que aún están visibles en las tarjetas Google, WhatsApp, QR y en los archivos del personal.",
                "Antes de imprimir un nuevo QR code, verifique dónde se sigue compartiendo el menú anterior."
            ],
            "faq": {
                "audit-frequency": {
                    "question": "¿Con qué frecuencia una empresa debe realizar esta auditoría?",
                    "answer": "Ejecútelo después de cada cambio de precio, cambio de menú de temporada, cambio de sucursal o actualización impresa de QR. Para menús estables, basta con un control mensual."
                },
                "google-photos-removal": {
                    "question": "¿MenuList elimina fotos antiguas de Google?",
                    "answer": "No. Google controla el contenido de Google Business Profile. MenuList le brinda al propietario una fuente de menú oficial actual para colocar en los campos correctos y en los enlaces públicos."
                },
                "old-pdf-deletion": {
                    "question": "¿Deberían eliminarse todos los PDF antiguos?",
                    "answer": "El antiguo público PDFs debería dejar de ser la principal fuente de clientes. Un PDF actual aún puede ser útil para imprimir o realizar copias de seguridad cuando se genera desde el menú aprobado."
                }
            }
        },
        "menu-engineering": {
            "title": "La ingeniería de menús comienza con el menú que los clientes realmente ven.",
            "metaTitle": "La ingeniería del menú comienza con el menú público | MenuList",
            "metaDescription": "Utilice los conceptos básicos de ingeniería de menús solo después de que el menú orientado al cliente esté actualizado, claro y aprobado por el propietario.",
            "description": "Una guía práctica para el propietario sobre ingeniería de menús sin pretender que MenuList reemplace el costo de los alimentos o el análisis de POS.",
            "quickAnswer": "La ingeniería de menús revisa los artículos, los precios, la ubicación y la claridad para el cliente. Funciona mejor cuando el menú público se actualiza primero, porque los propietarios no pueden mejorar un menú que los clientes realmente no ven.",
            "primaryCtaLabel": "Sube tu menú actual",
            "sections": {
                "meaning": {
                    "title": "¿Qué significa la ingeniería de menús?",
                    "body": [
                        "La ingeniería de menús suele agrupar elementos por popularidad y margen. Los propietarios utilizan esa vista para decidir qué elementos destacar, reescribir, cambiar el precio, mover o eliminar.",
                        "MenuList no debería pretender calcular la rentabilidad total a menos que los datos de costos de alimentos y ventas estén conectados. El primer paso seguro es mantener el menú público actualizado y más fácil de revisar."
                    ]
                },
                "customer-facing-first": {
                    "title": "El menú de cara al cliente es lo primero",
                    "body": [
                        "Si los clientes ven precios o artículos antiguos, mejores etiquetas de los artículos y una mejor ubicación no solucionarán el problema principal. El propietario necesita un menú actualizado antes de juzgar qué mejorar."
                    ],
                    "bullets": [
                        "Los nombres de los artículos deben coincidir con los que utilizan el personal y los clientes.",
                        "Los precios deben coincidir con el menú aprobado actualmente.",
                        "Las descripciones deberían facilitar la elección, no tomar más tiempo.",
                        "Las fotos deben coincidir con el artículo que se vende.",
                        "Las secciones deben seguir cómo deciden los clientes."
                    ]
                },
                "matrix": {
                    "title": "La matriz básica de ingeniería de menús.",
                    "comparisonRows": [
                        {
                            "label": "estrellas",
                            "left": "Alta popularidad",
                            "right": "Alto margen"
                        },
                        {
                            "label": "Rompecabezas",
                            "left": "Baja popularidad",
                            "right": "Alto margen"
                        },
                        {
                            "label": "caballos de arado",
                            "left": "Alta popularidad",
                            "right": "Margen bajo"
                        },
                        {
                            "label": "Perros",
                            "left": "Baja popularidad",
                            "right": "Margen bajo"
                        }
                    ]
                },
                "actions": {
                    "title": "Acciones útiles",
                    "checklist": [
                        "Mantenga las estrellas visibles y fáciles de ordenar.",
                        "Vuelva a escribir o reposicionar los rompecabezas antes de eliminarlos.",
                        "Revise el precio, las porciones y la ubicación de los caballos de arado.",
                        "Retire u oculte a los perros sólo después de comprobar la necesidad operativa.",
                        "Mantener alineados los precios públicos antes de imprimir material nuevo."
                    ]
                },
                "how-menulist-fits": {
                    "title": "Cómo encaja MenuList",
                    "body": [
                        "MenuList mantiene la fuente del menú público estructurada, actualizada y aprobada por el propietario. Esto le brinda al propietario un punto de partida más limpio para la revisión del menú, la ubicación de QR, la copia de búsqueda pública y el material impreso."
                    ]
                }
            },
            "distributionSnippets": [
                "La ingeniería de menús no comienza en una hoja de cálculo. Comienza con el menú que los clientes realmente ven."
            ],
            "faq": {
                "profitability-calculation": {
                    "question": "¿MenuList calcula la rentabilidad del artículo?",
                    "answer": "No. MenuList puede mantener la fuente del menú público actualizada y estructurada. La ingeniería de rentabilidad completa necesita datos sobre costos de alimentos y ventas."
                },
                "engineering-without-pos": {
                    "question": "¿Se puede realizar la ingeniería de menús sin datos de POS?",
                    "answer": "Una revisión básica puede utilizar el conocimiento del propietario, las aportaciones del personal y la claridad del cliente. Los datos de POS lo fortalecen, pero el menú público aún debe estar actualizado primero."
                }
            }
        },
        "qr-menu-for-restaurants": {
            "title": "Un QR code solo es útil cuando el menú detrás de él está actual",
            "metaTitle": "QR Menú para Restaurantes | MenuList",
            "metaDescription": "Planifique los menús de QR en torno a un enlace de menú estable, ubicación en la tabla, pruebas de escaneo y contenido actual orientado al cliente.",
            "description": "Una guía de menú QR centrada en la fuente detrás del código.",
            "quickAnswer": "Un restaurante QR code debería abrir un enlace de menú estable, actual y compatible con dispositivos móviles. El QR en sí es sólo una puerta. La fuente del menú detrás decide si los clientes confían en él.",
            "primaryCtaLabel": "Crea un menú oficial QR",
            "sections": {
                "what-qr-opens": {
                    "title": "Lo que debería abrir el QR",
                    "body": [
                        "El QR debería abrir una página de menú público actual que funcione en un teléfono, muestre la identidad comercial y permanezca legible sin descargar un archivo pesado."
                    ],
                    "bullets": [
                        "Nombres y precios de artículos actuales",
                        "Borrar secciones",
                        "Estado abierto y detalles comerciales cuando estén disponibles",
                        "Llamar, WhatsApp, direcciones o pedir entregas cuando la empresa las tenga.",
                        "Un URL estable que puede permanecer igual después de cambios de menú"
                    ]
                },
                "why-qr-fails": {
                    "title": "Por qué fallan los menús QR",
                    "checklist": [
                        "El QR abre un antiguo PDF.",
                        "La página es difícil de leer en un teléfono.",
                        "El enlace cambia después de cada actualización del menú.",
                        "El personal imprime nuevas tarjetas QR sin comprobar las antiguas.",
                        "Los clientes escanean con poca iluminación o desde demasiado lejos."
                    ]
                },
                "placement": {
                    "title": "Dónde colocar QR codes",
                    "body": [
                        "La ubicación de QR debe coincidir con la que decidan los clientes. Una tabla QR es útil para navegar. Un mostrador QR funciona para comida para llevar. Un empaque QR funciona para los clientes habituales después de que se van."
                    ],
                    "checklist": [
                        "Mesas y mostradores",
                        "Entrada o zona de espera",
                        "Carpetas de facturas y recibos.",
                        "Envases para llevar",
                        "Pegatinas para bolsas de entrega",
                        "Pósteres para ventanas"
                    ]
                },
                "testing": {
                    "title": "Prueba de escaneo antes de imprimir",
                    "checklist": [
                        "Pruebe con iPhone y Android.",
                        "Pruebe con la misma iluminación que utilizarán los clientes.",
                        "Abra el enlace sobre datos móviles, no solo Wi-Fi.",
                        "Confirme que la página abre el menú actual.",
                        "Mantenga el breve URL legible impreso debajo de QR."
                    ]
                }
            },
            "faq": {
                "qr-opens-pdf": {
                    "question": "¿Debería un QR code abrir un PDF?",
                    "answer": "Un PDF puede funcionar como respaldo, pero no debería ser la fuente principal del cliente cuando el menú cambia con frecuencia."
                },
                "same-qr-after-changes": {
                    "question": "¿Puede funcionar el mismo QR después de cambios de menú?",
                    "answer": "Sí, cuando QR apunta a un enlace MenuList estable y el menú detrás de ese enlace se actualiza."
                }
            }
        },
        "digital-menu-vs-pdf-menu": {
            "title": "Un PDF puede ser útil, pero no debería ser la fuente principal del menú público.",
            "metaTitle": "Menú digital frente a Menú PDF | MenuList",
            "metaDescription": "Compare menús digitales móviles, PDFs e imprima archivos para enlaces, actualizaciones y confianza del cliente de QR codes, WhatsApp, Google.",
            "description": "Una página de comparación para propietarios que todavía usan el menú PDFs e imprimen archivos en todas partes.",
            "quickAnswer": "Un PDF o un archivo de impresión es útil para imprimir, compartir de forma controlada y realizar copias de seguridad, pero un menú digital móvil suele ser mejor como fuente pública principal porque puede permanecer actualizado, permite realizar búsquedas y es más fácil de leer en los teléfonos.",
            "primaryCtaLabel": "Reemplace su antiguo menú PDF",
            "sections": {
                "pdf-useful": {
                    "title": "Donde son útiles los PDFs",
                    "bullets": [
                        "Paquete de entrega de impresora",
                        "Un archivo de respaldo para el personal",
                        "Un menú de comida para llevar estático cuando los precios rara vez cambian",
                        "Una versión descargable generada desde el menú aprobado actual."
                    ]
                },
                "pdf-problems": {
                    "title": "Donde PDFs crea problemas",
                    "body": [
                        "PDFs sigue circulando después de que cambia el menú. Un cliente puede abrir un archivo guardado del mes pasado y tratarlo como actual."
                    ],
                    "checklist": [
                        "Los precios anteriores permanecen en WhatsApp.",
                        "Los archivos grandes se cargan lentamente en los datos móviles.",
                        "Puede resultar difícil ampliar y escanear el texto.",
                        "Varias versiones de PDF crean confusión en el origen."
                    ]
                },
                "comparison": {
                    "title": "Menú digital vs menú PDF",
                    "comparisonRows": [
                        {
                            "label": "Lectura móvil",
                            "left": "Creado para navegar por teléfono",
                            "right": "A menudo requiere zoom"
                        },
                        {
                            "label": "Actualizaciones",
                            "left": "El mismo enlace puede mostrar el menú más reciente.",
                            "right": "El nuevo archivo debe reemplazar las copias antiguas."
                        },
                        {
                            "label": "Buscar",
                            "left": "Los clientes pueden buscar y saltar secciones.",
                            "right": "Depende de la calidad PDF"
                        },
                        {
                            "label": "Imprimir",
                            "left": "Puede generar archivos PDF actuales y de transferencia de impresora",
                            "right": "Bueno para impresión directa"
                        }
                    ]
                },
                "safe-setup": {
                    "title": "La configuración más segura",
                    "body": [
                        "Utilice una página de menú digital actual como fuente principal de clientes. Cuando necesite papel, WhatsApp o una transferencia de impresora, genere el PDF o paquete desde ese menú aprobado en lugar de mantener un archivo separado."
                    ]
                }
            },
            "faq": {
                "stop-using-pdfs": {
                    "question": "¿Debería una empresa dejar de utilizar PDFs por completo?",
                    "answer": "No. PDFs y los paquetes de impresión aún funcionan para imprimir y compartir de forma controlada. Deben generarse a partir del menú aprobado actual, no mantenerse como fuente pública principal."
                }
            }
        },
        "google-business-profile-menu": {
            "title": "Proporcione a Google una fuente de menú más clara para leer",
            "metaTitle": "Google Business Profile Fuente del menú | MenuList",
            "metaDescription": "Utilice un enlace de menú actual para Google Business Profile y evite reclamos sobre clasificación, tiempo de actualización o actualizaciones automáticas de Google.",
            "description": "Una cuidadosa guía para el propietario de enlaces de menú, fotos y limpieza de menús antiguos de Google.",
            "quickAnswer": "Google Business Profile puede mostrar enlaces de menú, fotos de menú e imágenes cargadas por el cliente. Un enlace de menú oficial actual reduce la confusión, pero Google decide qué rastrea, muestra y actualiza.",
            "primaryCtaLabel": "Utilice un enlace de menú oficial",
            "sections": {
                "why-outdated": {
                    "title": "Por qué la información del menú Google queda obsoleta",
                    "body": [
                        "Google puede mostrar enlaces comerciales, enlaces de menú, fotografías, imágenes cargadas por clientes y otro contenido descubierto. Si los archivos antiguos siguen siendo públicos, los clientes aún podrán encontrarlos."
                    ]
                },
                "what-to-check": {
                    "title": "Qué comprobar en Google Business Profile",
                    "checklist": [
                        "Menú URL o campo del sitio web",
                        "Fotos del menú subidas por el propietario",
                        "Fotos del menú cargadas por el cliente",
                        "Enlaces antiguos PDF en el sitio web empresarial",
                        "Configuración de fuente de menú preferida cuando esté disponible",
                        "Consistencia de horarios comerciales, teléfonos y direcciones"
                    ]
                },
                "old-menu-cleanup": {
                    "title": "Limpieza de menú antiguo",
                    "body": [
                        "El propietario debe eliminar o reemplazar las fotos del menú y los enlaces que controla. Es posible que las fotografías cargadas por los clientes necesiten informes o administración por parte del propietario a través de las herramientas Google."
                    ],
                    "checklist": [
                        "Reemplace el enlace del menú con el menú oficial actual URL.",
                        "Elimine las fotos de menú obsoletas cargadas por el propietario.",
                        "Informe las fotos antiguas del menú cargadas por los clientes cuando sea apropiado.",
                        "Verifique la vista visible del cliente después de los cambios.",
                        "Mantenga el mismo menú actual URL en QR, Instagram, WhatsApp y el sitio web comercial."
                    ]
                },
                "claim-limit": {
                    "title": "Lo que no controla MenuList",
                    "body": [
                        "MenuList no controla la clasificación de Google, la ubicación de los mapas de Google, las decisiones de eliminación de fotografías, el tiempo de rastreo ni los resúmenes de AI. MenuList prepara una fuente de menú oficial más clara que los propietarios pueden colocar donde miran Google y los clientes."
                    ]
                }
            },
            "distributionSnippets": [
                "Google no puede arreglar un sistema de menú disperso por sí solo. Dale una fuente actual más clara para leer."
            ],
            "faq": {
                "automatic-google-update": {
                    "question": "¿Un enlace MenuList actualizará Google automáticamente?",
                    "answer": "No. Los propietarios aún administran Google Business Profile. MenuList les proporciona un enlace de menú oficial actual para usar."
                },
                "old-customer-photos": {
                    "question": "¿Pueden permanecer visibles las fotos antiguas del menú del cliente?",
                    "answer": "Sí. Google controla las fotos cargadas por los clientes. Los propietarios pueden gestionarlos o reportarlos a través de las herramientas Google Business Profile."
                }
            }
        },
        "official-menu-source": {
            "title": "Los clientes no deberían tener que adivinar qué menú es el correcto.",
            "metaTitle": "Fuente oficial de menús para restaurantes | MenuList",
            "metaDescription": "Defina una fuente de menú público aprobada para QR codes, Google, WhatsApp, Instagram, sitios web, impresión y equipos de múltiples ubicaciones.",
            "description": "El concepto central de MenuList explicado en el lenguaje del propietario.",
            "quickAnswer": "Una fuente de menú oficial es la versión de menú aprobada por el propietario a la que debe apuntar cada enlace y material público. Los clientes no deben comparar PDFs, fotos y enlaces QR para adivinar qué es lo actual.",
            "primaryCtaLabel": "Crea una fuente de menú oficial",
            "sections": {
                "problem": {
                    "title": "El problema con las copias de menús en todas partes",
                    "body": [
                        "Una empresa puede tener un menú actualizado internamente y muchas copias desactualizadas públicamente. Los clientes ven capturas de pantalla, PDFs guardados, enlaces antiguos de QR, fotos de Google, publicaciones de Instagram y archivos compartidos por el personal.",
                        "La fuente oficial da a cada superficie un único lugar al que señalar."
                    ]
                },
                "what-source-includes": {
                    "title": "Qué debe incluir una fuente de menú oficial",
                    "checklist": [
                        "Nombre e identidad comercial",
                        "Secciones actuales, artículos, precios y disponibilidad.",
                        "Actualización del menú o señales de frescura.",
                        "Diseño amigable para el teléfono",
                        "Llamada, WhatsApp, direcciones, pedidos o transferencias de reservas cuando se utilizan",
                        "URL estable para QR, Google, Instagram, WhatsApp, impresión y enlaces a sitios web"
                    ]
                },
                "when-prices-change": {
                    "title": "Cuando los precios o artículos cambian",
                    "body": [
                        "El propietario actualiza la fuente aprobada. El QR y los enlaces de los clientes deberían seguir abriendo la versión actual en lugar de obligar al propietario a buscar todos los archivos antiguos."
                    ]
                },
                "how-menulist-fits": {
                    "title": "Cómo encaja MenuList",
                    "body": [
                        "MenuList convierte el menú actual en una fuente pública estructurada. La misma fuente puede admitir menús QR, páginas oficiales, enlaces para compartir, activos de impresión/PDF, pantallas y control de múltiples ubicaciones."
                    ]
                }
            },
            "faq": {
                "official-source-vs-website": {
                    "question": "¿Es lo mismo una fuente de menú oficial que un sitio web?",
                    "answer": "No exactamente. Un sitio web puede incluir muchas páginas. La fuente oficial del menú es la verdad del menú actual a la que los clientes deben acceder desde todas las superficies públicas."
                }
            }
        },
        "restaurant-menu-seo": {
            "title": "Haga que su menú sea más fácil de entender para los clientes y los sistemas de búsqueda.",
            "metaTitle": "Menú del Restaurante SEO Guía | MenuList",
            "metaDescription": "Descubra cómo el texto del menú visible, el URLs estable, los encabezados, los metadatos, los enlaces internos y los datos estructurados respaldan el descubrimiento de menús sin promesas de clasificación.",
            "description": "Una guía práctica SEO para páginas de menús de restaurantes.",
            "quickAnswer": "El menú del restaurante SEO comienza con texto visible, un menú estable URL, títulos claros, metadatos útiles, enlaces internos y datos estructurados que coinciden con la página. Ningún sistema puede garantizar las clasificaciones.",
            "primaryCtaLabel": "Publicar una página de menú oficial",
            "sections": {
                "visible-text": {
                    "title": "El texto visible importa",
                    "body": [
                        "Los sistemas de búsqueda y los motores de respuesta necesitan contenido de página legible. Un menú atrapado dentro de una imagen o un PDF antiguo es más difícil de entender que una página estructurada con nombres de elementos, secciones, precios y contexto comercial visibles."
                    ]
                },
                "stable-url": {
                    "title": "Un menú estable URL importa",
                    "body": [
                        "Un URL estable permite que los campos QR codes, Google, los perfiles sociales y los clientes apunten al mismo lugar. El contenido puede actualizarse detrás del enlace mientras el enlace sigue siendo familiar."
                    ]
                },
                "seo-basics": {
                    "title": "Menú útil SEO conceptos básicos",
                    "checklist": [
                        "Un H1 para la página.",
                        "Borrar títulos de sección.",
                        "Nombres y descripciones de elementos legibles.",
                        "Metadatos que coinciden con el contenido visible de la página.",
                        "Enlaces internos desde la página de inicio o página comercial al menú.",
                        "Esquema que describe sólo lo que la página muestra visiblemente."
                    ]
                },
                "claim-limit": {
                    "title": "Lo que SEO no puede prometer",
                    "body": [
                        "Los motores de búsqueda deciden el rastreo, la clasificación, los resultados enriquecidos y los fragmentos. Una mejor página de menú les brinda una fuente más clara, pero no obliga a su ubicación."
                    ]
                }
            },
            "faq": {
                "structured-data-guarantee": {
                    "question": "¿Los datos estructurados garantizan resultados enriquecidos?",
                    "answer": "No. Los datos estructurados deben coincidir con el contenido visible. Los motores de búsqueda deciden si utilizarlo."
                }
            }
        },
        "ai-search-menu-discovery": {
            "title": "Haga que su menú actual sea más fácil de entender para los sistemas de búsqueda y AI",
            "metaTitle": "AI Menú de búsqueda Descubrimiento | MenuList",
            "metaDescription": "Prepare una fuente de menú público más clara para sistemas de búsqueda y AI con archivos de contexto HTML, esquema, mapa del sitio, robots y LLM visibles.",
            "description": "Una guía OEA cuidadosa sin promesas de clasificación ni citas.",
            "quickAnswer": "Los sistemas de búsqueda AI funcionan mejor con fuentes públicas claras. Una página de menú actual con texto visible, esquema, señales de mapa del sitio, política de robots y contexto LLM es más fácil de leer que PDFs dispersos e imágenes antiguas.",
            "primaryCtaLabel": "Crea una fuente de menú oficial",
            "sections": {
                "why-ai-needs-source": {
                    "title": "Por qué los sistemas AI necesitan una fuente clara",
                    "body": [
                        "Los asistentes y sistemas de respuesta AI pueden resumir información pública de resultados de búsqueda, páginas rastreadas, recuperaciones activadas por el usuario y datos estructurados. Cuando las copias antiguas del menú permanecen en línea, los resúmenes pueden volverse inciertos o obsoletos."
                    ]
                },
                "what-readable-means": {
                    "title": "Que significa legible",
                    "checklist": [
                        "El texto del menú importante está visible en HTML.",
                        "El esquema coincide con el contenido de la página visible.",
                        "El mapa del sitio enumera las páginas públicas activas.",
                        "La política de robots es intencional.",
                        "Los archivos de contexto de LLM explican hechos y límites públicos.",
                        "La página indica lo que los sistemas externos deciden por sí mismos."
                    ]
                },
                "scattered-sources": {
                    "title": "Por qué los archivos dispersos confunden las respuestas",
                    "body": [
                        "Una página de menú actual dice una cosa. Una vieja PDF, una vieja foto Google y una vieja imagen WhatsApp dicen algo más. La fuente más clara debe ser la que mantiene el propietario."
                    ]
                },
                "claim-limit": {
                    "title": "Lo que MenuList no garantiza",
                    "body": [
                        "MenuList no garantiza las clasificaciones de Google, las citas de ChatGPT, la ubicación de las respuestas de AI, el tiempo de rastreo ni las actualizaciones de la plataforma externa. MenuList prepara una fuente pública más clara para que esos sistemas la lean cuando así lo deseen."
                    ]
                }
            },
            "faq": {
                "llms-required-google-ai": {
                    "question": "¿Se requiere llms.txt para las funciones de Google AI?",
                    "answer": "No. Google dice que los fundamentos normales de búsqueda siguen siendo importantes. MenuList utiliza archivos de contexto LLM como un contrato de agente público adicional, no como un requisito de Google."
                }
            }
        },
        "menu-update-checklist": {
            "title": "Consulta el menú público antes y después de cada actualización.",
            "metaTitle": "Lista de verificación de actualización del menú del restaurante | MenuList",
            "metaDescription": "Utilice esta lista de verificación antes de cambiar precios, disponibilidad, descripciones, enlaces QR, enlaces de menú Google, PDFs y archivos de menú compartidos por el personal.",
            "description": "Una lista de verificación funcional para cambios de menú seguros.",
            "quickAnswer": "Una actualización de menú no finaliza cuando el propietario cambia el menú interno. Finalizará cuando los clientes puedan ver la versión actual aprobada en las superficies públicas que utilizan.",
            "primaryCtaLabel": "Revisa la fuente de tu menú",
            "sections": {
                "before-update": {
                    "title": "Antes de actualizar",
                    "checklist": [
                        "Confirme los nombres y la ortografía de los elementos.",
                        "Confirme los precios y la moneda actuales.",
                        "Marque claramente los artículos no disponibles.",
                        "Verifique que las fotos aún coincidan con los artículos.",
                        "Las descripciones de los cheques son breves y útiles.",
                        "Confirmar que las categorías todavía tienen sentido."
                    ]
                },
                "after-update": {
                    "title": "Después de actualizar",
                    "checklist": [
                        "Abra el menú público en un teléfono.",
                        "Escanee el QR code principal.",
                        "Abra el enlace del menú Google, si se utiliza.",
                        "Abra los enlaces Instagram y WhatsApp.",
                        "Reemplace el antiguo PDFs o imprima los archivos si cambiaron.",
                        "Dígale al personal qué enlace enviar a los clientes."
                    ]
                },
                "branch-updates": {
                    "title": "Actualizaciones de sucursales y puntos de venta",
                    "body": [
                        "Para negocios con múltiples ubicaciones, confirme si el cambio se aplica a todos los puntos de venta o solo a una ubicación."
                    ],
                    "checklist": [
                        "Menú maestro compartido actualizado.",
                        "Se comprobaron las diferencias de precios a nivel de ubicación.",
                        "Artículos locales no disponibles marcados.",
                        "Enlaces de rama QR probados."
                    ]
                }
            },
            "faq": {
                "biggest-update-mistake": {
                    "question": "¿Cuál es el mayor error de actualización?",
                    "answer": "Cambiar el menú en un lugar mientras los clientes aún ven los precios antiguos en otro lugar."
                }
            }
        },
        "qr-code-placement-checklist": {
            "title": "Coloque QR codes donde los clientes puedan escanearlos sin preguntar al personal.",
            "metaTitle": "QR Lista de verificación de colocación de códigos para restaurantes | MenuList",
            "metaDescription": "Utilice esta lista de verificación para el tamaño de QR code, la ubicación de la mesa, la ubicación del mostrador, el embalaje, la iluminación, el URLs de respaldo y las pruebas de escaneo.",
            "description": "Una práctica lista de verificación de ubicación de QR para propietarios, personal e impresores.",
            "quickAnswer": "Una buena configuración de QR utiliza el tamaño correcto, una ubicación clara, buena iluminación, un respaldo URL legible y pruebas de escaneo en teléfonos de clientes reales antes de imprimir a escala.",
            "primaryCtaLabel": "Crear una fuente de menú QR",
            "sections": {
                "placement": {
                    "title": "Lista de verificación de colocación",
                    "checklist": [
                        "Tarjeta de mesa visible desde la posición normal de sentado.",
                        "Mostrador QR cerca del punto de pedido o pago.",
                        "Ventana QR legible desde el exterior si se utiliza.",
                        "Embalaje QR colocado en una zona plana visible.",
                        "La carpeta de facturas o el recibo QR no se dobla a lo largo del código.",
                        "Corto alternativo URL impreso debajo del código."
                    ]
                },
                "size-lighting": {
                    "title": "Tamaño e iluminación",
                    "checklist": [
                        "Imprima la prueba en el tamaño final antes de la impresión masiva.",
                        "Evite los reflejos brillantes donde la iluminación sea intensa.",
                        "Mantenga un espacio tranquilo alrededor del QR.",
                        "Utilice un fuerte contraste.",
                        "No lo coloque sobre superficies curvas o con mucha textura."
                    ]
                },
                "scan-test": {
                    "title": "prueba de escaneo",
                    "checklist": [
                        "Pruebe la cámara iPhone.",
                        "Pruebe la cámara Android.",
                        "Pruebe el Wi-Fi y los datos móviles en la tienda.",
                        "Confirme que la página abre el menú actual.",
                        "Pídale al personal que haga una prueba antes de colocar las cartas en las mesas."
                    ]
                }
            },
            "faq": {
                "table-specific-qr": {
                    "question": "¿Cada tabla debería tener un QR diferente?",
                    "answer": "No para la fuente del menú. Un único enlace de menú oficial es más sencillo. Los códigos específicos de la tabla solo importan cuando un sistema de pedidos independiente necesita la identidad de la tabla."
                }
            }
        },
        "menu-engineering-worksheet": {
            "title": "Revise los elementos del menú con una simple hoja de trabajo",
            "metaTitle": "Hoja de trabajo de ingeniería de menús | MenuList",
            "metaDescription": "Utilice una hoja de trabajo de artículos simple para sección, precio, estimación de costos, estimación de popularidad, estimación de margen, claridad y próxima acción.",
            "description": "Una primera hoja de trabajo HTML para revisar los elementos del menú antes de cambiar los menús públicos.",
            "quickAnswer": "Una útil hoja de cálculo de menú proporciona a cada artículo una sección, un precio actual, un costo aproximado, una estimación de popularidad, una estimación de margen, una puntuación de claridad para el cliente y la siguiente acción.",
            "primaryCtaLabel": "Comience desde su menú actual",
            "sections": {
                "worksheet-fields": {
                    "title": "Campos de la hoja de trabajo",
                    "checklist": [
                        "Nombre del artículo",
                        "Sección",
                        "Precio actual",
                        "estimación de costos",
                        "estimación de popularidad",
                        "Estimación de margen",
                        "Claridad del cliente",
                        "Acción: mantener, reescribir, cambiar el precio, mover, eliminar o probar"
                    ]
                },
                "how-to-use": {
                    "title": "como usarlo",
                    "body": [
                        "Utilice la hoja de trabajo después de estructurar el menú público actual. Revise una sección a la vez para que el propietario no se vea obligado a rediseñar el menú completo de una vez."
                    ],
                    "checklist": [
                        "Marque primero los elementos más conocidos.",
                        "Marque nombres de elementos confusos.",
                        "Encuentre artículos con precios poco claros o descripciones débiles.",
                        "Decide qué debería ser más visible.",
                        "Actualice el menú público solo después de la aprobación del propietario."
                    ]
                },
                "claim-limit": {
                    "title": "Lo que no es esta hoja de trabajo",
                    "body": [
                        "Este no es un informe de rentabilidad de POS. Es una práctica herramienta de revisión del propietario. Utilice sistemas de ventas y costos de alimentos para un análisis de márgenes exacto."
                    ]
                }
            },
            "faq": {
                "staff-worksheet": {
                    "question": "¿Puede el personal completar esta hoja de trabajo?",
                    "answer": "El personal puede agregar notas, pero la aprobación del propietario debe seguir siendo la fuente final antes de que se publiquen los cambios."
                }
            }
        },
                  "restaurant-menu-schema": {
                            "title": "El schema del menú debe describir lo que el cliente ve en la página",
                            "metaTitle": "Restaurant Menu Schema Guide | MenuList",
                            "metaDescription": "Guía práctica de datos estructurados para páginas públicas de menú de restaurante.",
                            "description": "Guía práctica de datos estructurados para páginas públicas de menú de restaurante.",
                            "quickAnswer": "El schema del menú debe coincidir con el contenido público visible. Use Restaurant o LocalBusiness para el negocio, y Menu, MenuSection y MenuItem para el menú visible. No marque precios ocultos, reseñas falsas ni detalles no disponibles.",
                            "primaryCtaLabel": "Publicar una página de menú estructurada",
                            "distributionSnippets": [
                                      "El schema del menú debe describir lo que el cliente ve en la página",
                                      "El schema del menú debe coincidir con el contenido público visible. Use Restaurant o LocalBusiness para el negocio, y Menu, MenuSection y MenuItem para el menú visible. No marque precios ocultos, reseñas falsas ni detalles no disponibles."
                            ],
                            "sections": {
                                      "schema-types": {
                                                "title": "Tipos de schema",
                                                "body": [
                                                          "Guía práctica de datos estructurados para páginas públicas de menú de restaurante."
                                                ],
                                                "checklist": [
                                                          "El nombre visible coincide con MenuItem.",
                                                          "El precio visible coincide con Offer.",
                                                          "No marque preguntas ocultas.",
                                                          "Use Menu, MenuSection, and MenuItem for visible menu content.",
                                                          "Use FAQPage only for FAQ content visible on the page."
                                                ]
                                      },
                                      "visible-content": {
                                                "title": "Contenido visible coincidente",
                                                "body": [
                                                          "El schema del menú debe coincidir con el contenido público visible. Use Restaurant o LocalBusiness para el negocio, y Menu, MenuSection y MenuItem para el menú visible. No marque precios ocultos, reseñas falsas ni detalles no disponibles."
                                                ],
                                                "checklist": [
                                                          "El nombre visible coincide con MenuItem.",
                                                          "El precio visible coincide con Offer.",
                                                          "No marque preguntas ocultas.",
                                                          "Abra la URL con datos móviles."
                                                ]
                                      },
                                      "common-mistakes": {
                                                "title": "Errores comunes",
                                                "checklist": [
                                                          "No marque preguntas ocultas.",
                                                          "Los PDF antiguos no deben ser el enlace principal del cliente.",
                                                          "Old prices structured data मध्ये/में/లో रखना ತಪ್ಪు.",
                                                          "Schema does not guarantee ranking."
                                                ]
                                      },
                                      "how-menulist-fits": {
                                                "title": "Cómo encaja MenuList",
                                                "body": [
                                                          "MenuList keeps public menu pages structured around the owner-approved source.",
                                                          "External search and AI systems decide what they crawl, show, cite, or ignore."
                                                ]
                                      }
                            },
                            "faq": {
                                      "schema-guarantee": {
                                                "question": "¿El schema garantiza ranking?",
                                                "answer": "No. Puede aclarar la página, pero los sistemas de búsqueda deciden rastreo, ranking y resultados enriquecidos."
                                      },
                                      "hidden-menu-items": {
                                                "question": "¿Se pueden añadir elementos ocultos al schema?",
                                                "answer": "No. Los datos estructurados deben coincidir con la página pública."
                                      }
                            }
                  },
                  "official-menu-url-checklist": {
                            "title": "Use una URL estable del menú en cada lugar donde miran los clientes",
                            "metaTitle": "Official Menu URL Checklist for Restaurants | MenuList",
                            "metaDescription": "Checklist para sustituir enlaces dispersos por una fuente aprobada del menú.",
                            "description": "Checklist para sustituir enlaces dispersos por una fuente aprobada del menú.",
                            "quickAnswer": "Use una URL estable del menú en cada lugar donde miran los clientes. Stable URL keeps QR, Google, social, website, WhatsApp, print, screens, and branch pages pointed to the current approved menu source.",
                            "primaryCtaLabel": "Crear una URL estable del menú",
                            "distributionSnippets": [
                                      "Use una URL estable del menú en cada lugar donde miran los clientes",
                                      "Use one stable URL instead of sending a new file link after every update."
                            ],
                            "sections": {
                                      "choose-source-url": {
                                                "title": "Elija la URL fuente",
                                                "body": [
                                                          "Choose a public menu page the owner can keep current. The URL should stay stable when prices, items, photos, or availability change."
                                                ],
                                                "checklist": [
                                                          "Use a short public URL.",
                                                          "Open on mobile without login.",
                                                          "Menu is owner-approved.",
                                                          "Page updates without changing the URL."
                                                ]
                                      },
                                      "update-surfaces": {
                                                "title": "Actualice cada superficie visible",
                                                "checklist": [
                                                          "QR codes.",
                                                          "Google Business Profile menu link.",
                                                          "Instagram and WhatsApp links.",
                                                          "Website menu buttons.",
                                                          "Print files and screens.",
                                                          "Branch pages and branch QR cards."
                                                ]
                                      },
                                      "test-before-printing": {
                                                "title": "Pruebe antes de imprimir",
                                                "checklist": [
                                                          "Abra la URL con datos móviles.",
                                                          "Escanee el QR con el tamaño final de impresión.",
                                                          "Check title, prices, and availability.",
                                                          "Ask staff to send the same URL.",
                                                          "Los PDF antiguos no deben ser el enlace principal del cliente."
                                                ]
                                      },
                                      "limits": {
                                                "title": "Lo que la URL no puede forzar",
                                                "body": [
                                                          "A clear official URL reduces confusion, but external sites still decide when cached or old information refreshes."
                                                ]
                                      }
                            },
                            "faq": {
                                      "new-qr-every-update": {
                                                "question": "¿Cada actualización necesita un QR nuevo?",
                                                "answer": "No. Con una URL estable, el mismo QR impreso puede abrir el menú actualizado."
                                      },
                                      "delete-old-pdfs": {
                                                "question": "¿Deben eliminarse los PDF antiguos?",
                                                "answer": "Los PDF públicos antiguos no deben ser el enlace principal del menú. Mantenga solo archivos actuales."
                                      }
                            }
                  },
                  "restaurant-qr-menu-mistakes": {
                            "title": "Errores comunes de menú QR que los restaurantes deben evitar",
                            "metaTitle": "Common QR Menu Mistakes Restaurants Should Avoid | MenuList",
                            "metaDescription": "Lista práctica antes de imprimir tarjetas de mesa o packaging con QR.",
                            "description": "Lista práctica antes de imprimir tarjetas de mesa o packaging con QR.",
                            "quickAnswer": "El código QR no es el menú. Solo es el acceso a la fuente actual del menú. Necesita ubicación legible, URL de respaldo y pruebas de escaneo antes de usarse.",
                            "primaryCtaLabel": "Configurar un menú QR estable",
                            "distributionSnippets": [
                                      "El código QR no es el menú. Solo es el acceso a la fuente actual del menú. Necesita ubicación legible, URL de respaldo y pruebas de escaneo antes de usarse.",
                                      "A QR menu fails when the link, placement, or branch version is wrong."
                            ],
                            "sections": {
                                      "pdf-only": {
                                                "title": "Error 1: QR hacia un PDF antiguo",
                                                "body": [
                                                          "A PDF can be useful for print, but it becomes stale through WhatsApp, old website links, or old QR cards."
                                                ],
                                                "checklist": [
                                                          "Use una página móvil como destino principal del QR.",
                                                          "Keep PDF secondary for print or backup.",
                                                          "Replace old PDF links when prices change."
                                                ]
                                      },
                                      "unstable-links": {
                                                "title": "Error 2: cambiar el enlace en cada actualización",
                                                "body": [
                                                          "If every update creates a new URL, printed QR material becomes risky. A stable URL is safer."
                                                ],
                                                "checklist": [
                                                          "Use una URL pública estable.",
                                                          "Update content behind the URL.",
                                                          "Keep staff replies and social links on the same source."
                                                ]
                                      },
                                      "placement-testing": {
                                                "title": "Error 3: imprimir sin pruebas de escaneo",
                                                "checklist": [
                                                          "Escanee el QR con el tamaño final de impresión.",
                                                          "Pruebe cámaras iPhone y Android.",
                                                          "Test in customer lighting.",
                                                          "Print a readable fallback URL.",
                                                          "Abra la URL con datos móviles."
                                                ]
                                      },
                                      "branch-mismatch": {
                                                "title": "Error 4: menú de sucursal equivocado",
                                                "body": [
                                                          "Branches may have different prices, availability, hours, or service modes. When those differences matter, QR should open the correct branch version."
                                                ]
                                      }
                            },
                            "faq": {
                                      "biggest-qr-mistake": {
                                                "question": "¿Cuál es el error QR más común?",
                                                "answer": "Abrir un archivo antiguo o difícil de leer en lugar de una página actual y estable."
                                      },
                                      "branch-specific-qr": {
                                                "question": "¿Cada sucursal necesita su propio QR?",
                                                "answer": "Sí cuando precios, disponibilidad, horarios o detalles de servicio cambian por sucursal."
                                      }
                            }
                  },
        "multi-location-menu-management": {
            "title": "Mantenga los menús outlet alineados sin ocultar las diferencias locales",
            "metaTitle": "Gestión de menús en múltiples ubicaciones | MenuList",
            "metaDescription": "Administre menús principales, diferencias de puntos de venta, variación de precios en sucursales, disponibilidad local y coherencia de enlaces públicos desde una fuente aprobada.",
            "description": "Una guía para marcas que operan en más de una ubicación.",
            "quickAnswer": "La gestión de menús en múltiples ubicaciones necesita una fuente maestra aprobada más diferencias de establecimiento controladas en cuanto a precio, disponibilidad, artículos locales y detalles específicos de la sucursal.",
            "primaryCtaLabel": "Configura tu primera ubicación",
            "sections": {
                "why-branches-drift": {
                    "title": "¿Por qué los menús de las ramas se desvían?",
                    "body": [
                        "Un punto de venta cambia un precio. Otro se queda sin un artículo. Un tercero imprime material antiguo QR. Con el tiempo, la marca tiene muchas versiones de menú y no hay una forma sencilla de saber qué ven los clientes."
                    ]
                },
                "master-vs-outlet": {
                    "title": "Menú principal y menú outlet",
                    "comparisonRows": [
                        {
                            "label": "Menú maestro",
                            "left": "Estructura de elementos compartidos, secciones de marca, descripciones comunes",
                            "right": "Utilizado como fuente aprobada"
                        },
                        {
                            "label": "Menú de salida",
                            "left": "Precio local, disponibilidad, artículo local, detalles de sucursal",
                            "right": "Usado para la verdad del cliente en esa sucursal."
                        }
                    ]
                },
                "what-to-control": {
                    "title": "que controlar",
                    "checklist": [
                        "Nombres y secciones de elementos compartidos",
                        "Diferencias de precios a nivel de establecimiento",
                        "Disponibilidad local",
                        "Modos de servicio específicos de la sucursal",
                        "Enlaces QR para cada salida",
                        "Google y enlaces sociales por punto de venta",
                        "Materiales impresos por punto de venta"
                    ]
                },
                "how-menulist-fits": {
                    "title": "Cómo encaja MenuList",
                    "body": [
                        "MenuList admite un menú maestro y un control de salida para que las empresas puedan mantener estable la fuente compartida y al mismo tiempo preservar las diferencias locales cuando sea necesario."
                    ]
                }
            },
            "faq": {
                "same-menu-every-outlet": {
                    "question": "¿Todos los establecimientos deberían mostrar exactamente el mismo menú?",
                    "answer": "Sólo cuando el negocio realmente funcione de esa manera. La configuración más segura es una estructura compartida con diferencias de salida controladas."
                }
            }
        }
    }
};
