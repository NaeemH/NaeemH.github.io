# naeemh.github.io

Source for my personal site, live at <https://naeemh.github.io>.

## Stack

- Jekyll (GitHub Pages legacy build mode — `master` branch is source)
- Plain SCSS (compiled artifact `css/main.css` checked in)
- Vanilla JS (`js/main.js`)
- `jekyll-sitemap` plugin

## Edit & deploy

```bash
git clone https://github.com/NaeemH/NaeemH.github.io.git
cd NaeemH.github.io
# edit files under _data/, _includes/, _layouts/, _scss/, js/, css/
git commit -am "your message"
git push origin master
# GitHub builds and serves automatically in ~30-60s
# verify build:
gh run list -R NaeemH/NaeemH.github.io --limit 1
```

## Layout

- `_data/` — site content (experience, skills, certifications)
- `_includes/` — partials (intro, background, experience, skills, footer, head, scripts)
- `_layouts/` — `default.html` + `not_found.html`
- `_scss/` — Sass sources (note: `css/main.css` is the committed compiled output)
- `images/` — headshots, backgrounds, favicons
- `js/main.js` — UI behavior

## Credits

Template originally forked and heavily modified from [bchiang7/bchiang7.github.io](https://github.com/bchiang7/bchiang7.github.io).