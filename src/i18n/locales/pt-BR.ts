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

export const ptBR: Translations = {
    name: 'MarkdownPoint',
    outline: 'Sumário',
    sidebar: 'Barra lateral',
    sidebarDescription: 'Mostrar o sumário na barra lateral esquerda ou direita. Se usar o Notebook Navigator, mantenha-o à direita.',
    left: 'Esquerda',
    right: 'Direita',
    emptySlide: 'Slide sem título',
    fields: {
        text: 'Texto',
        numbered: ({ name, number }: { name: string; number: string }) => `${name} ${number}`,
        names: {
            title: 'Título',
            body: 'Corpo',
            eyebrow: 'Sobretítulo',
            heading: 'Cabeçalho',
            subtitle: 'Subtítulo',
            caption: 'Legenda',
            quote: 'Citação',
            attribution: 'Atribuição',
            code: 'Código',
            label: 'Rótulo',
            footer: 'Rodapé',
            number: 'Número'
        }
    },
    images: {
        show: 'Mostrar imagens',
        description: 'Mostrar até cinco imagens abaixo da miniatura de cada slide no editor.',
        preview: 'Imagem do slide'
    },
    notes: { label: 'Notas da apresentação', placeholder: 'Notas' },
    clipboard: { copyText: 'Copiar', copyFailed: 'Não foi possível copiar o texto.' },
    presentations: {
        new: 'Nova apresentação',
        name: 'Nome',
        folder: 'Pasta',
        theme: 'Tema',
        included: 'Incluído',
        root: 'Raiz do cofre',
        untitled: 'Apresentação sem título',
        create: 'Criar',
        creating: 'Criando…',
        cancel: 'Cancelar',
        invalidName: 'Digite um nome sem barras nem caracteres reservados.',
        exists: 'Já existe um arquivo ou uma pasta com este nome.',
        failed: 'Não foi possível criar a apresentação. Verifique a pasta e tente novamente.',
        openFailed: 'A apresentação foi criada, mas não pôde ser aberta. Abra o slides.md na pasta dela.',
        openChanged: 'A apresentação mudou ou não pôde ser lida. Tente novamente.',
        handoffFailed: 'Não foi possível salvar e abrir a apresentação.',
        themeChanged: 'O tema mudou ou está indisponível. Reabra esta janela e escolha-o novamente.',
        newerFormat: ({ version }: { version: string }) =>
            `Esta apresentação usa um formato mais novo do MarkdownPoint (${version}). Atualize o plugin MarkdownPoint para abri-la como apresentação.`
    },
    slides: {
        new: 'Novo slide',
        shortcut: 'Atalho',
        noShortcut: 'Nenhum',
        shortcutHint: 'Pressione o número de um layout para usá-lo. Clique com o botão direito em um layout para atribuir um atalho.',
        shortcutFailed: 'Não foi possível salvar o atalho.',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name}, atalho ${digit}` : name),
        layoutsUnavailable: 'Não há layouts disponíveis nesta apresentação.',
        layoutChanged: 'O layout mudou. Escolha-o novamente.',
        newFailed: 'A apresentação mudou antes de o slide ser adicionado. Tente novamente.',
        actions: 'Ações do slide',
        copy: ({ count }: { count: number }) => (count === 1 ? 'Copiar slide' : 'Copiar slides'),
        cut: ({ count }: { count: number }) => (count === 1 ? 'Cortar slide' : 'Cortar slides'),
        cutChanged: 'A apresentação mudou antes de os slides serem cortados. Eles foram apenas copiados.',
        cutFailed: 'Não foi possível cortar os slides. Eles foram apenas copiados.',
        paste: 'Colar slides',
        pasteEmpty: 'Copie um slide no Obsidian primeiro.',
        pasteDestination: 'O tema desta apresentação não corresponde a estes slides. Copie-os e cole-os no app MarkdownPoint.',
        pasteVault: 'Estes slides são de outro cofre. Copie-os e cole-os no app MarkdownPoint.',
        pasteArtwork: 'A arte do tema é diferente entre estas apresentações. Copie e cole os slides no app MarkdownPoint.',
        pasteChanged: 'A apresentação mudou antes de os slides serem colados. Tente novamente.',
        pasteFailed: 'Não foi possível colar os slides.',
        copyFailed: 'Não foi possível copiar os slides.',
        copyUnavailable: 'Não foi possível ler a apresentação ou os arquivos do tema dela.',
        copyChanged: 'A apresentação mudou antes de os slides serem copiados. Tente novamente.',
        copyNewer:
            'Esta apresentação usa um formato mais novo do MarkdownPoint. Atualize o plugin MarkdownPoint para copiar ou cortar os slides dela.',
        delete: ({ count }: { count: number }) => (count === 1 ? 'Excluir slide' : 'Excluir slides'),
        deleteFailed: 'Não foi possível excluir os slides.',
        recoveryUnavailable: 'Não foi possível ler as cópias de recuperação neste dispositivo.',
        saveFailed: 'Não foi possível salvar os dados da apresentação. Uma cópia de recuperação é mantida neste dispositivo.',
        retry: 'Tentar novamente',
        empty: 'Nenhum slide'
    },
    commands: {
        newPresentation: 'Nova apresentação',
        openInMarkdownPoint: 'Abrir no MarkdownPoint',
        newSlide: 'Novo slide',
        focusOutline: 'Focar no sumário',
        focusEditor: 'Focar no editor',
        moveSlidesUp: 'Mover slides para cima',
        moveSlidesDown: 'Mover slides para baixo'
    },
    whatsNew: {
        title: 'Novidades do MarkdownPoint',
        version: ({ version }: { version: string }) => `Versão ${version}`,
        new: 'Novo',
        improved: 'Melhorado',
        changed: 'Alterado',
        fixed: 'Corrigido',
        close: 'Fechar',
        section: 'Notas de lançamento',
        setting: ({ version }: { version: string }) => `Novidades do MarkdownPoint ${version}`,
        settingDescription: 'Veja o que mudou nas versões recentes.',
        view: 'Ver atualizações recentes',
        showOnUpdate: 'Mostrar as novidades após uma atualização',
        showOnUpdateDescription: 'Abrir a janela de novidades uma vez após cada atualização.'
    }
};
