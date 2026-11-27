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

export const zh: Translations = {
    name: 'MarkdownPoint',
    outline: '大纲',
    sidebar: '侧边栏',
    sidebarDescription: '显示大纲的侧边栏。使用 Notebook Navigator 时，请将大纲放在右侧。',
    left: '左侧',
    right: '右侧',
    emptySlide: '无标题幻灯片',
    fields: {
        text: '文本',
        numbered: ({ name, number }: { name: string; number: string }) => `${name} ${number}`,
        names: {
            title: '标题',
            body: '正文',
            eyebrow: '眉题',
            heading: '小标题',
            subtitle: '副标题',
            caption: '说明',
            quote: '引文',
            attribution: '出处',
            code: '代码',
            label: '标签',
            footer: '页脚',
            number: '编号'
        }
    },
    images: { show: '显示图像', description: '在编辑器中，每张幻灯片的缩略图下方最多显示五张图像。', preview: '幻灯片图像' },
    notes: { label: '演讲者注释', placeholder: '注释' },
    clipboard: { copyText: '复制', copyFailed: '无法复制文本。' },
    presentations: {
        new: '新建演示文稿',
        name: '名称',
        folder: '文件夹',
        theme: '主题',
        included: '内置',
        root: '仓库根目录',
        untitled: '未命名演示文稿',
        create: '创建',
        creating: '正在创建…',
        cancel: '取消',
        invalidName: '请输入不含斜杠或保留字符的名称。',
        exists: '已存在同名文件或文件夹。请输入其他名称。',
        insidePresentation: ({ presentation }: { presentation: string }) =>
            `MarkdownPoint 无法在“${presentation}”中创建演示文稿。请选取“${presentation}”之外的文件夹。`,
        nested: ({ presentation, outer }: { presentation: string; outer: string }) =>
            `MarkdownPoint 无法打开“${presentation}”，因为它位于“${outer}”中。请把“${presentation}”文件夹移出“${outer}”，然后打开它。`,
        failed: '无法创建演示文稿。请重试。',
        openFailed: 'MarkdownPoint 已创建演示文稿，但无法打开它。请打开其文件夹中的 slides.md。',
        openChanged: '演示文稿在 MarkdownPoint 打开它之前已更改。请重试。',
        handoffFailed: '无法保存并打开演示文稿。',
        themeChanged: '无法用所选主题创建演示文稿。请重新打开此对话框，然后再次选择该主题。',
        newerFormat: ({ version }: { version: string }) =>
            `此演示文稿使用较新的 MarkdownPoint 格式，版本为 ${version}。请更新 MarkdownPoint 插件，以便作为演示文稿打开它。`,
        unreadableFile: ({ file, presentation }: { file: string; presentation: string }) =>
            `MarkdownPoint 无法读取“${presentation}”中的“${file}”。请在 MarkdownPoint 应用中打开演示文稿，以便查看需要修复的内容。`,
        unreadable: ({ presentation }: { presentation: string }) =>
            `MarkdownPoint 无法读取“${presentation}”中的演示文稿。请在 MarkdownPoint 应用中打开它，以便查看需要修复的内容。`
    },
    slides: {
        new: '添加幻灯片',
        shortcut: '快捷键',
        noShortcut: '无',
        shortcutHint: '按下布局的快捷键即可选择它。右键点击布局可分配快捷键。',
        shortcutFailed: '无法保存快捷键。',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name}，快捷键 ${digit}` : name),
        layoutsUnavailable: '此演示文稿中没有可用的布局。',
        layoutChanged: '布局在 MarkdownPoint 添加幻灯片之前已更改。请重试。',
        newFailed: '演示文稿在 MarkdownPoint 添加幻灯片之前已更改。请重试。',
        actions: '幻灯片操作',
        copy: '复制幻灯片',
        cut: '剪切幻灯片',
        cutChanged: '演示文稿在 MarkdownPoint 剪切幻灯片之前已更改。这些幻灯片在剪贴板上，也仍在演示文稿中。',
        cutFailed: '无法剪切幻灯片。这些幻灯片在剪贴板上，也仍在演示文稿中。',
        paste: '粘贴幻灯片',
        pasteEmpty: '请先在 Obsidian 中复制幻灯片。',
        pasteDestination: '此演示文稿的主题与这些幻灯片不匹配。请在 MarkdownPoint 应用中复制并粘贴它们。',
        pasteVault: '这些幻灯片来自另一个仓库。请在 MarkdownPoint 应用中复制并粘贴它们。',
        pasteArtwork: '这两个演示文稿的主题素材不同。请在 MarkdownPoint 应用中复制并粘贴这些幻灯片。',
        pasteChanged: '演示文稿在 MarkdownPoint 粘贴幻灯片之前已更改。请重试。',
        pasteFailed: '无法粘贴幻灯片。',
        copyFailed: '无法复制幻灯片。',
        copyUnavailable: '无法读取演示文稿或其主题文件。',
        copyChanged: '演示文稿在 MarkdownPoint 复制幻灯片之前已更改。请重试。',
        copyNewer: '此演示文稿使用较新的 MarkdownPoint 格式。请更新 MarkdownPoint 插件，以便复制或剪切其中的幻灯片。',
        delete: '删除幻灯片',
        deleteFailed: '无法删除幻灯片。',
        recoveryUnavailable: '无法读取此设备上的恢复副本。',
        saveFailed: '无法保存演示文稿数据。',
        retry: '重试',
        empty: '没有幻灯片'
    },
    commands: {
        newPresentation: '新建演示文稿',
        openInMarkdownPoint: '在 MarkdownPoint 中打开',
        newSlide: '添加幻灯片',
        focusOutline: '聚焦大纲',
        focusEditor: '聚焦编辑器',
        moveSlidesUp: '向上移动幻灯片',
        moveSlidesDown: '向下移动幻灯片'
    },
    whatsNew: {
        title: 'MarkdownPoint 的新功能',
        version: ({ version }: { version: string }) => `版本 ${version}`,
        new: '新增',
        improved: '改进',
        changed: '变更',
        fixed: '修复',
        close: '关闭',
        section: '版本说明',
        setting: ({ version }: { version: string }) => `MarkdownPoint ${version} 的新功能`,
        settingDescription: '查看最近几个版本的改动。',
        view: '查看版本说明',
        showOnUpdate: '更新后显示版本说明'
    }
};
