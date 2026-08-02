export function openIsolatedBrowserUrl(url: string): true {
    if (typeof document === 'undefined' || !document.body) {
        throw new Error('isolated_browser_url_document_unavailable');
    }

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.rel = 'noopener noreferrer';
    anchor.target = '_blank';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    try {
        anchor.click();
    } finally {
        anchor.remove();
    }
    return true;
}
