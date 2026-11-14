/* @8spine-meta
 * type: TRACKER
 * category: modules
 */

// Community music trackers: where the artist list, tracker sheets and artist images live,
// and how a tracker's file links turn into playable URLs.

function match(s, re) { const m = re.exec(s); return m ? m[1] : null; }

function normalize(url) { return String(url || '').replace('pillowcase.su', 'pillows.su'); }

async function json(url) {
    try {
        const res = await Promise.race([fetch(url), new Promise(function (r) { setTimeout(function () { r(null); }, 8000); })]);
        return res && res.status >= 200 && res.status < 300 ? await res.json() : null;
    } catch (e) { return null; }
}

// One link -> playable URL string, or null. Most hosts are pure URL construction.
async function resolveOne(raw) {
    const url = normalize(raw);
    let id;
    if (/https?:\/\/pillows\.su\/f\//.test(url)) {
        id = match(url, /pillows\.su\/f\/([a-f0-9]+)/);
        return id ? 'https://api.pillows.su/api/download/' + id : null;
    }
    if (/https?:\/\/(?:www\.|music\.)?youtube\.com\/|https?:\/\/youtu\.be\//.test(url)) return null;
    if (/https?:\/\/pixeldrain\.com\/[du]\//.test(url)) {
        id = match(url, /pixeldrain\.com\/[du]\/([a-zA-Z0-9]+)/);
        return id ? 'https://fuck-unvaulted.artistgrid.cx/' + id : null;
    }
    if (/https?:\/\/juicewrldapi\.com\/juicewrld/.test(url)) return url;
    if (/https?:\/\/.*imgur\.gg/.test(url)) {
        id = match(url, /\/f\/([a-zA-Z0-9]+)/) || match(url, /\/([a-zA-Z0-9]+)(?:\?|$)/);
        if (!id) return null;
        const f = await json('https://imgur.gg/api/file/' + id);
        if (!f) return null;
        const type = f.mediaType || f.mimeType || f.type || '';
        if (type.indexOf('image/') === 0) return null;
        return f.cdnUrl || f.url || null;
    }
    if (/https?:\/\/(www\.)?soundcloud\.com\//.test(url)) {
        const path = match(url, /soundcloud\.com\/([^/]+\/[^/?#]+)/);
        return path ? 'https://sc.monochrome.tf/_/restream/' + path : null;
    }
    if (/https?:\/\/drive\.google\.com\/file\/d\//.test(url)) {
        id = match(url, /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
        return id ? 'https://fuck-unvaulted.artistgrid.cx/gd/' + id : null;
    }
    if (/https?:\/\/(?:www\.)?exoshare\.org\/share\//.test(url)) {
        id = match(url, /exoshare\.org\/share\/([^/?#]+)/);
        if (!id) return null;
        const p = await json('https://fuck-unvaulted.artistgrid.cx/exo/' + id);
        const file = p && (p.files || []).map(function (x) { return x && x.id; }).find(function (x) { return x; });
        return file ? 'https://fuck-unvaulted.artistgrid.cx/exo/' + id + '/files/' + file : null;
    }
    return null;
}

function needsNetwork(url) { return /imgur\.gg|exoshare\.org\/share\//.test(normalize(url)); }

// A track's links -> the first playable URL. Cheap hosts in order first, then the
// network hosts race (first success wins).
async function resolveLinks(urls) {
    urls = (urls || []).map(String);
    for (const u of urls) {
        if (!needsNetwork(u)) { const r = await resolveOne(u); if (r) return r; }
    }
    const net = urls.filter(needsNetwork);
    if (!net.length) return null;
    return new Promise(function (resolve) {
        let left = net.length;
        net.forEach(function (u) {
            resolveOne(u).then(function (r) {
                if (r) resolve(r);
                else if (--left === 0) resolve(null);
            }, function () { if (--left === 0) resolve(null); });
        });
    });
}

return {
    id: 'trackers',
    name: 'Trackers',
    version: '1.0.0',
    type: 'TRACKER',
    description: 'Community music trackers: artists, eras and playable links.',
    trackerBaseURL: 'https://trackerapi.artistgrid.cx',
    artistsCSVURL: 'https://artists.artistgrid.cx/artists.csv',
    assetsBaseURL: 'https://assets.artistgrid.cx',
    resolveLinks: resolveLinks,
};
