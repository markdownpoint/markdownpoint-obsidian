/*
 * MarkdownPoint - Plugin for Obsidian
 * Copyright (c) 2026 Johan Sanneblad
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// Copied from Notebook Navigator, which owns the MarkdownPoint banner. Do not edit by hand.

import { setIcon, type App, type SettingDefinitionGroup } from 'obsidian';
import { uiBannerText } from '../ui-text.ts';
import {
    MARKDOWNPOINT_BANNER_DESIGNS,
    MARKDOWNPOINT_WORDMARK_ON_DARK,
    MARKDOWNPOINT_WORDMARK_ON_LIGHT
} from './markdownpoint-banner-designs.ts';
import {
    MARKDOWNPOINT_URL,
    createGroupDefinition,
    createRenderDefinition,
    readBannerPosition,
    writeBannerPosition
} from './markdownpoint-banner-support.ts';

/*
 * A static banner for MarkdownPoint, the author's presentation app, at the top of the settings start
 * page. Everything it shows is bundled with the plugin; nothing is loaded from the network. It never
 * moves on screen: each time settings open it shows the next message and the next design, taken from
 * the light designs in Obsidian's light theme and from the dark designs in its dark theme. A switch
 * between light and dark while settings are open changes the design and keeps the message.
 */

// Ends a headline on its punctuation mark, which the banner draws in MarkdownPoint's mandarin
const HEADLINE_POINT_REGEX = /[.?!。？！]$/u;

/**
 * Moves the banner on by one on this device and returns its new position. Called once per settings
 * open; the position picks both the design and the message.
 */
export function advanceMarkdownPointBanner(app: App): number {
    // A multiple of the message count and of both theme sets' sizes, so every set steps evenly when the position wraps
    const darkCount = MARKDOWNPOINT_BANNER_DESIGNS.filter(design => design.dark).length;
    const lightCount = MARKDOWNPOINT_BANNER_DESIGNS.length - darkCount;
    const cycle = uiBannerText.messages.length * lightCount * darkCount;
    // Stores the shown position plus one, which is also the next position, because Obsidian's
    // saveLocalStorage removes the key for a falsy value; a stored 0 would be lost and the banner
    // would show the first design on every open.
    const stored = readBannerPosition(app);
    const position = typeof stored === 'number' && Number.isSafeInteger(stored) && stored > 0 ? stored % cycle : 0;
    writeBannerPosition(app, position + 1);
    return position;
}

function svgDataUrl(svg: string): string {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Writes a slide's text as presentation.md has it, with ==marks== dimmed and the marked words in the slide's accent. */
function appendMarkdownSource(parentEl: HTMLElement, eyebrow: string, statement: string): void {
    parentEl.appendText(`${eyebrow}\n`);
    let isHighlighted = false;
    for (const part of statement.split(/(==|<br>)/)) {
        if (part === '==' || part === '<br>') {
            parentEl.createSpan({ cls: 'markdownpoint-banner-mark', text: part });
            isHighlighted = part === '==' ? !isHighlighted : isHighlighted;
        } else if (part) {
            parentEl.createSpan({ cls: isHighlighted ? 'markdownpoint-banner-highlight' : undefined, text: part });
        }
    }
}

function appendHeadline(parentEl: HTMLElement, headline: string): void {
    const point = HEADLINE_POINT_REGEX.exec(headline)?.[0];
    if (!point) {
        parentEl.appendText(headline);
        return;
    }
    parentEl.appendText(headline.slice(0, -point.length));
    parentEl.createSpan({ cls: 'markdownpoint-banner-point', text: point });
}

/** Renders the banner for a position from advanceMarkdownPointBanner(), in the light or the dark design it picks. */
function renderMarkdownPointBanner(containerEl: HTMLElement, position: number, isDark: boolean): void {
    const { messages, credit } = uiBannerText;
    const designs = MARKDOWNPOINT_BANNER_DESIGNS.filter(candidate => candidate.dark === isDark);
    const design = designs[position % designs.length]!;
    const message = messages[position % messages.length]!;

    // The banner takes the design's colors, so it looks the same in light and dark themes
    const bannerEl = containerEl.createDiv({ cls: 'markdownpoint-banner' });
    bannerEl.toggleClass('markdownpoint-banner-dark', design.dark);
    bannerEl.setCssProps({
        '--markdownpoint-banner-canvas': design.colors.canvas,
        '--markdownpoint-banner-surface': design.colors.surface,
        '--markdownpoint-banner-text': design.colors.text,
        '--markdownpoint-banner-muted': design.colors.muted,
        '--markdownpoint-banner-accent': design.colors.accent
    });

    // The whole strip is one link
    const stripEl = bannerEl.createDiv({ cls: 'markdownpoint-banner-strip', attr: { role: 'link', tabindex: '0' } });
    const openSite = () => window.open(MARKDOWNPOINT_URL);
    stripEl.addEventListener('click', openSite);
    stripEl.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            openSite();
        }
    });

    // The slide's Markdown file lies behind the slide it makes
    const visualEl = stripEl.createDiv({ cls: 'markdownpoint-banner-visual', attr: { 'aria-hidden': 'true' } });
    const fileEl = visualEl.createDiv({ cls: 'markdownpoint-banner-file' });
    fileEl.createDiv({ cls: 'markdownpoint-banner-file-name', text: 'presentation.md' });
    appendMarkdownSource(
        fileEl.createDiv({ cls: 'markdownpoint-banner-file-text', attr: { dir: 'ltr' } }),
        design.eyebrow,
        design.statement
    );
    visualEl.createEl('img', { cls: 'markdownpoint-banner-slide', attr: { src: svgDataUrl(design.svg), alt: '' } });

    const copyEl = stripEl.createDiv({ cls: 'markdownpoint-banner-copy' });
    // The wordmark, its maker and the link icon read as one line: "MarkdownPoint by Johan Sanneblad"
    const brandEl = copyEl.createDiv({ cls: 'markdownpoint-banner-brand' });
    brandEl.createEl('img', {
        cls: 'markdownpoint-banner-wordmark',
        attr: { src: svgDataUrl(design.dark ? MARKDOWNPOINT_WORDMARK_ON_DARK : MARKDOWNPOINT_WORDMARK_ON_LIGHT), alt: 'MarkdownPoint' }
    });
    brandEl.createSpan({ cls: 'markdownpoint-banner-credit', text: credit });
    // The icon marks the banner as a link to the website, because touch screens show no pointer over it
    setIcon(brandEl.createSpan({ cls: 'markdownpoint-banner-link-icon', attr: { 'aria-hidden': 'true' } }), 'lucide-external-link');
    appendHeadline(copyEl.createDiv({ cls: 'markdownpoint-banner-headline' }), message.headline);
    copyEl.createDiv({ cls: 'markdownpoint-banner-subtext', text: message.subtext });
}

/**
 * Marks a setting row as the banner's, so the stylesheet removes the row's padding and hides its name and control.
 * The row holds the position's light and dark designs with the same message, and the stylesheet shows only the
 * one for Obsidian's current theme, so a theme switch while settings are open swaps the design without a render.
 */
function renderBannerRow(settingEl: HTMLElement, position: number): void {
    settingEl.addClass('markdownpoint-banner-setting');
    renderMarkdownPointBanner(settingEl, position, false);
    renderMarkdownPointBanner(settingEl, position, true);
}

/**
 * Where the banner sits on the settings start page: 'top' above everything without a heading, or 'below' after
 * the settings pages under a heading asking about other presentation apps. The Advanced setting
 * showMarkdownPointBannerAtTop picks one.
 */
type MarkdownPointBannerPlacement = 'top' | 'below';

function headingFor(placement: MarkdownPointBannerPlacement): string | undefined {
    return placement === 'below' ? uiBannerText.heading : undefined;
}

/**
 * The banner as a group of the native settings index at one placement, shown only while the Advanced setting
 * picks that placement. The position is read when the row renders, not when definitions are built, because
 * Obsidian also builds them for settings search; only the visible placement renders, so a settings open
 * advances the banner once.
 */
export function createMarkdownPointBannerDefinitions(
    placement: MarkdownPointBannerPlacement,
    isAtTop: () => boolean,
    getPosition: () => number
): SettingDefinitionGroup[] {
    return [
        createGroupDefinition(
            headingFor(placement),
            [
                createRenderDefinition({
                    // Product name, not translated
                    name: 'MarkdownPoint',
                    searchable: false,
                    render: setting => renderBannerRow(setting.settingEl, getPosition())
                })
            ],
            { cls: 'markdownpoint-banner-group', visible: () => isAtTop() === (placement === 'top') }
        )
    ];
}
