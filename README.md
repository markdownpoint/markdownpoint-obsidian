# MarkdownPoint for Obsidian

Write your slides where you keep your ideas.

MarkdownPoint shows a presentation in Obsidian as one continuous draft. Write the words and presenter notes, and arrange the slides in an outline. Open the same presentation in [MarkdownPoint](https://markdownpoint.com) to design and present it.

![A continuous presentation draft with presenter notes and the slide outline](images/continuous-draft-light.png)

Each presentation is a folder in your vault. Both apps edit the same files.

The screenshots use the Minimal theme and Notebook Navigator. Both are optional.

## Install

MarkdownPoint requires **Obsidian 1.13 or newer** on desktop. You design, present and export in the MarkdownPoint desktop app.

1. Open **Settings → Community plugins**. If community plugins are turned off, turn them on.
2. Select **Browse** and search for **MarkdownPoint**.
3. Select **Install**, then **Enable**.

## Start a presentation

Open the command palette and run **MarkdownPoint: New presentation**.

1. Enter a name and choose the folder to put the presentation in.
2. Under **Theme**, choose **Basic** or a theme from another presentation in your vault.
3. Select **Create** and start writing.

The presentation opens in the current tab with one empty slide. The cursor starts in its first text area. The theme supplies the layouts. You write what each slide says.

### Open an existing presentation

Put the whole presentation folder in your vault, then open its `slides.md`. Keep `presentation.mdpoint`, `themes/` and any media folders beside it.

```text
My presentation/
├── slides.md
├── presentation.mdpoint
├── themes/
└── media/
```

`slides.md` holds the writing, notes and slide order. `presentation.mdpoint` holds the presentation data. Move and sync the folder as a whole.

## Write without styling

Each slide starts with a numbered divider. Its text areas follow in writing order. Each one takes its name from the layout: Title, Body, Eyebrow or a custom name.

An empty area shows a faint placeholder with its name. Click it to write. Once the area has text, its name appears as a small label above it. Placeholders and labels appear only in the editor and are never saved.

Write in **Live Preview** to see the continuous draft. Live Preview protects the slide dividers from ordinary edits. Move and delete slides from the outline or the right-click menu. **Source mode** shows the plain Markdown. Everything is editable there, slide dividers included.

The draft hides the one blank line that separates text areas in `slides.md`. Extra blank lines are part of your text. They stay visible and carry over to MarkdownPoint.

### Presenter notes

Click anywhere on the **Presenter notes** row to expand it. An empty note shows **Notes**. Write reminders, transitions or a full script. Collapse the row again to focus on the slide.

Notes stay with their slide when you move, copy or delete it. Each device remembers which notes are expanded.

### Images beside the draft

![An assigned image beside the writing area](images/image-previews-light.png)

Up to five of a slide’s images appear below its thumbnail in the margin. The background comes first, then images in the layout’s image areas, then any other images on the slide.

Add and change images in MarkdownPoint. To hide the previews, turn off **Settings → MarkdownPoint → Show slide images**.

## Arrange slides in the outline

The **Outline** has its own sidebar tab, marked with the MarkdownPoint icon. The tab sits in the right sidebar by default. Obsidian’s own Outline and Notebook Navigator stay where they are.

Each row shows a slide’s title and a small thumbnail of its structure. Filled areas mark where text and media go. MarkdownPoint shows the finished slide.

Section headings divide the outline and don’t take a slide number. Skipped slides stay in the list. They show a dash in place of a number.

### Select and rearrange

- **Click** to select one slide and go to it.
- **Cmd-click** on Mac or **Ctrl-click** on Windows and Linux to add or remove a slide.
- **Shift-click** to select a range.
- **Shift+Up/Down** to extend the selection with the keyboard.
- **Cmd/Ctrl+A** to select all slides while the outline has focus.

Drag a selected row to move all selected slides. A line shows where they will land. Drop them on a section heading to place them at the start of that section.

To move the selection one row at a time, press **Cmd+Up/Down** on Mac or **Ctrl+Up/Down** on Windows and Linux while the outline has focus. You can undo each move. In the editor, text-editing shortcuts work as usual.

### Copy, cut and delete slides

Right-click a slide in the outline or in the editor to choose **Cut slide**, **Copy slide**, **Paste slides** or **Delete slide**. Click a slide’s thumbnail in the editor margin to open the same menu.

In the outline, the menu acts on every selected slide. In the editor, it acts on the slide you clicked. Pasted slides go below the slide whose menu you opened.

A copied slide carries its text, notes and presentation data. In the outline, **Cmd/Ctrl+C**, **Cmd/Ctrl+X** and **Cmd/Ctrl+V** copy, cut and paste whole slides. In the editor, they stay ordinary text shortcuts.

You can paste slides into another presentation in the same vault when both use the same theme and theme artwork. The media the slides use is copied into the destination folder. Between different themes or vaults, copy and paste the slides in the MarkdownPoint desktop app.

Obsidian’s **Undo** and **Redo** cover slide actions too. They also work while the outline has focus.

## Add a slide in a keystroke

![The layout picker with filled text areas and assigned number shortcuts](images/layout-picker-light.png)

Click **+** above the outline or run **MarkdownPoint: New slide**. Choose a layout to insert a slide below the current one.

Some layouts start with a number. To give a layout a number:

1. Right-click a layout in the picker.
2. Choose **Shortcut**, then a number from 1 to 9.
3. In the picker, press that number to insert the layout.

The number appears below the layout’s thumbnail, next to its name. Giving the number to another layout moves it there. Choose **None** to remove a layout’s number.

## Continue in MarkdownPoint

Run **MarkdownPoint: Open in MarkdownPoint** to save the presentation and open `presentation.mdpoint` in the desktop app.

Work on layout, images, animation and presenting there. Return to `slides.md` for another writing pass. Keep using the same folder. For the command to reach the app, your computer must open `.mdpoint` files with MarkdownPoint.

## Settings and hotkeys

Use **Settings → MarkdownPoint → Sidebar** to put the outline on the left or right. Show and hide that sidebar with Obsidian’s own controls.

The plugin sets no hotkeys. Assign your own under **Settings → Hotkeys**:

| Command               | What it does                                       |
| --------------------- | -------------------------------------------------- |
| New presentation      | Create a presentation in the vault.                |
| New slide             | Open the layout picker.                            |
| Focus outline         | Reveal and focus the slide outline.                |
| Focus editor          | Return to the writing area.                        |
| Move slides up        | Move the outline selection up.                     |
| Move slides down      | Move the outline selection down.                   |
| Open in MarkdownPoint | Save and open the presentation in the desktop app. |

The move commands work while the outline has focus. Tab and Obsidian’s tab-switching shortcuts work as usual.

After an update, MarkdownPoint shows the release notes once. To stop this, turn off **Settings → MarkdownPoint → Show release notes after updating**. To read them at any time, select **View recent updates** in the same settings.

Sidebar placement and expanded notes are stored on each device. Layout shortcuts, **Show slide images** and **Show release notes after updating** are plugin settings. They sync when your vault syncs plugin settings. Obsidian manages sidebar visibility and width.

## Languages

MarkdownPoint uses the language you choose in **Settings → General → Language**. It supports 21 languages, with a right-to-left layout for Arabic and Persian:

English · العربية · Deutsch · Español · فارسی · Français · Bahasa Indonesia · Italiano · 日本語 · 한국어 · Nederlands · Polski · Português · Português do Brasil · Русский · ไทย · Türkçe · Українська · Tiếng Việt · 简体中文 · 繁體中文

In any other language, the plugin appears in English. The language setting never changes the words in your presentation.

## Questions and troubleshooting

**Can I use Obsidian links and embeds?** They stay in the Markdown as you wrote them. The plugin doesn’t turn wikilinks, note embeds or other plugins’ output into slide content. For links that work outside Obsidian, use standard Markdown links. Add slide images in MarkdownPoint.

**The file looks like ordinary Markdown.** Open `slides.md` in **Live Preview** and check that its own `presentation.mdpoint` is in the same folder. An unrelated note named `slides.md` stays an ordinary note. An extra `.mdpoint` file or a conflicted copy in the folder makes the pair ambiguous. The plugin then leaves both files alone. If a notice says the presentation uses a newer MarkdownPoint format, update the plugin in **Settings → Community plugins**.

**The outline still shows another presentation.** The outline keeps the last presentation you worked in, even while an ordinary note is active. Select the tab of the presentation you want.

**Some images are missing.** Keep the whole presentation folder together, media included. The editor shows at most five images per slide, and only files it can find. It doesn’t add images to `slides.md`.

**A slide action asks me to try again.** The presentation changed before the action finished. Wait for the latest changes to appear, then repeat the action.

**Couldn’t save the presentation data.** Keep the vault open. Fix the file or storage problem, then select **Retry** in the notice. A recovery copy is kept on this device.

For questions or a problem you can reproduce, [open an issue](https://github.com/markdownpoint/markdownpoint-obsidian/issues).
