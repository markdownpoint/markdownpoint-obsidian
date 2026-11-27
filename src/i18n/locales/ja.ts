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

export const ja: Translations = {
    name: 'MarkdownPoint',
    outline: 'アウトライン',
    sidebar: 'サイドバー',
    sidebarDescription: 'アウトラインを表示するサイドバーです。Notebook Navigatorを使う場合は、アウトラインを右に置いてください。',
    left: '左',
    right: '右',
    emptySlide: 'タイトルなしのスライド',
    fields: {
        text: 'テキスト',
        numbered: ({ name, number }: { name: string; number: string }) => `${name}${number}`,
        names: {
            title: 'タイトル',
            body: '本文',
            eyebrow: '小見出し',
            heading: '見出し',
            subtitle: 'サブタイトル',
            caption: 'キャプション',
            quote: '引用',
            attribution: '引用元',
            code: 'コード',
            label: 'ラベル',
            footer: 'フッタ',
            number: '番号'
        }
    },
    images: {
        show: '画像を表示',
        description: 'エディタで各スライドのサムネールの下に画像を最大5枚表示します。',
        preview: 'スライドの画像'
    },
    notes: { label: '発表者ノート', placeholder: 'ノート' },
    clipboard: { copyText: 'コピー', copyFailed: 'テキストをコピーできませんでした。' },
    presentations: {
        new: '新規プレゼンテーション',
        name: '名前',
        folder: 'フォルダ',
        theme: 'テーマ',
        included: '付属',
        root: '保管庫直下',
        untitled: '名称未設定のプレゼンテーション',
        create: '作成',
        creating: '作成中…',
        cancel: 'キャンセル',
        invalidName: 'スラッシュや使用できない文字を含まない名前を入力してください。',
        exists: '同じ名前のファイルまたはフォルダがすでにあります。別の名前を入力してください。',
        insidePresentation: ({ presentation }: { presentation: string }) =>
            `MarkdownPointは“${presentation}”の中にプレゼンテーションを作成できません。“${presentation}”の外にあるフォルダを選んでください。`,
        nested: ({ presentation, outer }: { presentation: string; outer: string }) =>
            `“${presentation}”が“${outer}”の中にある間は、MarkdownPointは開けません。フォルダ“${presentation}”を“${outer}”の外に移動してから、開いてください。`,
        failed: 'プレゼンテーションを作成できませんでした。もう一度お試しください。',
        openFailed: 'MarkdownPointはプレゼンテーションを作成しましたが、開けませんでした。そのフォルダのslides.mdを開いてください。',
        openChanged: 'MarkdownPointが開く前にプレゼンテーションが変更されました。もう一度お試しください。',
        handoffFailed: 'プレゼンテーションを保存して開くことができませんでした。',
        themeChanged:
            '選んだテーマからプレゼンテーションを作成できませんでした。このダイアログを開き直して、もう一度テーマを選んでください。',
        newerFormat: ({ version }: { version: string }) =>
            `このプレゼンテーションはMarkdownPointフォーマットの新しいバージョン${version}を使っています。プレゼンテーションとして開くには、MarkdownPointプラグインをアップデートしてください。`,
        unreadableFile: ({ file, presentation }: { file: string; presentation: string }) =>
            `MarkdownPointは“${presentation}”の“${file}”を読み込めません。修正が必要な箇所を確認するには、MarkdownPointアプリでプレゼンテーションを開いてください。`,
        unreadable: ({ presentation }: { presentation: string }) =>
            `MarkdownPointは“${presentation}”のプレゼンテーションを読み込めません。修正が必要な箇所を確認するには、MarkdownPointアプリで開いてください。`
    },
    slides: {
        new: 'スライドを追加',
        shortcut: 'ショートカット',
        noShortcut: 'なし',
        shortcutHint: 'レイアウトのショートカットを押すと選べます。レイアウトを右クリックするとショートカットを割り当てられます。',
        shortcutFailed: 'ショートカットを保存できませんでした。',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) =>
            digit ? `${name}、ショートカット${digit}` : name,
        layoutsUnavailable: 'このプレゼンテーションで使えるレイアウトはありません。',
        layoutChanged: 'MarkdownPointがスライドを追加する前にレイアウトが変更されました。もう一度お試しください。',
        newFailed: 'MarkdownPointがスライドを追加する前にプレゼンテーションが変更されました。もう一度お試しください。',
        actions: 'スライドの操作',
        copy: 'スライドをコピー',
        cut: 'スライドをカット',
        cutChanged:
            'MarkdownPointがスライドをカットする前にプレゼンテーションが変更されました。スライドはクリップボードにあり、プレゼンテーションにも残っています。',
        cutFailed: 'スライドをカットできませんでした。スライドはクリップボードにあり、プレゼンテーションにも残っています。',
        paste: 'スライドをペースト',
        pasteEmpty: '先にObsidianでスライドをコピーしてください。',
        pasteDestination:
            'このプレゼンテーションのテーマはこれらのスライドと一致しません。MarkdownPointアプリでコピーしてペーストしてください。',
        pasteVault: 'これらのスライドは別の保管庫のものです。MarkdownPointアプリでコピーしてペーストしてください。',
        pasteArtwork:
            '2つのプレゼンテーションのテーマはアートワークが異なります。MarkdownPointアプリでスライドをコピーしてペーストしてください。',
        pasteChanged: 'MarkdownPointがスライドをペーストする前にプレゼンテーションが変更されました。もう一度お試しください。',
        pasteFailed: 'スライドをペーストできませんでした。',
        copyFailed: 'スライドをコピーできませんでした。',
        copyUnavailable: 'プレゼンテーションまたはテーマのファイルを読み込めませんでした。',
        copyChanged: 'MarkdownPointがスライドをコピーする前にプレゼンテーションが変更されました。もう一度お試しください。',
        copyNewer:
            'このプレゼンテーションは新しいバージョンのMarkdownPointフォーマットを使っています。スライドをコピーまたはカットするには、MarkdownPointプラグインをアップデートしてください。',
        delete: 'スライドを削除',
        deleteFailed: 'スライドを削除できませんでした。',
        recoveryUnavailable: 'このデバイスの復元用コピーを読み込めませんでした。',
        saveFailed: 'プレゼンテーションのデータを保存できませんでした。',
        retry: '再試行',
        empty: 'スライドがありません'
    },
    commands: {
        newPresentation: '新規プレゼンテーション',
        openInMarkdownPoint: 'MarkdownPointで開く',
        newSlide: 'スライドを追加',
        focusOutline: 'アウトラインにフォーカス',
        focusEditor: 'エディタにフォーカス',
        moveSlidesUp: 'スライドを上に移動',
        moveSlidesDown: 'スライドを下に移動'
    },
    whatsNew: {
        title: 'MarkdownPointの新機能',
        version: ({ version }: { version: string }) => `バージョン${version}`,
        new: '新機能',
        improved: '改善',
        changed: '変更',
        fixed: '修正',
        close: '閉じる',
        section: 'リリースノート',
        setting: ({ version }: { version: string }) => `MarkdownPoint ${version}の新機能`,
        settingDescription: '最近のリリースで変わった点を確認します。',
        view: 'リリースノートを表示',
        showOnUpdate: 'アップデート後にリリースノートを表示'
    }
};
