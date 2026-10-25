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

export const vi: Translations = {
    name: 'MarkdownPoint',
    outline: 'Đề cương',
    sidebar: 'Thanh bên',
    sidebarDescription: 'Hiển thị đề cương ở thanh bên trái hoặc phải. Nếu dùng Notebook Navigator, hãy giữ đề cương ở bên phải.',
    left: 'Trái',
    right: 'Phải',
    emptySlide: 'Trang chiếu chưa có tiêu đề',
    fields: {
        text: 'Văn bản',
        numbered: ({ name, number }: { name: string; number: string }) => `${name} ${number}`,
        names: {
            title: 'Tiêu đề',
            body: 'Nội dung',
            eyebrow: 'Tiêu đề nhỏ',
            heading: 'Đầu đề',
            subtitle: 'Phụ đề',
            caption: 'Chú thích',
            quote: 'Trích dẫn',
            attribution: 'Nguồn',
            code: 'Mã',
            label: 'Nhãn',
            footer: 'Chân trang',
            number: 'Số'
        }
    },
    images: {
        show: 'Hiển thị hình ảnh',
        description: 'Hiển thị tối đa năm hình ảnh bên dưới hình thu nhỏ của mỗi trang chiếu trong trình soạn thảo.',
        preview: 'Hình ảnh trang chiếu'
    },
    notes: { label: 'Ghi chú người thuyết trình', placeholder: 'Ghi chú' },
    clipboard: { copyText: 'Sao chép', copyFailed: 'Không thể sao chép văn bản.' },
    presentations: {
        new: 'Bài thuyết trình mới',
        name: 'Tên',
        folder: 'Thư mục',
        theme: 'Chủ đề',
        included: 'Có sẵn',
        root: 'Thư mục gốc',
        untitled: 'Bài thuyết trình chưa đặt tên',
        create: 'Tạo',
        creating: 'Đang tạo…',
        cancel: 'Hủy',
        invalidName: 'Hãy nhập tên không có dấu gạch chéo hoặc ký tự dành riêng.',
        exists: 'Đã có tệp hoặc thư mục cùng tên.',
        failed: 'Không thể tạo bài thuyết trình. Hãy kiểm tra thư mục và thử lại.',
        openFailed: 'Đã tạo bài thuyết trình nhưng không thể mở. Hãy mở slides.md trong thư mục của bài thuyết trình.',
        openChanged: 'Bài thuyết trình đã thay đổi hoặc không đọc được. Hãy thử lại.',
        handoffFailed: 'Không thể lưu và mở bài thuyết trình.',
        themeChanged: 'Chủ đề đã thay đổi hoặc không khả dụng. Hãy mở lại hộp thoại này và chọn lại chủ đề.',
        newerFormat: ({ version }: { version: string }) =>
            `Bài thuyết trình này dùng định dạng MarkdownPoint mới hơn (${version}). Hãy cập nhật plugin MarkdownPoint để mở dưới dạng bài thuyết trình.`
    },
    slides: {
        new: 'Trang chiếu mới',
        shortcut: 'Phím tắt',
        noShortcut: 'Không',
        shortcutHint: 'Nhấn số của một bố cục để dùng bố cục đó. Nhấp chuột phải vào bố cục để gán phím tắt.',
        shortcutFailed: 'Không thể lưu phím tắt.',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name}, phím tắt ${digit}` : name),
        layoutsUnavailable: 'Bài thuyết trình này không có bố cục nào.',
        layoutChanged: 'Bố cục đã thay đổi. Hãy chọn lại.',
        newFailed: 'Bài thuyết trình đã thay đổi trước khi kịp thêm trang chiếu. Hãy thử lại.',
        actions: 'Thao tác trang chiếu',
        copy: () => 'Sao chép trang chiếu',
        cut: () => 'Cắt trang chiếu',
        cutChanged: 'Bài thuyết trình đã thay đổi trước khi kịp cắt trang chiếu. Trang chiếu chỉ được sao chép.',
        cutFailed: 'Không thể cắt trang chiếu. Trang chiếu chỉ được sao chép.',
        paste: 'Dán trang chiếu',
        pasteEmpty: 'Hãy sao chép một trang chiếu trong Obsidian trước.',
        pasteDestination:
            'Chủ đề của bài thuyết trình này không khớp với các trang chiếu. Hãy sao chép và dán chúng trong ứng dụng MarkdownPoint.',
        pasteVault: 'Các trang chiếu này đến từ một kho khác. Hãy sao chép và dán chúng trong ứng dụng MarkdownPoint.',
        pasteArtwork: 'Hai bài thuyết trình có đồ họa chủ đề khác nhau. Hãy sao chép và dán trang chiếu trong ứng dụng MarkdownPoint.',
        pasteChanged: 'Bài thuyết trình đã thay đổi trước khi kịp dán trang chiếu. Hãy thử lại.',
        pasteFailed: 'Không thể dán trang chiếu.',
        copyFailed: 'Không thể sao chép trang chiếu.',
        copyUnavailable: 'Không thể đọc bài thuyết trình hoặc các tệp chủ đề của nó.',
        copyChanged: 'Bài thuyết trình đã thay đổi trước khi kịp sao chép trang chiếu. Hãy thử lại.',
        copyNewer:
            'Bài thuyết trình này dùng định dạng MarkdownPoint mới hơn. Hãy cập nhật plugin MarkdownPoint để sao chép hoặc cắt các trang chiếu trong đó.',
        delete: () => 'Xóa trang chiếu',
        deleteFailed: 'Không thể xóa trang chiếu.',
        recoveryUnavailable: 'Không thể đọc các bản sao khôi phục trên thiết bị này.',
        saveFailed: 'Không thể lưu dữ liệu bài thuyết trình. Một bản sao khôi phục được giữ trên thiết bị này.',
        retry: 'Thử lại',
        empty: 'Không có trang chiếu'
    },
    commands: {
        newPresentation: 'Bài thuyết trình mới',
        openInMarkdownPoint: 'Mở trong MarkdownPoint',
        newSlide: 'Trang chiếu mới',
        focusOutline: 'Chuyển tới đề cương',
        focusEditor: 'Chuyển tới trình soạn thảo',
        moveSlidesUp: 'Di chuyển trang chiếu lên',
        moveSlidesDown: 'Di chuyển trang chiếu xuống'
    },
    whatsNew: {
        title: 'Có gì mới trong MarkdownPoint',
        version: ({ version }: { version: string }) => `Phiên bản ${version}`,
        new: 'Mới',
        improved: 'Cải tiến',
        changed: 'Thay đổi',
        fixed: 'Sửa lỗi',
        close: 'Đóng',
        section: 'Ghi chú phát hành',
        setting: ({ version }: { version: string }) => `Có gì mới trong MarkdownPoint ${version}`,
        settingDescription: 'Xem những thay đổi trong các bản phát hành gần đây.',
        view: 'Xem cập nhật gần đây',
        showOnUpdate: 'Hiển thị “Có gì mới” sau khi cập nhật',
        showOnUpdateDescription: 'Mở hộp thoại “Có gì mới” một lần sau mỗi lần cập nhật.'
    }
};
