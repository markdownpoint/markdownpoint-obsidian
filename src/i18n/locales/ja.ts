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

import type { Translations } from "../index.ts";

export const ja: Translations = {
  name: "MarkdownPoint",
  outline: "アウトライン",
  sidebar: "サイドバー",
  left: "左",
  right: "右",
  emptySlide: "タイトルなしのスライド",
  fields: {
    text: "テキスト",
    numbered: ({ name, number }: { name: string; number: string }) => `${name}${number}`,
    names: {
      title: "タイトル", body: "本文", eyebrow: "小見出し", heading: "見出し", subtitle: "サブタイトル",
      caption: "キャプション", quote: "引用", attribution: "引用元", code: "コード", label: "ラベル",
      footer: "フッタ", number: "番号",
    },
  },
  images: { show: "スライドの画像を表示", description: "エディタで各スライドのサムネールの下に画像を最大5枚表示します。", preview: "スライドの画像" },
  notes: { label: "発表者ノート", placeholder: "ノート" },
  clipboard: { copyText: "コピー", copyFailed: "テキストをコピーできませんでした。" },
  presentations: {
    new: "新規プレゼンテーション", name: "名前", folder: "フォルダ", theme: "テーマ", included: "付属", root: "保管庫直下",
    untitled: "名称未設定のプレゼンテーション", create: "作成", creating: "作成中…", cancel: "キャンセル",
    invalidName: "スラッシュや使用できない文字を含まない名前を入力してください。",
    exists: "同じ名前のファイルまたはフォルダがすでにあります。",
    failed: "プレゼンテーションを作成できませんでした。フォルダを確認して、もう一度お試しください。",
    openFailed: "プレゼンテーションは作成されましたが、開けませんでした。そのフォルダのslides.mdを開いてください。",
    openChanged: "プレゼンテーションが変更されたか、読み込めませんでした。もう一度お試しください。",
    handoffFailed: "プレゼンテーションを保存して開くことができませんでした。",
    themeChanged: "テーマが変更されたか、利用できません。このダイアログを開き直して、もう一度テーマを選んでください。",
  },
  slides: {
    new: "新規スライド",
    shortcut: "ショートカット",
    noShortcut: "なし",
    shortcutHint: "レイアウトの番号を押すと使えます。レイアウトを右クリックするとショートカットを割り当てられます。",
    shortcutFailed: "ショートカットを保存できませんでした。",
    layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => digit ? `${name}、ショートカット${digit}` : name,
    layoutsUnavailable: "このプレゼンテーションで使えるレイアウトはありません。",
    layoutChanged: "レイアウトが変更されました。もう一度選んでください。",
    newFailed: "スライドを追加する前にプレゼンテーションが変更されました。もう一度お試しください。",
    actions: "スライドの操作",
    copy: () => "スライドをコピー",
    cut: () => "スライドをカット",
    cutChanged: "スライドをカットする前にプレゼンテーションが変更されたため、コピーのみ行いました。",
    cutFailed: "スライドをカットできなかったため、コピーのみ行いました。",
    paste: "スライドをペースト",
    pasteEmpty: "先にObsidianでスライドをコピーしてください。",
    pasteDestination: "このプレゼンテーションのテーマはこれらのスライドと一致しません。MarkdownPointアプリでコピーしてペーストしてください。",
    pasteVault: "これらのスライドは別の保管庫のものです。MarkdownPointアプリでコピーしてペーストしてください。",
    pasteArtwork: "これらのプレゼンテーションではテーマのアートワークが異なります。MarkdownPointアプリでスライドをコピーしてペーストしてください。",
    pasteChanged: "スライドをペーストする前にプレゼンテーションが変更されました。もう一度お試しください。",
    pasteFailed: "スライドをペーストできませんでした。",
    copyFailed: "スライドをコピーできませんでした。",
    copyUnavailable: "プレゼンテーションまたはテーマのファイルを読み込めませんでした。",
    copyChanged: "スライドをコピーする前にプレゼンテーションが変更されました。もう一度お試しください。",
    delete: () => "スライドを削除",
    deleteFailed: "スライドを削除できませんでした。",
    recoveryUnavailable: "このデバイスの復元用コピーを読み込めませんでした。",
    saveFailed: "プレゼンテーションのデータを保存できませんでした。復元用コピーをこのデバイスに残しています。",
    retry: "再試行",
    empty: "スライドがありません",
  },
  commands: {
    newPresentation: "新規プレゼンテーション",
    openInMarkdownPoint: "MarkdownPointで開く",
    newSlide: "新規スライド",
    focusOutline: "アウトラインにフォーカス",
    focusEditor: "エディタにフォーカス",
    moveSlidesUp: "スライドを上に移動",
    moveSlidesDown: "スライドを下に移動",
  },
};
