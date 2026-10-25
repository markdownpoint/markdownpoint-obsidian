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

import type { Translations } from '../index.ts';

export const zhTW: Translations = {
    name: 'MarkdownPoint',
    outline: '大綱',
    sidebar: '側邊欄',
    left: '左側',
    right: '右側',
    emptySlide: '未命名投影片',
    fields: {
        text: '文字',
        numbered: ({ name, number }: { name: string; number: string }) => `${name} ${number}`,
        names: {
            title: '標題',
            body: '內文',
            eyebrow: '眉標',
            heading: '標頭',
            subtitle: '副標題',
            caption: '說明',
            quote: '引言',
            attribution: '出處',
            code: '程式碼',
            label: '標籤',
            footer: '頁尾',
            number: '數字'
        }
    },
    images: { show: '顯示投影片圖片', description: '在編輯器中，於每張投影片的縮圖下方顯示最多五張圖片。', preview: '投影片圖片' },
    notes: { label: '簡報者附註', placeholder: '附註' },
    clipboard: { copyText: '複製', copyFailed: '無法複製文字。' },
    presentations: {
        new: '新增簡報',
        name: '名稱',
        folder: '資料夾',
        theme: '主題',
        included: '內建',
        root: '儲存庫的根目錄',
        untitled: '未命名簡報',
        create: '建立',
        creating: '正在建立…',
        cancel: '取消',
        invalidName: '請輸入不含斜線或保留字元的名稱。',
        exists: '已有同名的檔案或資料夾。',
        failed: '無法建立簡報。請檢查資料夾後再試一次。',
        openFailed: '已建立簡報，但無法開啟。請開啟其資料夾中的 slides.md。',
        openChanged: '簡報已變更或無法讀取。請再試一次。',
        handoffFailed: '無法儲存並開啟簡報。',
        themeChanged: '主題已變更或無法使用。請重新開啟此對話框並再次選擇。'
    },
    slides: {
        new: '新增投影片',
        shortcut: '快速鍵',
        noShortcut: '無',
        shortcutHint: '按下佈局的數字即可使用。右鍵點擊佈局可指定快速鍵。',
        shortcutFailed: '無法儲存快速鍵。',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name}，快速鍵 ${digit}` : name),
        layoutsUnavailable: '此簡報沒有可用的佈局。',
        layoutChanged: '佈局已變更。請重新選擇。',
        newFailed: '簡報在加入投影片前已變更。請再試一次。',
        actions: '投影片動作',
        copy: () => '複製投影片',
        cut: () => '剪下投影片',
        cutChanged: '簡報在剪下投影片前已變更。僅完成複製。',
        cutFailed: '無法剪下投影片。僅完成複製。',
        paste: '貼上投影片',
        pasteEmpty: '請先在 Obsidian 中複製投影片。',
        pasteDestination: '此簡報的主題與這些投影片不符。請在 MarkdownPoint 應用程式中複製並貼上。',
        pasteVault: '這些投影片來自另一個儲存庫。請在 MarkdownPoint 應用程式中複製並貼上。',
        pasteArtwork: '這些簡報的主題圖像不同。請在 MarkdownPoint 應用程式中複製並貼上投影片。',
        pasteChanged: '簡報在貼上投影片前已變更。請再試一次。',
        pasteFailed: '無法貼上投影片。',
        copyFailed: '無法複製投影片。',
        copyUnavailable: '無法讀取簡報或其主題檔案。',
        copyChanged: '簡報在複製投影片前已變更。請再試一次。',
        delete: () => '刪除投影片',
        deleteFailed: '無法刪除投影片。',
        recoveryUnavailable: '無法讀取此裝置上的復原副本。',
        saveFailed: '無法儲存簡報資料。此裝置上已保留復原副本。',
        retry: '重試',
        empty: '沒有投影片'
    },
    commands: {
        newPresentation: '新增簡報',
        openInMarkdownPoint: '在 MarkdownPoint 中開啟',
        newSlide: '新增投影片',
        focusOutline: '移至大綱',
        focusEditor: '移至編輯區',
        moveSlidesUp: '上移投影片',
        moveSlidesDown: '下移投影片'
    }
};
