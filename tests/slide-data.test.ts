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

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { SlideData } from '../src/presentation/slide-data.ts';
import type { SlideDataHost } from '../src/presentation/slide-data.ts';
import { CompanionDocument } from '../src/format/companion.ts';
import { EditorState } from '@codemirror/state';
import { history, historyField, isolateHistory, undo, redo } from '@codemirror/commands';
import { indexPresentation } from '../src/format/document.ts';
import { planSlideDeletion } from '../src/format/delete.ts';
import { processCompanion } from '../src/presentation/companion-file.ts';
import { planSlideInsertion } from '../src/format/insert.ts';
import { slideInsertionTransaction } from '../src/editor/insert.ts';
import { slideEditTransactions } from '../src/editor/structural-history.ts';

const path = 'deck/slides.md';
const document = '11111111-1111-4111-8111-111111111111';
const source = (records = '"a":{"layout":"title"},"b":{"layout":"body"}', id = document) =>
    `{"markdownpoint":1,"kind":"presentation","document":"${id}","slides":{${records}},"unrelated":true}`;
function device(initial?: unknown) {
    let stored: unknown = initial;
    const state = { disk: source(), calls: 0, backupFails: false, writeFails: false, errors: [] as unknown[] };
    const host: SlideDataHost = {
        loadRecovery: () => Promise.resolve(stored),
        saveRecovery: value => {
            if (state.backupFails) throw new Error('Local backup unavailable');
            stored = structuredClone(value);
            return Promise.resolve();
        },
        process: async (_path, update) => {
            state.calls++;
            const next = await update(state.disk);
            if (state.writeFails) return Promise.reject(new Error('Write failed'));
            state.disk = next;
            return Promise.resolve();
        },
        failed: (_path, _document, error) => {
            state.errors.push(error);
        }
    };
    return { state, host, stored: () => stored };
}

test('delete, undo, redo and reopening use complete local records with native marker membership', async () => {
    const { state, host } = device();
    const data = new SlideData(host);
    assert.ok(await data.remember(path, document, state.disk, ['a']));
    data.observe(path, document, state.disk, new Set(['b']));
    await data.settled(path, document);
    assert.deepEqual([...CompanionDocument.read(state.disk)!.records.keys()], ['b']);
    const reopened = new SlideData(host);
    await reopened.ready;
    reopened.observe(path, document, state.disk, new Set(['a', 'b']));
    await reopened.settled(path, document);
    assert.equal(CompanionDocument.read(state.disk)!.records.get('a'), '{"layout":"title"}');
    reopened.observe(path, document, state.disk, new Set(['b']));
    await reopened.settled(path, document);
    assert.deepEqual([...CompanionDocument.read(state.disk)!.records.keys()], ['b']);
    assert.deepEqual(state.errors, []);
});

test('native undo after history serialization restores both the words and their companion record', async () => {
    const { state: disk, host } = device();
    const markdown = '<!-- slide: a -->\n<!-- text: title -->\nFirst thought\n<!-- slide: b -->\n<!-- text: body -->\nAnother thought\n';
    let editor = EditorState.create({ doc: markdown, extensions: [history()] });
    const data = new SlideData(host);
    await data.remember(path, document, disk.disk, ['a']);
    const plan = planSlideDeletion(markdown, indexPresentation(markdown, 0)!, disk.disk, ['a'])!;
    editor = editor.update({ changes: plan.changes, annotations: isolateHistory.of('full'), userEvent: 'delete.markdownpoint' }).state;
    data.observe(path, document, disk.disk, new Set(['b']));
    await data.settled(path, document);
    editor = EditorState.fromJSON(editor.toJSON({ history: historyField }), { extensions: [history()] }, { history: historyField });
    assert.ok(
        undo({
            state: editor,
            dispatch: transaction => {
                editor = transaction.state;
            }
        })
    );
    assert.equal(editor.doc.toString(), markdown);
    data.observe(path, document, disk.disk, new Set(indexPresentation(editor.doc.toString(), 0)!.slides.map(slide => slide.id)));
    await data.settled(path, document);
    assert.equal(CompanionDocument.read(disk.disk)!.records.get('a'), '{"layout":"title"}');
});

test('ordinary text changes and slide reordering perform no companion writes', async () => {
    const { state, host } = device();
    const data = new SlideData(host);
    await data.remember(path, document, state.disk, ['a']);
    for (let index = 0; index < 100; index++) data.observe(path, document, state.disk, new Set(index % 2 ? ['a', 'b'] : ['b', 'a']));
    await data.settled(path, document);
    assert.equal(state.calls, 0);
});

test('new slide records survive failed saving, recovery reopening and serialized insertion undo/redo', async () => {
    const { state: disk, host } = device();
    const markdown = '<!-- slide: a -->\n<!-- text: title -->\nFirst\n<!-- slide: b -->\n<!-- text: title -->\nSecond\n';
    const record = '{"layout":"title","unknown":9007199254740993,"objects":[{"id":"photo","type":"image","src":"assets/picture.png"}]}';
    const slide = {
        id: 'new',
        markdown: '<!-- slide: new -->\n<!-- text: title -->\nNew thought\n<!-- notes -->\nKeep these notes.\n',
        record
    };
    let editor = EditorState.create({ doc: markdown, extensions: [history()] });
    const plan = planSlideInsertion(markdown, indexPresentation(markdown, 0)!, disk.disk, [slide], 'a', 0)!;
    let data = new SlideData(host);
    assert.ok(await data.remember(path, document, plan.companion, [slide.id]));
    editor = slideEditTransactions(editor, slideInsertionTransaction(editor, plan, slide.id, true)!).at(-1)!.state;
    const inserted = editor.doc.toString();
    const synchronize = async () => {
        data.observe(path, document, disk.disk, new Set(indexPresentation(editor.doc.toString(), 0)!.slides.map(part => part.id)));
        await data.settled(path, document);
    };
    disk.writeFails = true;
    await synchronize();
    assert.equal(CompanionDocument.read(disk.disk)!.records.has(slide.id), false);
    assert.equal(disk.errors.length, 1);
    data.stop();
    data = new SlideData(host);
    await data.ready;
    assert.equal(data.remembered(path, document).get(slide.id), record);
    disk.writeFails = false;
    await synchronize();
    assert.equal(CompanionDocument.read(disk.disk)!.records.get(slide.id), record);
    for (let cycle = 0; cycle < 3; cycle++) {
        editor = EditorState.fromJSON(editor.toJSON({ history: historyField }), { extensions: [history()] }, { history: historyField });
        assert.ok(
            undo({
                state: editor,
                dispatch: transaction => {
                    editor = transaction.state;
                }
            })
        );
        assert.equal(editor.doc.toString(), markdown);
        await synchronize();
        assert.equal(CompanionDocument.read(disk.disk)!.records.has(slide.id), false);
        assert.ok(
            redo({
                state: editor,
                dispatch: transaction => {
                    editor = transaction.state;
                }
            })
        );
        assert.equal(editor.doc.toString(), inserted);
        await synchronize();
        assert.equal(CompanionDocument.read(disk.disk)!.records.get(slide.id), record);
    }
});

test('undo while a deletion is saving follows with a restore even before a file event', async () => {
    const { state, host } = device();
    const initial = state.disk;
    let release!: () => void, began!: () => void;
    const gate = new Promise<void>(resolve => {
        release = resolve;
    });
    const started = new Promise<void>(resolve => {
        began = resolve;
    });
    host.process = async (_path, update) => {
        state.calls++;
        const next = await update(state.disk);
        if (state.calls === 1) {
            began();
            await gate;
        }
        state.disk = next;
    };
    const data = new SlideData(host);
    await data.remember(path, document, initial, ['a']);
    data.observe(path, document, initial, new Set(['b']));
    await started;
    data.observe(path, document, initial, new Set(['a', 'b']));
    release();
    await data.settled(path, document);
    assert.equal(CompanionDocument.read(state.disk)!.records.get('a'), '{"layout":"title"}');
    assert.equal(state.calls, 2);
});

test('atomic save captures newer external metadata, and a stale observation cannot replace its recovery copy', async () => {
    const { state, host } = device();
    const initial = state.disk;
    const data = new SlideData(host);
    await data.remember(path, document, initial, ['a']);
    state.disk = source('"a":{"external":"preserve"},"b":{"layout":"body"},"external":{"unknown":true}');
    let release!: () => void, began!: () => void;
    const gate = new Promise<void>(resolve => {
        release = resolve;
    });
    const started = new Promise<void>(resolve => {
        began = resolve;
    });
    host.process = async (_path, update) => {
        state.calls++;
        const next = await update(state.disk);
        if (state.calls === 1) {
            began();
            await gate;
        }
        state.disk = next;
    };
    data.observe(path, document, initial, new Set(['b']));
    await started;
    data.observe(path, document, initial.replace('"unrelated":true', '"unrelated":false'), new Set(['b']));
    release();
    await data.settled(path, document);
    data.observe(path, document, state.disk, new Set(['a', 'b']));
    await data.settled(path, document);
    const records = CompanionDocument.read(state.disk)!.records;
    assert.equal(records.get('a'), '{"external":"preserve"}');
    assert.equal(records.get('external'), '{"unknown":true}');
    assert.ok(state.disk.endsWith('"unrelated":true}'));
});

test('failed disk writes retain recovery data and retry without a background loop', async () => {
    const { state, host } = device();
    const initial = state.disk;
    const data = new SlideData(host);
    await data.remember(path, document, initial, ['a']);
    state.writeFails = true;
    data.observe(path, document, initial, new Set(['b']));
    assert.equal(await data.settled(path, document), false);
    assert.equal(state.disk, initial);
    assert.equal(state.calls, 1);
    assert.equal(state.errors.length, 1);
    const restored = new SlideData(host);
    await restored.ready;
    assert.equal(restored.remembered(path, document).get('a'), '{"layout":"title"}');
    state.writeFails = false;
    data.retry(path, document);
    assert.equal(await data.settled(path, document), true);
    assert.equal(state.calls, 2);
    assert.equal(CompanionDocument.read(state.disk)!.records.has('a'), false);
});

test('undo after a failed save clears a now-satisfied change without another write', async () => {
    const { state, host } = device();
    let saved = 0;
    host.saved = () => {
        saved++;
    };
    const data = new SlideData(host);
    await data.remember(path, document, state.disk, ['a']);
    state.writeFails = true;
    data.observe(path, document, state.disk, new Set(['b']));
    await data.settled(path, document);
    assert.equal(state.errors.length, 1);
    assert.equal(saved, 0);
    data.observe(path, document, state.disk, new Set(['a', 'b']));
    await data.settled(path, document);
    assert.equal(saved, 1);
    assert.equal(state.calls, 1);
});

test('a failed recovery backup prevents deletion and retry durably preserves the newest record', async () => {
    const { state, host } = device();
    const data = new SlideData(host);
    await data.remember(path, document, state.disk, ['a']);
    state.disk = source('"a":{"external":true},"b":{}');
    const updated = state.disk;
    state.backupFails = true;
    data.observe(path, document, updated, new Set(['b']));
    await data.settled(path, document);
    assert.equal(state.disk, updated);
    assert.equal(state.errors.length, 1);
    state.backupFails = false;
    data.retry(path, document);
    await data.settled(path, document);
    const reopened = new SlideData(host);
    await reopened.ready;
    assert.equal(reopened.remembered(path, document).get('a'), '{"external":true}');
    reopened.observe(path, document, state.disk, new Set(['a', 'b']));
    await reopened.settled(path, document);
    assert.equal(CompanionDocument.read(state.disk)!.records.get('a'), '{"external":true}');
});

test('a replaced presentation identity and unloading prevent stale writes', async () => {
    const { state, host } = device();
    const initial = state.disk;
    const data = new SlideData(host);
    await data.remember(path, document, initial, ['a']);
    state.disk = source(undefined, '22222222-2222-4222-8222-222222222222');
    const replacement = state.disk;
    data.observe(path, document, initial, new Set(['b']));
    await data.settled(path, document);
    assert.equal(state.disk, replacement);
    assert.equal(state.errors.length, 1);
    const stopped = new SlideData(host);
    await stopped.ready;
    stopped.observe(path, document, initial, new Set(['b']));
    stopped.stop();
    await stopped.settled(path, document);
    assert.equal(state.calls, 1);
});

test('unloading during a pending backup cannot commit an earlier deletion after undo', async () => {
    const { state, host } = device();
    const initial = state.disk;
    const data = new SlideData(host);
    await data.remember(path, document, initial, ['a']);
    let release!: () => void,
        began!: () => void,
        writes = 0;
    const gate = new Promise<void>(resolve => {
        release = resolve;
    });
    const started = new Promise<void>(resolve => {
        began = resolve;
    });
    const save = host.saveRecovery.bind(host);
    host.saveRecovery = async value => {
        await save(value);
        began();
        await gate;
    };
    const file = { path: 'deck/presentation.mdpoint' };
    const pair = { markdown: { path }, companion: file };
    const vault = {
        getPair: () => pair,
        read: () => Promise.resolve(state.disk),
        process: (_file: typeof file, update: (source: string) => string) => {
            writes++;
            state.disk = update(state.disk);
            return Promise.resolve(state.disk);
        }
    };
    host.process = (path, update, canCommit) => processCompanion(vault, path, update, canCommit);
    data.observe(path, document, initial, new Set(['b']));
    await started;
    data.observe(path, document, initial, new Set(['a', 'b']));
    data.stop();
    release();
    await data.settled(path, document);
    assert.equal(state.disk, initial);
    assert.equal(writes, 0);
});

test('unloading while Vault.process is queued cancels at the actual commit callback', async () => {
    const { state, host } = device();
    const initial = state.disk;
    const data = new SlideData(host);
    await data.remember(path, document, initial, ['a']);
    let release!: () => void,
        began!: () => void,
        writes = 0;
    const gate = new Promise<void>(resolve => {
        release = resolve;
    });
    const started = new Promise<void>(resolve => {
        began = resolve;
    });
    const file = { path: 'deck/presentation.mdpoint' };
    const pair = { markdown: { path }, companion: file };
    const vault = {
        getPair: () => pair,
        read: () => Promise.resolve(state.disk),
        process: async (_file: typeof file, update: (source: string) => string) => {
            began();
            await gate;
            const next = update(state.disk);
            writes++;
            state.disk = next;
            return next;
        }
    };
    host.process = (path, update, canCommit) => processCompanion(vault, path, update, canCommit);
    data.observe(path, document, initial, new Set(['b']));
    await started;
    data.observe(path, document, initial, new Set(['a', 'b']));
    data.stop();
    release();
    await data.settled(path, document);
    assert.equal(state.disk, initial);
    assert.equal(writes, 0);
    assert.deepEqual(state.errors, []);
});

test('folder renames carry recovery data while copies with the same document identity stay separate', async () => {
    const { state, host } = device();
    const data = new SlideData(host);
    await data.remember(path, document, state.disk, ['a']);
    await data.remember('copy/slides.md', document, source('"a":{"different":true}'), ['a']);
    await data.rename('deck', 'renamed');
    assert.equal(data.remembered(path, document).size, 0);
    const reopened = new SlideData(host);
    await reopened.ready;
    assert.equal(reopened.remembered('renamed/slides.md', document).get('a'), '{"layout":"title"}');
    assert.equal(reopened.remembered('copy/slides.md', document).get('a'), '{"different":true}');
    state.disk = source('"b":{}');
    let writtenPath = '';
    host.process = async (file, update) => {
        writtenPath = file;
        state.disk = await update(state.disk);
    };
    reopened.observe('renamed/slides.md', document, state.disk, new Set(['a', 'b']));
    await reopened.settled('renamed/slides.md', document);
    assert.equal(writtenPath, 'renamed/presentation.mdpoint');
});

test('recovery survives a temporary file rename and plugin reload before the name is restored', async () => {
    const { state, host } = device();
    const data = new SlideData(host);
    await data.remember(path, document, state.disk, ['a']);
    await data.rename(path, 'deck/draft.md');
    const reopened = new SlideData(host);
    await reopened.ready;
    await reopened.rename('deck/draft.md', path);
    assert.equal(reopened.remembered(path, document).get('a'), '{"layout":"title"}');
});

test('retry after a folder rename saves and reports completion at the new path', async () => {
    const { state, host } = device();
    const writes: string[] = [],
        saved: string[] = [];
    const process = host.process.bind(host);
    host.process = (path, update, canCommit) => {
        writes.push(path);
        return process(path, update, canCommit);
    };
    host.saved = (path, id) => {
        assert.equal(id, document);
        saved.push(path);
    };
    const data = new SlideData(host);
    await data.remember(path, document, state.disk, ['a']);
    state.writeFails = true;
    data.observe(path, document, state.disk, new Set(['b']));
    await data.settled(path, document);
    await data.rename('deck', 'renamed');
    state.writeFails = false;
    data.retry('renamed/slides.md', document);
    await data.settled('renamed/slides.md', document);
    assert.deepEqual(writes, ['deck/presentation.mdpoint', 'renamed/presentation.mdpoint']);
    assert.deepEqual([...CompanionDocument.read(state.disk)!.records.keys()], ['b']);
    assert.deepEqual(saved, ['renamed/slides.md']);
});

test('retry refuses a temporary non-presentation name and remains available after renaming back', async () => {
    const { state, host } = device();
    const data = new SlideData(host);
    await data.remember(path, document, state.disk, ['a']);
    state.writeFails = true;
    data.observe(path, document, state.disk, new Set(['b']));
    await data.settled(path, document);
    await data.rename(path, 'deck/draft.md');
    state.writeFails = false;
    assert.equal(data.retry('deck/draft.md', document), false);
    await data.settled('deck/draft.md', document);
    assert.equal(state.calls, 1);
    await data.rename('deck/draft.md', path);
    assert.equal(data.retry(path, document), true);
    await data.settled(path, document);
    assert.deepEqual([...CompanionDocument.read(state.disk)!.records.keys()], ['b']);
    assert.equal(state.calls, 2);
});

test('malformed stored data cannot introduce arbitrary records', async () => {
    for (const value of [
        null,
        {},
        3,
        [{ path, document: 'invalid', records: { a: '{}' } }],
        [{ path, document, records: { '../bad': '{}', a: '{} , "injected": {}', b: 'null', c: '{' } }]
    ]) {
        const { host } = device(value);
        const data = new SlideData(host);
        await data.ready;
        assert.equal(data.remembered(path, document).size, 0);
    }
});

test('copied slides and definitions share recovery, one disk write and native undo after reopening', async () => {
    const { state: disk, host } = device();
    const before = '<!-- slide: a -->\n<!-- slide: b -->\n';
    const inserted =
        '<!-- slide: copy -->\n<!-- text: card.caption -->\nCopied words\n<!-- composition: card -->\n<!-- control: caption -->\nDefault words\n';
    const slide = '{"objects":[{"id":"card","type":"composition","source":"card"}],"future":9007199254740993}';
    const definition = '{"controls":{"caption":{"type":"text"}},"future":9007199254740995}';
    let prepared = CompanionDocument.read(disk.disk)!.change(new Map([['copy', slide]]))!;
    prepared = CompanionDocument.ensure(prepared, 'compositions')!.change(new Map([['card', definition]]))!;
    let data = new SlideData(host);
    assert.ok(await data.remember(path, document, prepared, ['copy'], ['card']));
    let editor = EditorState.create({ doc: before, extensions: [history()] });
    const definitionFrom = inserted.indexOf('<!-- composition:');
    const plan = planSlideInsertion(
        before,
        indexPresentation(before, 0)!,
        disk.disk,
        [{ id: 'copy', markdown: inserted.slice(0, definitionFrom), record: slide }],
        'a',
        0,
        [{ id: 'card', markdown: inserted.slice(definitionFrom), record: definition }]
    )!;
    editor = slideEditTransactions(editor, slideInsertionTransaction(editor, plan, 'copy', true)!).at(-1)!.state;
    const synchronize = async () => {
        const indexed = indexPresentation(editor.doc.toString(), 0)!;
        data.observe(
            path,
            document,
            disk.disk,
            new Set(indexed.slides.map(part => part.id)),
            new Set(indexed.compositions.map(part => part.id))
        );
        await data.settled(path, document);
    };
    await synchronize();
    assert.equal(disk.calls, 1);
    assert.equal(CompanionDocument.read(disk.disk)!.records.get('copy'), slide);
    assert.equal(CompanionDocument.read(disk.disk, 'compositions')!.records.get('card'), definition);
    data.stop();
    data = new SlideData(host);
    await data.ready;
    editor = EditorState.fromJSON(editor.toJSON({ history: historyField }), { extensions: [history()] }, { history: historyField });
    assert.equal(data.remembered(path, document, 'compositions').get('card'), definition);
    assert.ok(
        undo({
            state: editor,
            dispatch: transaction => {
                editor = transaction.state;
            }
        })
    );
    await synchronize();
    assert.equal(disk.calls, 2);
    assert.equal(editor.doc.toString(), before);
    assert.equal(CompanionDocument.read(disk.disk)!.records.has('copy'), false);
    assert.equal(CompanionDocument.read(disk.disk, 'compositions')!.records.has('card'), false);
    assert.ok(
        redo({
            state: editor,
            dispatch: transaction => {
                editor = transaction.state;
            }
        })
    );
    await synchronize();
    assert.equal(disk.calls, 3);
    assert.equal(CompanionDocument.read(disk.disk)!.records.get('copy'), slide);
    assert.equal(CompanionDocument.read(disk.disk, 'compositions')!.records.get('card'), definition);
    assert.deepEqual(disk.errors, []);
});

test('definition write failure preserves both recoveries and a retry restores the complete pair', async () => {
    const { state: disk, host } = device();
    const prepared = source('"copy":{"objects":[{"type":"composition","source":"card"}]}').replace(
        '"unrelated":true',
        '"unrelated":true,"compositions":{"card":{"name":"Kept"}}'
    );
    let data = new SlideData(host);
    assert.ok(await data.remember(path, document, prepared, ['copy'], ['card']));
    disk.writeFails = true;
    data.observe(path, document, disk.disk, new Set(['a', 'b', 'copy']), new Set(['card']));
    await data.settled(path, document);
    assert.equal(disk.disk, source());
    data.stop();
    data = new SlideData(host);
    await data.ready;
    assert.equal(data.remembered(path, document, 'compositions').get('card'), '{"name":"Kept"}');
    disk.writeFails = false;
    data.observe(path, document, disk.disk, new Set(['a', 'b', 'copy']), new Set(['card']));
    await data.settled(path, document);
    assert.equal(CompanionDocument.read(disk.disk)!.records.has('copy'), true);
    assert.equal(CompanionDocument.read(disk.disk, 'compositions')!.records.get('card'), '{"name":"Kept"}');
});

test('definition membership is independent of slide IDs and newer external metadata survives removal', async () => {
    const { state: disk, host } = device();
    disk.disk = source().replace(
        '"unrelated":true',
        '"unrelated":true,"compositions":{"card":{"name":"Original"},"other":{"name":"Untouched"}}'
    );
    const data = new SlideData(host);
    assert.ok(await data.remember(path, document, disk.disk, [], ['card']));
    for (let index = 0; index < 100; index++) data.observe(path, document, disk.disk, new Set(['a', 'b']), new Set(['card', 'other']));
    await data.settled(path, document);
    assert.equal(disk.calls, 0);
    disk.disk = disk.disk.replace('"name":"Original"', '"name":"Newer"');
    data.observe(path, document, disk.disk, new Set(['a', 'b', 'card']), new Set(['other']));
    await data.settled(path, document);
    assert.equal(CompanionDocument.read(disk.disk, 'compositions')!.records.has('card'), false);
    assert.equal(CompanionDocument.read(disk.disk, 'compositions')!.records.get('other'), '{"name":"Untouched"}');
    data.observe(path, document, disk.disk, new Set(['a', 'b']), new Set(['card', 'other']));
    await data.settled(path, document);
    assert.equal(CompanionDocument.read(disk.disk, 'compositions')!.records.get('card'), '{"name":"Newer"}');
});
