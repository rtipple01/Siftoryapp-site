# siftoryapp.com

The public website for Siftory, an Android app for sorting photos and videos by swiping.

- Plain static HTML, one `styles.css` and one small script for the home page (`home.js`: the hero swipe demo, the "Have a go" deck, the Media Roll loop and the screenshot gallery buttons). No build step, frameworks, external fonts, CDNs, analytics or cookies. The home page still reads sensibly with JavaScript off, and the animations stop for `prefers-reduced-motion`.
- Hosted on GitHub Pages from the root of this repository. The `CNAME` file points the site at `https://siftoryapp.com`.
- Pages: `index.html` (home), `support.html` (guide and FAQ), `privacy.html`, `terms.html`, `404.html`.
- The privacy and terms bodies are inserted where the `<!-- PRIVACY_BODY -->` and `<!-- TERMS_BODY -->` comments sit.
- Phone screens on the site are HTML/CSS mock-ups based on the app's own screens and wording. The home page's screenshot gallery uses the Play Store screenshots in `assets/screens/`, and the demos use the sample scenery in `assets/demo/`.
- Contact: info@siftoryapp.com
