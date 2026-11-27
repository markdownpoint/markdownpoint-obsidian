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

export const th: Translations = {
    name: 'MarkdownPoint',
    outline: 'โครงเรื่อง',
    sidebar: 'แถบด้านข้าง',
    sidebarDescription: 'แถบด้านข้างที่แสดงโครงเรื่อง หากใช้ Notebook Navigator ให้วางโครงเรื่องไว้ทางขวา',
    left: 'ซ้าย',
    right: 'ขวา',
    emptySlide: 'สไลด์ไม่มีชื่อเรื่อง',
    fields: {
        text: 'ข้อความ',
        numbered: ({ name, number }: { name: string; number: string }) => `${name} ${number}`,
        names: {
            title: 'ชื่อเรื่อง',
            body: 'เนื้อหา',
            eyebrow: 'ข้อความนำ',
            heading: 'หัวเรื่อง',
            subtitle: 'ชื่อเรื่องรอง',
            caption: 'คำบรรยาย',
            quote: 'คำอ้างอิง',
            attribution: 'ที่มา',
            code: 'โค้ด',
            label: 'ป้ายกำกับ',
            footer: 'ท้ายกระดาษ',
            number: 'ตัวเลข'
        }
    },
    images: { show: 'แสดงรูปภาพ', description: 'แสดงรูปภาพสูงสุด 5 รูปใต้ภาพขนาดย่อของแต่ละสไลด์ในเอดิเตอร์', preview: 'รูปภาพสไลด์' },
    notes: { label: 'โน้ตผู้นำเสนอ', placeholder: 'โน้ต' },
    clipboard: { copyText: 'คัดลอก', copyFailed: 'ไม่สามารถคัดลอกข้อความได้' },
    presentations: {
        new: 'งานนำเสนอใหม่',
        name: 'ชื่อ',
        folder: 'โฟลเดอร์',
        theme: 'ธีม',
        included: 'ในตัว',
        root: 'โฟลเดอร์ห้องนิรภัย',
        untitled: 'งานนำเสนอไม่มีชื่อ',
        create: 'สร้าง',
        creating: 'กำลังสร้าง…',
        cancel: 'ยกเลิก',
        invalidName: 'กรอกชื่อที่ไม่มีเครื่องหมายทับหรืออักขระที่สงวนไว้',
        exists: 'มีไฟล์หรือโฟลเดอร์ชื่อนี้อยู่แล้ว กรอกชื่ออื่น',
        insidePresentation: ({ presentation }: { presentation: string }) =>
            `MarkdownPoint ไม่สามารถสร้างงานนำเสนอภายใน “${presentation}” ได้ เลือกโฟลเดอร์ที่อยู่นอก “${presentation}”`,
        nested: ({ presentation, outer }: { presentation: string; outer: string }) =>
            `MarkdownPoint ไม่สามารถเปิด “${presentation}” ได้ขณะที่อยู่ภายใน “${outer}” ย้ายโฟลเดอร์ “${presentation}” ออกจาก “${outer}” แล้วจึงเปิด`,
        failed: 'ไม่สามารถสร้างงานนำเสนอได้ ลองอีกครั้ง',
        openFailed: 'MarkdownPoint สร้างงานนำเสนอแล้วแต่เปิดไม่ได้ เปิด slides.md ในโฟลเดอร์ของงานนำเสนอ',
        openChanged: 'งานนำเสนอมีการเปลี่ยนแปลงก่อนที่ MarkdownPoint จะเปิดได้ ลองอีกครั้ง',
        handoffFailed: 'ไม่สามารถบันทึกและเปิดงานนำเสนอได้',
        themeChanged: 'ไม่สามารถสร้างงานนำเสนอจากธีมที่เลือกได้ เปิดหน้าต่างนี้ใหม่แล้วเลือกธีมอีกครั้ง',
        newerFormat: ({ version }: { version: string }) =>
            `งานนำเสนอนี้ใช้รูปแบบไฟล์ MarkdownPoint ที่ใหม่กว่า คือรุ่น ${version} อัปเดตปลั๊กอิน MarkdownPoint เพื่อเปิดเป็นงานนำเสนอ`,
        unreadableFile: ({ file, presentation }: { file: string; presentation: string }) =>
            `MarkdownPoint ไม่สามารถอ่าน “${file}” ใน “${presentation}” ได้ เปิดงานนำเสนอในแอป MarkdownPoint เพื่อดูว่าต้องแก้ไขอะไร`,
        unreadable: ({ presentation }: { presentation: string }) =>
            `MarkdownPoint ไม่สามารถอ่านงานนำเสนอใน “${presentation}” ได้ เปิดงานนำเสนอในแอป MarkdownPoint เพื่อดูว่าต้องแก้ไขอะไร`
    },
    slides: {
        new: 'เพิ่มสไลด์',
        shortcut: 'ปุ่มลัด',
        noShortcut: 'ไม่มี',
        shortcutHint: 'กดปุ่มลัดของเค้าโครงเพื่อเลือกเค้าโครงนั้น คลิกขวาที่เค้าโครงเพื่อกำหนดปุ่มลัด',
        shortcutFailed: 'ไม่สามารถบันทึกปุ่มลัดได้',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name} ปุ่มลัด ${digit}` : name),
        layoutsUnavailable: 'งานนำเสนอนี้ไม่มีเค้าโครงที่ใช้ได้',
        layoutChanged: 'เค้าโครงมีการเปลี่ยนแปลงก่อนที่ MarkdownPoint จะเพิ่มสไลด์ได้ ลองอีกครั้ง',
        newFailed: 'งานนำเสนอมีการเปลี่ยนแปลงก่อนที่ MarkdownPoint จะเพิ่มสไลด์ได้ ลองอีกครั้ง',
        actions: 'ตัวเลือกสไลด์',
        copy: 'คัดลอกสไลด์',
        cut: 'ตัดสไลด์',
        cutChanged: 'งานนำเสนอมีการเปลี่ยนแปลงก่อนที่ MarkdownPoint จะตัดสไลด์ได้ สไลด์อยู่ในคลิปบอร์ดและยังอยู่ในงานนำเสนอ',
        cutFailed: 'ไม่สามารถตัดสไลด์ได้ สไลด์อยู่ในคลิปบอร์ดและยังอยู่ในงานนำเสนอ',
        paste: 'แปะสไลด์',
        pasteEmpty: 'คัดลอกสไลด์ใน Obsidian ก่อน',
        pasteDestination: 'ธีมของงานนำเสนอนี้ไม่ตรงกับสไลด์เหล่านี้ คัดลอกและแปะสไลด์ในแอป MarkdownPoint',
        pasteVault: 'สไลด์เหล่านี้มาจากห้องนิรภัยอื่น คัดลอกและแปะสไลด์ในแอป MarkdownPoint',
        pasteArtwork: 'ธีมของงานนำเสนอทั้งสองมีกราฟิกต่างกัน คัดลอกและแปะสไลด์ในแอป MarkdownPoint',
        pasteChanged: 'งานนำเสนอมีการเปลี่ยนแปลงก่อนที่ MarkdownPoint จะแปะสไลด์ได้ ลองอีกครั้ง',
        pasteFailed: 'ไม่สามารถแปะสไลด์ได้',
        copyFailed: 'ไม่สามารถคัดลอกสไลด์ได้',
        copyUnavailable: 'ไม่สามารถอ่านงานนำเสนอหรือไฟล์ธีมได้',
        copyChanged: 'งานนำเสนอมีการเปลี่ยนแปลงก่อนที่ MarkdownPoint จะคัดลอกสไลด์ได้ ลองอีกครั้ง',
        copyNewer: 'งานนำเสนอนี้ใช้รูปแบบไฟล์ MarkdownPoint ที่ใหม่กว่า อัปเดตปลั๊กอิน MarkdownPoint เพื่อคัดลอกหรือตัดสไลด์',
        delete: 'ลบสไลด์',
        deleteFailed: 'ไม่สามารถลบสไลด์ได้',
        recoveryUnavailable: 'ไม่สามารถอ่านสำเนากู้คืนบนอุปกรณ์นี้ได้',
        saveFailed: 'ไม่สามารถบันทึกข้อมูลงานนำเสนอได้',
        retry: 'ลองใหม่',
        empty: 'ไม่มีสไลด์'
    },
    commands: {
        newPresentation: 'งานนำเสนอใหม่',
        openInMarkdownPoint: 'เปิดใน MarkdownPoint',
        newSlide: 'เพิ่มสไลด์',
        focusOutline: 'โฟกัสที่โครงเรื่อง',
        focusEditor: 'โฟกัสที่เอดิเตอร์',
        moveSlidesUp: 'ย้ายสไลด์ขึ้น',
        moveSlidesDown: 'ย้ายสไลด์ลง'
    },
    whatsNew: {
        title: 'มีอะไรใหม่ใน MarkdownPoint',
        version: ({ version }: { version: string }) => `รุ่น ${version}`,
        new: 'ใหม่',
        improved: 'ปรับปรุง',
        changed: 'เปลี่ยนแปลง',
        fixed: 'แก้ไข',
        close: 'ปิด',
        section: 'บันทึกประจำรุ่น',
        setting: ({ version }: { version: string }) => `มีอะไรใหม่ใน MarkdownPoint ${version}`,
        settingDescription: 'ดูสิ่งที่เปลี่ยนไปในรุ่นล่าสุด',
        view: 'ดูบันทึกประจำรุ่น',
        showOnUpdate: 'แสดงบันทึกประจำรุ่นหลังอัปเดต'
    }
};
