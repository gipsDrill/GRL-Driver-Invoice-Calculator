GRL DRIVER INVOICE CALCULATOR — START AND UPLOAD

LOCAL USE
1. Extract the ZIP file.
2. Double-click index.html.
3. The calculator will open directly in your browser.

WINDOWS FALLBACK
If your browser or security settings block a local HTML file:
1. Double-click START-LOCAL-WINDOWS.bat.
2. Keep the command window open while using the calculator.
3. The calculator will open automatically in your default browser.

GITHUB PAGES
1. Create a new GitHub repository.
2. Extract this ZIP file.
3. Upload ALL extracted files and folders to the root of the repository.
   The index.html file must be in the repository root.
4. Open repository Settings > Pages.
5. Under Build and deployment select:
   Source: Deploy from a branch
   Branch: main
   Folder: / (root)
6. Save and wait for GitHub to publish the page.

STANDARD WEB HOSTING
1. Extract this ZIP file.
2. Upload ALL extracted files and folders to the website directory,
   usually public_html, www, htdocs or the domain's document root.
3. Keep the folder structure unchanged.

NOTES
- HTTPS is recommended and is required for full installable-app/PWA support.
- The WhatsApp/social preview is configured for:
  https://gipsdrill.github.io/work-hours-tracker/
  If the final website address changes, update the canonical, og:url,
  og:image and twitter:image addresses near the top of index.html.
- WhatsApp may keep an older link preview in its cache. After publishing an
  update, share the link once with a new query, for example: ?v=2
- User profiles and saved calculator data are stored locally in that browser.
- The main index.html contains the complete calculator interface and application code.
- mobile-polish.css contains the responsive phone and tablet interface refinements.
- install-shortcut.js provides the small phone installation button. Android
  uses the browser's native installation prompt; iPhone displays the required
  Safari Add to Home Screen instructions.
- PDF and Excel generation works locally and online.
