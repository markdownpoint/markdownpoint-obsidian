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
    images: { show: '显示幻灯片图像', description: '在编辑器中，每张幻灯片的缩略图下方最多显示五张图像。', preview: '幻灯片图像' },
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
        exists: '已存在同名文件或文件夹。',
        failed: '无法创建演示文稿。请检查文件夹，然后重试。',
        openFailed: '演示文稿已创建，但无法打开。请打开其文件夹中的 slides.md。',
        openChanged: '演示文稿已更改或无法读取。请重试。',
        handoffFailed: '无法保存并打开演示文稿。',
        themeChanged: '主题已更改或不可用。请重新打开此对话框，然后再次选择它。',
        newerFormat: ({ version }: { version: string }) =>
            `此演示文稿使用较新的 MarkdownPoint 格式（${version}）。请更新 MarkdownPoint 插件，以便作为演示文稿打开它。`
    },
    slides: {
        new: '新建幻灯片',
        shortcut: '快捷键',
        noShortcut: '无',
        shortcutHint: '按下布局的数字即可使用它。右键点击布局可分配快捷键。',
        shortcutFailed: '无法保存快捷键。',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name}，快捷键 ${digit}` : name),
        layoutsUnavailable: '此演示文稿中没有可用的布局。',
        layoutChanged: '布局已更改。请再次选择它。',
        newFailed: '添加幻灯片之前，演示文稿已更改。请重试。',
        actions: '幻灯片操作',
        copy: () => '复制幻灯片',
        cut: () => '剪切幻灯片',
        cutChanged: '剪切幻灯片之前，演示文稿已更改。它们只被复制了。',
        cutFailed: '无法剪切幻灯片。它们只被复制了。',
        paste: '粘贴幻灯片',
        pasteEmpty: '请先在 Obsidian 中复制幻灯片。',
        pasteDestination: '此演示文稿的主题与这些幻灯片不匹配。请在 MarkdownPoint 应用中复制并粘贴它们。',
        pasteVault: '这些幻灯片来自另一个仓库。请在 MarkdownPoint 应用中复制并粘贴它们。',
        pasteArtwork: '这些演示文稿的主题素材不同。请在 MarkdownPoint 应用中复制并粘贴这些幻灯片。',
        pasteChanged: '粘贴幻灯片之前，演示文稿已更改。请重试。',
        pasteFailed: '无法粘贴幻灯片。',
        copyFailed: '无法复制幻灯片。',
        copyUnavailable: '无法读取演示文稿或其主题文件。',
        copyChanged: '复制幻灯片之前，演示文稿已更改。请重试。',
        copyNewer: '此演示文稿使用较新的 MarkdownPoint 格式。请更新 MarkdownPoint 插件，以便复制或剪切其中的幻灯片。',
        delete: () => '删除幻灯片',
        deleteFailed: '无法删除幻灯片。',
        recoveryUnavailable: '无法读取此设备上的恢复副本。',
        saveFailed: '无法保存演示文稿数据。此设备上保留了一份恢复副本。',
        retry: '重试',
        empty: '没有幻灯片'
    },
    commands: {
        newPresentation: '新建演示文稿',
        openInMarkdownPoint: '在 MarkdownPoint 中打开',
        newSlide: '新建幻灯片',
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
        setting: ({ version }: { version: string }) => `MarkdownPoint ${version} 的新功能`,
        settingDescription: '查看最近几个版本的改动。',
        view: '查看最近更新',
        showOnUpdate: '更新后显示新功能',
        showOnUpdateDescription: '每次更新后打开一次新功能对话框。'
    }
};
