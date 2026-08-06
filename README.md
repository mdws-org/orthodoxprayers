# Orthodox Prayers

An Orthodox prayer book for the browser. The pages are set like the printed
books: black and red, drop caps, an ornament bar at the head of each page. The
site works offline after the first visit, and it installs to a phone home
screen as a standalone app.

Live at https://orthodoxprayers.net

## Contents

- Morning Prayer of St. Philaret of Moscow
- Prayer at Daybreak of Elder Sophrony
- Short Prayers of the Hours for home use
- Prayers at the table, before and after each meal
- The common prayers of the Usual Beginning, given in full
- The Psalter, in twenty kathismata, with a pointer to the kathisma appointed
  for the current day of the month

## Running it locally

The site is static HTML, CSS, and JavaScript. There is no build step and there
are no dependencies. To work on it, serve the repository root over HTTP:

    python3 -m http.server 8000

Then open http://localhost:8000/.

Serve the files over HTTP rather than opening them directly. The service worker
and the web app manifest do not load from `file://` URLs.

## Layout

`prayers.css` holds the type, the color, and the two themes.

`theme.js` applies the stored theme before the first paint. It loads
synchronously in the document head, so the page must never flash the wrong
theme.

`app.js` handles theme cycling, drop-cap sizing, ornament rotation, and service
worker registration.

`sw.js` caches the site for offline use. Raise `VERSION` after you change any
cached file, or returning visitors keep the old copy.

`vendor/pretext.js` is the typesetting helper that sizes drop caps.

`art/bars/` holds the ornament bars. The site picks one per day from the date.

`_headers` sets the Cloudflare Pages caching and security headers. The content
security policy allows no inline script, so all JavaScript must live in an
external file.

## Deployment

Cloudflare Pages builds from `main`. There is no build command, and the output
directory is the repository root.

If a change does not appear after a deploy, purge the changed paths at the
edge. Cloudflare caches 404 responses for paths that did not exist before the
deploy, and those cached misses outlive the deploy itself.

## Texts and art

The Psalter of St Seraphim Orthodox Cathedral, Dallas, Texas (Orthodox Church
in America); portions translated by +DMITRI, Archbishop of Dallas and the
South. © 2004–2005 St Seraphim Orthodox Cathedral.

The ornament bars come from the Orthodox Illustration Project.

## License

The code carries no license at this time. The texts and the art remain under
the rights of their respective holders.
