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

/**
 * One selection model for every list whose items an author selects several of, as Notebook Navigator's lists select
 * notes: a selected set and a cursor, which is one of the selected items, or none while none is. Each list keeps its
 * own order of ids and what its cursor shows; the rules are these alone.
 */
export interface ListSelection<Id> {
    readonly selected: ReadonlySet<Id>;
    readonly cursor: Id | null;
}

export type ListSelectionAction<Id> =
    /** A click: the item alone. */
    | { readonly kind: 'select'; readonly id: Id }
    /** ⌘/Ctrl-click: the item in or out, the cursor going to an item put in. The last selected item stays. */
    | { readonly kind: 'toggle'; readonly id: Id }
    /**
     * Shift-click: the items from the cursor to this one added, the cursor going to it. Shift+Home and End are a range to
     * the list's first or last item.
     */
    | { readonly kind: 'range'; readonly id: Id }
    /**
     * Shift+↑ or ↓: on to `to`, as Apple Notes extends a selection: the next item in a list, the tile above or below in a
     * grid.
     */
    | { readonly kind: 'step'; readonly to: Id }
    /** Select All: every item, the cursor staying where it is. */
    | { readonly kind: 'all' };

export function selectionOf<Id>(ids: Iterable<Id>, cursor: Id | null): ListSelection<Id> {
    return { selected: new Set(ids), cursor };
}

/** The selection `action` leaves in a list whose items stand in `order`. */
export function selectionAfter<Id>(order: readonly Id[], state: ListSelection<Id>, action: ListSelectionAction<Id>): ListSelection<Id> {
    const at = state.cursor === null ? -1 : order.indexOf(state.cursor);
    switch (action.kind) {
        case 'select':
            return selectionOf([action.id], action.id);
        case 'toggle': {
            if (!state.selected.has(action.id)) return selectionOf([...state.selected, action.id], action.id);
            if (state.selected.size === 1) return state;
            const selected = new Set(state.selected);
            selected.delete(action.id);
            // An item taken out leaves the cursor where it stood, unless the cursor stood on it: then on the first item
            // still selected.
            return { selected, cursor: state.cursor === action.id ? (order.find(id => selected.has(id)) ?? null) : state.cursor };
        }
        case 'range': {
            const to = order.indexOf(action.id);
            if (at < 0 || to < 0) return selectionOf([action.id], action.id);
            return { selected: added(state.selected, order, at, to), cursor: action.id };
        }
        case 'all':
            return order.length === 0
                ? state
                : selectionOf(order, state.cursor !== null && order.includes(state.cursor) ? state.cursor : order[0]!);
        case 'step': {
            const to = order.indexOf(action.to);
            if (at < 0 || to < 0 || to === at) return state;
            const way = Math.sign(to - at);
            const selected = new Set(state.selected);
            // From a selected item onto another selected item: the items left behind go, and the cursor goes no further.
            if (state.selected.has(order[at]!) && state.selected.has(order[to]!)) {
                for (let index = at; index !== to; index += way) selected.delete(order[index]!);
                return { selected, cursor: order[to]! };
            }
            // Onto an item not selected: it joins with those on the way, and the cursor jumps the run of selected items beyond.
            for (let index = at + way; index !== to + way; index += way) selected.add(order[index]!);
            let landed = to;
            while (landed + way >= 0 && landed + way < order.length && state.selected.has(order[landed + way]!)) landed += way;
            return { selected, cursor: order[landed]! };
        }
    }
}

function added<Id>(selected: ReadonlySet<Id>, order: readonly Id[], from: number, to: number): Set<Id> {
    const result = new Set(selected);
    for (let index = Math.min(from, to); index <= Math.max(from, to); index++) result.add(order[index]!);
    return result;
}

/**
 * The item to select once `removed` left a list that stood in `orderBefore`: the first item kept after the first one
 * removed, else the nearest kept before it, else none.
 */
export function selectionAfterRemoval<Id>(orderBefore: readonly Id[], removed: ReadonlySet<Id>): ListSelection<Id> {
    const first = orderBefore.findIndex(id => removed.has(id));
    if (first < 0) return selectionOf([], null);
    const after = orderBefore.slice(first).find(id => !removed.has(id));
    const next =
        after ??
        orderBefore
            .slice(0, first)
            .reverse()
            .find(id => !removed.has(id));
    return next === undefined ? selectionOf([], null) : selectionOf([next], next);
}

/**
 * The selection kept where some of its items left the list, by an Undo or a collaborator: the items still there, and the
 * cursor where it stood, or on the first of them.
 */
export function reconcileSelection<Id>(order: readonly Id[], state: ListSelection<Id>): ListSelection<Id> {
    const present = new Set(order);
    const selected = new Set([...state.selected].filter(id => present.has(id)));
    if (selected.size === state.selected.size && (state.cursor === null || present.has(state.cursor))) return state;
    return {
        selected,
        cursor: state.cursor !== null && selected.has(state.cursor) ? state.cursor : (order.find(id => selected.has(id)) ?? null)
    };
}

/**
 * A list's order once the items `moved` gather at the line before or after `target`, in the order they stood, though the
 * line falls among them: before or after one of them is where the items not moved around it leave a place. Null where the
 * order stays as it was, or the line names no item of the list.
 */
export function gatheredOrder<Id>(order: readonly Id[], moved: Iterable<Id>, target: Id, edge: 'before' | 'after'): Id[] | null {
    const gathering = new Set(moved);
    if (!order.includes(target) || ![...gathering].every(id => order.includes(id))) return null;
    const rest = order.filter(id => !gathering.has(id));
    const at =
        order.slice(0, order.indexOf(target)).filter(id => !gathering.has(id)).length +
        (edge === 'after' && !gathering.has(target) ? 1 : 0);
    const next = [...rest.slice(0, at), ...order.filter(id => gathering.has(id)), ...rest.slice(at)];
    return next.some((id, index) => id !== order[index]) ? next : null;
}

/**
 * The order once each item `moved` steps past the item beside it that isn't moved, as a Move Up or Down command moves
 * them: the items keep the gaps between them, and those at the list's end stay while the others close up to them. Only
 * the items `among`, those the list shows, trade places; every other item of `order` keeps its own. Null where nothing
 * moves.
 */
export function steppedOrder<Id>(order: readonly Id[], among: readonly Id[], moved: Iterable<Id>, toward: 'up' | 'down'): Id[] | null {
    const stepping = new Set(moved);
    const shown = [...among];
    // From the end they move toward, so a run of moved items steps as one: its first takes the place beside it, and each
    // after it the place the one before it left.
    const back = toward === 'up' ? 1 : -1;
    for (let index = toward === 'up' ? 1 : shown.length - 2; index >= 0 && index < shown.length; index += back) {
        const beside = index - back;
        if (stepping.has(shown[index]!) && !stepping.has(shown[beside]!)) [shown[beside], shown[index]] = [shown[index]!, shown[beside]!];
    }
    if (shown.every((id, index) => id === among[index])) return null;
    const places = new Set(among);
    let next = 0;
    return order.map(id => (places.has(id) ? shown[next++]! : id));
}
