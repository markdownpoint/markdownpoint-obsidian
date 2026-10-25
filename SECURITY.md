# Security policy

## Reporting a vulnerability

Please report security issues privately through GitHub's [security advisory form](https://github.com/markdownpoint/markdownpoint-obsidian/security/advisories/new) rather than opening a public issue.

## What this plugin does with your data

- **Nothing leaves your device.** The plugin makes no network requests. There is no telemetry, no analytics and no server belonging to this plugin.
- **Presentations stay in your vault.** The plugin reads and writes a presentation’s `slides.md`, `presentation.mdpoint`, theme files and media through Obsidian’s vault API. Creating a presentation or pasting slides adds files to the presentation’s folder.
- **Some state stays on this device.** Sidebar placement, expanded notes and the clipboard bookkeeping for cut slides use Obsidian’s local storage for the vault. When slide data can’t be saved, a recovery copy is kept in this device’s IndexedDB storage until it can be saved.
- **The settings banner links to the companion app.** Selecting the banner at the top of the settings opens `https://markdownpoint.com`, the website of the MarkdownPoint desktop app, in your browser.
- **Copying slides uses the system clipboard.** Copy and cut write the slides’ text and presentation data to the clipboard, where other apps can read it, as with any copied text. Paste reads it back.

## Things worth knowing

- **Open in MarkdownPoint** saves the presentation, then asks your operating system to open `presentation.mdpoint` with the app associated with that file type.
- The plugin does not run code from your vault or the clipboard. Pasted slides are validated as presentation data before anything is written.
