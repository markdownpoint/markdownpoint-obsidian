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
    sidebarDescription: 'A barra lateral que mostra o índice. Se utilizar o Notebook Navigator, coloque o índice à direita.',
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
        show: 'Mostrar imagens',
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
        exists: 'Já existe um ficheiro ou uma pasta com este nome. Introduza outro nome.',
        insidePresentation: ({ presentation }: { presentation: string }) =>
            `O MarkdownPoint não pode criar uma apresentação dentro de “${presentation}”. Escolha uma pasta fora de “${presentation}”.`,
        nested: ({ presentation, outer }: { presentation: string; outer: string }) =>
            `O MarkdownPoint não pode abrir a apresentação “${presentation}” enquanto estiver dentro de “${outer}”. Mova a pasta “${presentation}” para fora de “${outer}” e depois abra-a.`,
        failed: 'Não foi possível criar a apresentação. Tente novamente.',
        openFailed: 'O MarkdownPoint criou a apresentação, mas não conseguiu abri-la. Abra o slides.md na pasta da apresentação.',
        openChanged: 'A apresentação foi alterada antes de o MarkdownPoint conseguir abri-la. Tente novamente.',
        handoffFailed: 'Não foi possível guardar e abrir a apresentação.',
        themeChanged:
            'Não foi possível criar uma apresentação a partir do tema escolhido. Volte a abrir esta caixa de diálogo e escolha o tema novamente.',
        newerFormat: ({ version }: { version: string }) =>
            `Esta apresentação usa um formato MarkdownPoint mais recente, a versão ${version}. Atualize o plugin MarkdownPoint para a abrir como apresentação.`,
        unreadableFile: ({ file, presentation }: { file: string; presentation: string }) =>
            `O MarkdownPoint não consegue ler “${file}” em “${presentation}”. Abra a apresentação na aplicação MarkdownPoint para ver o que corrigir.`,
        unreadable: ({ presentation }: { presentation: string }) =>
            `O MarkdownPoint não consegue ler a apresentação em “${presentation}”. Abra-a na aplicação MarkdownPoint para ver o que corrigir.`
    },
    slides: {
        new: 'Adicionar diapositivo',
        shortcut: 'Atalho',
        noShortcut: 'Nenhum',
        shortcutHint:
            'Prima o atalho de uma disposição para a escolher. Clique com o botão direito numa disposição para lhe atribuir um atalho.',
        shortcutFailed: 'Não foi possível guardar o atalho.',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name}, atalho ${digit}` : name),
        layoutsUnavailable: 'Não há disposições disponíveis nesta apresentação.',
        layoutChanged: 'A disposição foi alterada antes de o MarkdownPoint conseguir adicionar o diapositivo. Tente novamente.',
        newFailed: 'A apresentação foi alterada antes de o MarkdownPoint conseguir adicionar o diapositivo. Tente novamente.',
        actions: 'Ações do diapositivo',
        copy: 'Copiar diapositivo',
        cut: 'Cortar diapositivo',
        cutChanged:
            'A apresentação foi alterada antes de o MarkdownPoint conseguir cortar os diapositivos. Estão na área de transferência e continuam na apresentação.',
        cutFailed: 'Não foi possível cortar os diapositivos. Estão na área de transferência e continuam na apresentação.',
        paste: 'Colar diapositivo',
        pasteEmpty: 'Copie primeiro um diapositivo no Obsidian.',
        pasteDestination: 'O tema desta apresentação não corresponde a estes diapositivos. Copie-os e cole-os na aplicação MarkdownPoint.',
        pasteVault: 'Estes diapositivos são de outro cofre. Copie-os e cole-os na aplicação MarkdownPoint.',
        pasteArtwork: 'Os temas das duas apresentações têm grafismos diferentes. Copie e cole os diapositivos na aplicação MarkdownPoint.',
        pasteChanged: 'A apresentação foi alterada antes de o MarkdownPoint conseguir colar os diapositivos. Tente novamente.',
        pasteFailed: 'Não foi possível colar os diapositivos.',
        copyFailed: 'Não foi possível copiar os diapositivos.',
        copyUnavailable: 'Não foi possível ler a apresentação ou os ficheiros do tema.',
        copyChanged: 'A apresentação foi alterada antes de o MarkdownPoint conseguir copiar os diapositivos. Tente novamente.',
        copyNewer:
            'Esta apresentação usa um formato MarkdownPoint mais recente. Atualize o plugin MarkdownPoint para copiar ou cortar os diapositivos.',
        delete: 'Eliminar diapositivo',
        deleteFailed: 'Não foi possível eliminar os diapositivos.',
        recoveryUnavailable: 'Não foi possível ler as cópias de recuperação neste dispositivo.',
        saveFailed: 'Não foi possível guardar os dados da apresentação.',
        retry: 'Tentar novamente',
        empty: 'Sem diapositivos'
    },
    commands: {
        newPresentation: 'Nova apresentação',
        openInMarkdownPoint: 'Abrir no MarkdownPoint',
        newSlide: 'Adicionar diapositivo',
        focusOutline: 'Focar no índice',
        focusEditor: 'Focar no editor',
        moveSlidesUp: 'Mover diapositivo para cima',
        moveSlidesDown: 'Mover diapositivo para baixo'
    },
    whatsNew: {
        title: 'Novidades do MarkdownPoint',
        version: ({ version }: { version: string }) => `Versão ${version}`,
        new: 'Novo',
        improved: 'Melhorado',
        changed: 'Alterado',
        fixed: 'Corrigido',
        close: 'Fechar',
        section: 'Notas da versão',
        setting: ({ version }: { version: string }) => `Novidades do MarkdownPoint ${version}`,
        settingDescription: 'Veja o que mudou nas versões recentes.',
        view: 'Ver notas da versão',
        showOnUpdate: 'Mostrar as notas da versão após uma atualização'
    }
};
