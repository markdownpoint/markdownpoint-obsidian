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

import { ar } from './locales/ar.ts';
import { de } from './locales/de.ts';
import { en } from './locales/en.ts';
import { es } from './locales/es.ts';
import { fa } from './locales/fa.ts';
import { fr } from './locales/fr.ts';
import { id } from './locales/id.ts';
import { it } from './locales/it.ts';
import { ja } from './locales/ja.ts';
import { ko } from './locales/ko.ts';
import { nl } from './locales/nl.ts';
import { pl } from './locales/pl.ts';
import { ptBR } from './locales/pt-BR.ts';
import { pt } from './locales/pt.ts';
import { ru } from './locales/ru.ts';
import { th } from './locales/th.ts';
import { tr } from './locales/tr.ts';
import { uk } from './locales/uk.ts';
import { vi } from './locales/vi.ts';
import { zhTW } from './locales/zh-TW.ts';
import { zh } from './locales/zh.ts';

/** Every locale supplies the English catalog's complete set of messages. */
export type Translations = typeof en;

/** Keyed by Obsidian's language codes; `zh` is Simplified Chinese. */
const catalogs = new Map<string, Translations>([
    ['ar', ar],
    ['de', de],
    ['en', en],
    ['es', es],
    ['fa', fa],
    ['fr', fr],
    ['id', id],
    ['it', it],
    ['ja', ja],
    ['ko', ko],
    ['nl', nl],
    ['pl', pl],
    ['pt', pt],
    ['pt-BR', ptBR],
    ['ru', ru],
    ['th', th],
    ['tr', tr],
    ['uk', uk],
    ['vi', vi],
    ['zh', zh],
    ['zh-TW', zhTW]
]);

export function getTranslations(language: string): Translations {
    return catalogs.get(language) ?? en;
}
