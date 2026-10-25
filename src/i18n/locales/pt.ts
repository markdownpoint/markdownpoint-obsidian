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

export const pt: Translations = {
    name: 'MarkdownPoint',
    outline: 'Índice',
    sidebar: 'Barra lateral',
    left: 'Esquerda',
    right: 'Direita',
    emptySlide: 'Diapositivo sem título',
    fields: {
        text: 'Texto',
        numbered: ({ name, number }: { name: string; number: string }) => `${name} ${number}`,
        names: {
            title: 'Título',
            body: 'Corpo',
            eyebrow: 'Antetítulo',
            heading: 'Cabeçalho',
            subtitle: 'Subtítulo',
            caption: 'Legenda',
            quote: 'Citação',
            attribution: 'Autoria',
            code: 'Código',
            label: 'Etiqueta',
            footer: 'Rodapé',
            number: 'Número'
        }
    },
    images: {
        show: 'Mostrar imagens dos diapositivos',
        description: 'Mostrar até cinco imagens abaixo da miniatura de cada diapositivo no editor.',
        preview: 'Imagem do diapositivo'
    },
    notes: { label: 'Notas do apresentador', placeholder: 'Notas' },
    clipboard: { copyText: 'Copiar', copyFailed: 'Não foi possível copiar o texto.' },
    presentations: {
        new: 'Nova apresentação',
        name: 'Nome',
        folder: 'Pasta',
        theme: 'Tema',
        included: 'Incluído',
        root: 'Pasta do cofre',
        untitled: 'Apresentação sem título',
        create: 'Criar',
        creating: 'A criar…',
        cancel: 'Cancelar',
        invalidName: 'Introduza um nome sem barras nem caracteres reservados.',
        exists: 'Já existe um ficheiro ou uma pasta com este nome.',
        failed: 'Não foi possível criar a apresentação. Verifique a pasta e tente novamente.',
        openFailed: 'A apresentação foi criada, mas não foi possível abri-la. Abra o slides.md na pasta da apresentação.',
        openChanged: 'A apresentação foi alterada ou não foi possível lê-la. Tente novamente.',
        handoffFailed: 'Não foi possível guardar e abrir a apresentação.',
        themeChanged: 'O tema foi alterado ou não está disponível. Volte a abrir esta caixa de diálogo e escolha-o novamente.',
        newerFormat: ({ version }: { version: string }) =>
            `Esta apresentação usa um formato MarkdownPoint mais recente (${version}). Atualize o plugin MarkdownPoint para a abrir como apresentação.`
    },
    slides: {
        new: 'Novo diapositivo',
        shortcut: 'Atalho',
        noShortcut: 'Nenhum',
        shortcutHint:
            'Prima o número de uma disposição para a usar. Clique com o botão direito numa disposição para lhe atribuir um atalho.',
        shortcutFailed: 'Não foi possível guardar o atalho.',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name}, atalho ${digit}` : name),
        layoutsUnavailable: 'Não há disposições disponíveis nesta apresentação.',
        layoutChanged: 'A disposição foi alterada. Escolha-a novamente.',
        newFailed: 'A apresentação foi alterada antes de o diapositivo ser adicionado. Tente novamente.',
        actions: 'Ações do diapositivo',
        copy: ({ count }: { count: number }) => (count === 1 ? 'Copiar diapositivo' : 'Copiar diapositivos'),
        cut: ({ count }: { count: number }) => (count === 1 ? 'Cortar diapositivo' : 'Cortar diapositivos'),
        cutChanged: 'A apresentação foi alterada antes de os diapositivos serem cortados. Foram apenas copiados.',
        cutFailed: 'Não foi possível cortar os diapositivos. Foram apenas copiados.',
        paste: 'Colar diapositivos',
        pasteEmpty: 'Copie primeiro um diapositivo no Obsidian.',
        pasteDestination: 'O tema desta apresentação não corresponde a estes diapositivos. Copie-os e cole-os na aplicação MarkdownPoint.',
        pasteVault: 'Estes diapositivos são de outro cofre. Copie-os e cole-os na aplicação MarkdownPoint.',
        pasteArtwork: 'O grafismo do tema difere entre estas apresentações. Copie e cole os diapositivos na aplicação MarkdownPoint.',
        pasteChanged: 'A apresentação foi alterada antes de os diapositivos serem colados. Tente novamente.',
        pasteFailed: 'Não foi possível colar os diapositivos.',
        copyFailed: 'Não foi possível copiar os diapositivos.',
        copyUnavailable: 'Não foi possível ler a apresentação ou os ficheiros do tema.',
        copyChanged: 'A apresentação foi alterada antes de os diapositivos serem copiados. Tente novamente.',
        copyNewer:
            'Esta apresentação usa um formato MarkdownPoint mais recente. Atualize o plugin MarkdownPoint para copiar ou cortar os diapositivos.',
        delete: ({ count }: { count: number }) => (count === 1 ? 'Eliminar diapositivo' : 'Eliminar diapositivos'),
        deleteFailed: 'Não foi possível eliminar os diapositivos.',
        recoveryUnavailable: 'Não foi possível ler as cópias de recuperação neste dispositivo.',
        saveFailed: 'Não foi possível guardar os dados da apresentação. Fica guardada uma cópia de recuperação neste dispositivo.',
        retry: 'Tentar novamente',
        empty: 'Sem diapositivos'
    },
    commands: {
        newPresentation: 'Nova apresentação',
        openInMarkdownPoint: 'Abrir no MarkdownPoint',
        newSlide: 'Novo diapositivo',
        focusOutline: 'Focar no índice',
        focusEditor: 'Focar no editor',
        moveSlidesUp: 'Mover diapositivos para cima',
        moveSlidesDown: 'Mover diapositivos para baixo'
    },
    whatsNew: {
        title: 'Novidades do MarkdownPoint',
        version: ({ version }: { version: string }) => `Versão ${version}`,
        new: 'Novo',
        improved: 'Melhorado',
        changed: 'Alterado',
        fixed: 'Corrigido',
        close: 'Fechar',
        setting: ({ version }: { version: string }) => `Novidades do MarkdownPoint ${version}`,
        settingDescription: 'Veja o que mudou nas versões recentes.',
        view: 'Ver atualizações recentes',
        showOnUpdate: 'Mostrar as novidades após uma atualização',
        showOnUpdateDescription: 'Abrir a caixa de diálogo de novidades uma vez após cada atualização.'
    }
};
