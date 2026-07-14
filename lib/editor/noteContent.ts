// @/lib/editor/noteContent.ts
// Bridges the tentap rich-text editor (HTML) and the note storage model.
//
// New notes store the editor HTML as a single block { type:'body', text:'<html>' }
// so no DB migration is needed. The note's `title` is the first line. Helpers here
// derive plain text for the list preview / search, and convert old block-model
// notes (h1/bullet/check/…) to HTML so they still open in the editor.

import { NoteBlock } from '@/types/Note';

const esc = (s: string) =>
    (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// a note is in the new format when its whole body is one HTML block
export function isStoredHtml(blocks: NoteBlock[]): boolean {
    return blocks.length === 1 && blocks[0].text.trimStart().startsWith('<');
}

function blockToHtml(b: NoteBlock): string {
    const t = esc(b.text);
    switch (b.type) {
        case 'h1': return `<h1>${t}</h1>`;
        case 'h2': return `<h2>${t}</h2>`;
        case 'h3': return `<h3>${t}</h3>`;
        case 'bullet': return `<ul><li><p>${t}</p></li></ul>`;
        case 'number': return `<ol><li><p>${t}</p></li></ol>`;
        case 'quote': return `<blockquote><p>${t}</p></blockquote>`;
        case 'check':
            return `<ul data-type="taskList"><li data-type="taskItem" data-checked="${b.checked ? 'true' : 'false'}">`
                + `<label><input type="checkbox"${b.checked ? ' checked' : ''}></label><div><p>${t}</p></div></li></ul>`;
        default: return `<p>${t}</p>`;
    }
}

// old block-model note → HTML (title becomes the first H1 line)
function blocksToHtml(blocks: NoteBlock[]): string {
    return blocks.map(blockToHtml).join('');
}

// what to load into the editor for a given note
export function noteToEditorHtml(note: { title: string; blocks: NoteBlock[] }): string {
    if (isStoredHtml(note.blocks)) return note.blocks[0].text;
    const titleHtml = `<h1>${esc(note.title)}</h1>`;
    return (titleHtml + blocksToHtml(note.blocks)) || '<h1></h1>';
}

// HTML → plain text, one line per block element
export function htmlToPlainText(html: string): string {
    if (!html) return '';
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|h1|h2|h3|li|blockquote|div|ul|ol)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0)
        .join('\n');
}

// does the editor actually have content worth saving?
export function editorHasContent(html: string): boolean {
    return htmlToPlainText(html).length > 0;
}

// editor HTML → what gets stored (title = first line, body = the HTML)
export function editorHtmlToStorage(html: string): { title: string; blocks: NoteBlock[] } {
    const title = htmlToPlainText(html).split('\n')[0] ?? '';
    return { title, blocks: [{ id: 'content', type: 'body', text: html }] };
}

// body preview for the note card — the first two body lines, kept as separate
// lines (the card caps at 2 lines). Skips the title line for HTML notes.
export function notePreview(note: { title: string; blocks: NoteBlock[] }): string {
    if (isStoredHtml(note.blocks)) {
        const lines = htmlToPlainText(note.blocks[0].text).split('\n').filter(Boolean);
        return lines.slice(1, 3).join('\n');
    }
    const lines = note.blocks.map(b => b.text).join('\n')
        .split('\n').map(l => l.trim()).filter(Boolean);
    return lines.slice(0, 2).join('\n');
}

// lowercase haystack for search (title + body text)
export function noteSearchText(note: { title: string; blocks: NoteBlock[] }): string {
    const body = isStoredHtml(note.blocks)
        ? htmlToPlainText(note.blocks[0].text)
        : note.blocks.map(b => b.text).join(' ');
    return `${note.title} ${body}`.toLowerCase();
}
