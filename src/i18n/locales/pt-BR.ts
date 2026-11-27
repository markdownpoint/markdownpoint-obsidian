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
    sidebarDescription: 'A barra lateral que mostra o sumário. Se você usa o Notebook Navigator, coloque o sumário à direita.',
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
        exists: 'Já existe um arquivo ou uma pasta com este nome. Digite outro nome.',
        insidePresentation: ({ presentation }: { presentation: string }) =>
            `O MarkdownPoint não pode criar uma apresentação dentro de “${presentation}”. Escolha uma pasta fora de “${presentation}”.`,
        nested: ({ presentation, outer }: { presentation: string; outer: string }) =>
            `O MarkdownPoint não pode abrir a apresentação “${presentation}” enquanto ela estiver dentro de “${outer}”. Mova a pasta “${presentation}” para fora de “${outer}” e abra-a.`,
        failed: 'Não foi possível criar a apresentação. Tente novamente.',
        openFailed: 'O MarkdownPoint criou a apresentação, mas não conseguiu abri-la. Abra o slides.md na pasta dela.',
        openChanged: 'A apresentação mudou antes que o MarkdownPoint pudesse abri-la. Tente novamente.',
        handoffFailed: 'Não foi possível salvar e abrir a apresentação.',
        themeChanged: 'Não foi possível criar uma apresentação com o tema escolhido. Reabra esta janela e escolha o tema novamente.',
        newerFormat: ({ version }: { version: string }) =>
            `Esta apresentação usa um formato mais novo do MarkdownPoint, a versão ${version}. Atualize o plugin MarkdownPoint para abri-la como apresentação.`,
        unreadableFile: ({ file, presentation }: { file: string; presentation: string }) =>
            `O MarkdownPoint não consegue ler “${file}” em “${presentation}”. Abra a apresentação no app MarkdownPoint para ver o que corrigir.`,
        unreadable: ({ presentation }: { presentation: string }) =>
            `O MarkdownPoint não consegue ler a apresentação em “${presentation}”. Abra-a no app MarkdownPoint para ver o que corrigir.`
    },
    slides: {
        new: 'Adicionar slide',
        shortcut: 'Atalho',
        noShortcut: 'Nenhum',
        shortcutHint: 'Pressione o atalho de um layout para escolhê-lo. Clique com o botão direito em um layout para atribuir um atalho.',
        shortcutFailed: 'Não foi possível salvar o atalho.',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name}, atalho ${digit}` : name),
        layoutsUnavailable: 'Não há layouts disponíveis nesta apresentação.',
        layoutChanged: 'O layout mudou antes que o MarkdownPoint pudesse adicionar o slide. Tente novamente.',
        newFailed: 'A apresentação mudou antes que o MarkdownPoint pudesse adicionar o slide. Tente novamente.',
        actions: 'Ações do slide',
        copy: 'Copiar slide',
        cut: 'Cortar slide',
        cutChanged:
            'A apresentação mudou antes que o MarkdownPoint pudesse cortar os slides. Eles estão na área de transferência e continuam na apresentação.',
        cutFailed: 'Não foi possível cortar os slides. Eles estão na área de transferência e continuam na apresentação.',
        paste: 'Colar slide',
        pasteEmpty: 'Copie um slide no Obsidian primeiro.',
        pasteDestination: 'O tema desta apresentação não corresponde a estes slides. Copie-os e cole-os no app MarkdownPoint.',
        pasteVault: 'Estes slides são de outro cofre. Copie-os e cole-os no app MarkdownPoint.',
        pasteArtwork: 'Os temas das duas apresentações têm artes diferentes. Copie e cole os slides no app MarkdownPoint.',
        pasteChanged: 'A apresentação mudou antes que o MarkdownPoint pudesse colar os slides. Tente novamente.',
        pasteFailed: 'Não foi possível colar os slides.',
        copyFailed: 'Não foi possível copiar os slides.',
        copyUnavailable: 'Não foi possível ler a apresentação ou os arquivos do tema dela.',
        copyChanged: 'A apresentação mudou antes que o MarkdownPoint pudesse copiar os slides. Tente novamente.',
        copyNewer:
            'Esta apresentação usa um formato mais novo do MarkdownPoint. Atualize o plugin MarkdownPoint para copiar ou cortar os slides dela.',
        delete: 'Excluir slide',
        deleteFailed: 'Não foi possível excluir os slides.',
        recoveryUnavailable: 'Não foi possível ler as cópias de recuperação neste dispositivo.',
        saveFailed: 'Não foi possível salvar os dados da apresentação.',
        retry: 'Tentar novamente',
        empty: 'Nenhum slide'
    },
    commands: {
        newPresentation: 'Nova apresentação',
        openInMarkdownPoint: 'Abrir no MarkdownPoint',
        newSlide: 'Adicionar slide',
        focusOutline: 'Focar no sumário',
        focusEditor: 'Focar no editor',
        moveSlidesUp: 'Mover slide para cima',
        moveSlidesDown: 'Mover slide para baixo'
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
        view: 'Ver notas de lançamento',
        showOnUpdate: 'Mostrar notas de lançamento após atualizar'
    }
};
