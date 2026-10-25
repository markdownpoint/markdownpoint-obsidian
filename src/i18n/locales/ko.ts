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

export const ko: Translations = {
  name: "MarkdownPoint",
  outline: "개요",
  sidebar: "사이드바",
  left: "왼쪽",
  right: "오른쪽",
  emptySlide: "제목 없는 슬라이드",
  fields: {
    text: "텍스트",
    numbered: ({ name, number }: { name: string; number: string }) => `${name} ${number}`,
    names: {
      title: "제목", body: "본문", eyebrow: "어깨제목", heading: "머리말", subtitle: "부제",
      caption: "설명", quote: "인용", attribution: "말한 사람", code: "코드", label: "레이블",
      footer: "꼬리말", number: "번호",
    },
  },
  images: { show: "슬라이드 이미지 표시", description: "편집기에서 각 슬라이드의 썸네일 아래에 이미지를 최대 5개까지 표시합니다.", preview: "슬라이드 이미지" },
  notes: { label: "발표자 메모", placeholder: "메모" },
  clipboard: { copyText: "복사", copyFailed: "텍스트를 복사하지 못했습니다." },
  presentations: {
    new: "새 프레젠테이션", name: "이름", folder: "폴더", theme: "테마", included: "기본 제공", root: "보관함 최상위 폴더",
    untitled: "제목 없는 프레젠테이션", create: "생성", creating: "생성 중…", cancel: "취소",
    invalidName: "슬래시나 예약 문자가 없는 이름을 입력하세요.",
    exists: "같은 이름의 파일이나 폴더가 이미 존재합니다.",
    failed: "프레젠테이션을 생성하지 못했습니다. 폴더를 확인하고 다시 시도하세요.",
    openFailed: "프레젠테이션을 생성했지만 열지 못했습니다. 해당 폴더에서 slides.md를 여세요.",
    openChanged: "프레젠테이션이 변경되었거나 읽을 수 없습니다. 다시 시도하세요.",
    handoffFailed: "프레젠테이션을 저장하고 열지 못했습니다.",
    themeChanged: "테마가 변경되었거나 사용할 수 없습니다. 이 대화 상자를 다시 열고 테마를 다시 선택하세요.",
  },
  slides: {
    new: "새 슬라이드",
    shortcut: "단축키",
    noShortcut: "없음",
    shortcutHint: "레이아웃의 번호를 눌러 사용하세요. 단축키를 지정하려면 레이아웃을 오른쪽 클릭하세요.",
    shortcutFailed: "단축키를 저장하지 못했습니다.",
    layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => digit ? `${name}, 단축키 ${digit}` : name,
    layoutsUnavailable: "이 프레젠테이션에서 사용할 수 있는 레이아웃이 없습니다.",
    layoutChanged: "레이아웃이 변경되었습니다. 다시 선택하세요.",
    newFailed: "슬라이드를 추가하기 전에 프레젠테이션이 변경되었습니다. 다시 시도하세요.",
    actions: "슬라이드 동작",
    copy: () => "슬라이드 복사",
    cut: () => "슬라이드 잘라내기",
    cutChanged: "슬라이드를 잘라내기 전에 프레젠테이션이 변경되었습니다. 슬라이드는 복사만 되었습니다.",
    cutFailed: "슬라이드를 잘라내지 못했습니다. 슬라이드는 복사만 되었습니다.",
    paste: "슬라이드 붙여넣기",
    pasteEmpty: "먼저 Obsidian에서 슬라이드를 복사하세요.",
    pasteDestination: "이 슬라이드는 이 프레젠테이션의 테마와 맞지 않습니다. MarkdownPoint 앱에서 복사하여 붙여넣으세요.",
    pasteVault: "다른 보관함의 슬라이드입니다. MarkdownPoint 앱에서 복사하여 붙여넣으세요.",
    pasteArtwork: "두 프레젠테이션의 테마 아트워크가 다릅니다. MarkdownPoint 앱에서 슬라이드를 복사하여 붙여넣으세요.",
    pasteChanged: "슬라이드를 붙여넣기 전에 프레젠테이션이 변경되었습니다. 다시 시도하세요.",
    pasteFailed: "슬라이드를 붙여넣지 못했습니다.",
    copyFailed: "슬라이드를 복사하지 못했습니다.",
    copyUnavailable: "프레젠테이션이나 테마 파일을 읽지 못했습니다.",
    copyChanged: "슬라이드를 복사하기 전에 프레젠테이션이 변경되었습니다. 다시 시도하세요.",
    delete: () => "슬라이드 삭제",
    deleteFailed: "슬라이드를 삭제하지 못했습니다.",
    recoveryUnavailable: "이 기기의 복구용 복사본을 읽지 못했습니다.",
    saveFailed: "프레젠테이션 데이터를 저장하지 못했습니다. 복구용 복사본이 이 기기에 보관되어 있습니다.",
    retry: "재시도",
    empty: "슬라이드 없음",
  },
  commands: {
    newPresentation: "새 프레젠테이션",
    openInMarkdownPoint: "MarkdownPoint에서 열기",
    newSlide: "새 슬라이드",
    focusOutline: "개요에 포커스",
    focusEditor: "편집기에 포커스",
    moveSlidesUp: "슬라이드 위로 이동",
    moveSlidesDown: "슬라이드 아래로 이동",
  },
};
