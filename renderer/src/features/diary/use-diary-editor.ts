import { useCallback, useEffect, useRef, useState } from 'react';
import { runAuraMutation } from '@/shared/lib/run-aura-mutation';
import type { AuraDatabase, AuraRow } from '@/types/aura';

function toPlainText(raw: string) {
  return raw.replace(/<[^>]*>/g, ' ').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(raw: string) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = raw;
  return textarea.value;
}

export function toEditorHtml(raw: string) {
  const decoded = decodeHtmlEntities(raw);
  const hasTags = /<\/?[a-z][\s\S]*>/i.test(decoded);
  if (hasTags) return decoded;
  return decoded
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

type Params = {
  db: AuraDatabase | null;
  dateString: string;
  dayLocked: boolean;
};

export function useDiaryEditor({ db, dateString, dayLocked }: Params) {
  const [text, setText] = useState('');
  const [spellcheckEnabled, setSpellcheckEnabled] = useState(true);
  const [moodId, setMoodId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [entryId, setEntryId] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement | null>(null);
  const latestTextRef = useRef(text);
  const selectionRef = useRef<Range | null>(null);
  const loadingRef = useRef(false);
  const allowAutosave = useRef(false);

  useEffect(() => { latestTextRef.current = text; }, [text]);

  const setEditorRef = useCallback((node: HTMLDivElement | null) => {
    editorRef.current = node;
    if (node && node.innerHTML !== latestTextRef.current) {
      node.innerHTML = latestTextRef.current;
    }
  }, []);

  const load = useCallback(() => {
    if (!db) return;
    loadingRef.current = true;
    const editorFocused = document.activeElement === editorRef.current;
    const row = (db as AuraDatabase & { getDiaryEntry: (d: string) => AuraRow | undefined }).getDiaryEntry(dateString);
    if (row) {
      setEntryId(String(row.id));
      if (!editorFocused) setText(typeof row.text === 'string' ? toEditorHtml(row.text) : '');
      setMoodId(row.mood_id ? String(row.mood_id) : '');
      setCategoryId(row.category_id ? String(row.category_id) : '');
    } else {
      setEntryId(`diary_${dateString}`);
      if (!editorFocused) setText('');
      setMoodId('');
      setCategoryId('');
    }
    queueMicrotask(() => { loadingRef.current = false; });
  }, [db, dateString]);

  const persist = useCallback((nextHtml?: string) => {
    if (!db || loadingRef.current || !allowAutosave.current || dayLocked) return;
    const dbx = db as AuraDatabase & {
      getDiaryEntry: (d: string) => AuraRow | undefined;
      saveDiaryEntry: (e: AuraRow) => void;
      deleteDiaryEntry: (d: string) => void;
    };
    const sourceHtml = typeof nextHtml === 'string' ? nextHtml : text;
    const plainText = toPlainText(sourceHtml);
    const hasHtmlContent =
      sourceHtml.replace(/<[^>]*>/g, '').trim().length > 0 ||
      /<img|<ul|<ol|<li|<h\d|<blockquote/i.test(sourceHtml);
    const trimmed = hasHtmlContent ? sourceHtml.trim() : plainText;
    const id = entryId ?? `diary_${dateString}`;
    if (trimmed.length > 0 || moodId || categoryId) {
      runAuraMutation('diary', () => {
        dbx.saveDiaryEntry({ id, date: dateString, mood_id: moodId || null, category_id: categoryId || null, text: trimmed || null });
      }, dateString);
      const again = dbx.getDiaryEntry(dateString);
      if (again) setEntryId(String(again.id));
    } else if (dbx.getDiaryEntry(dateString)) {
      runAuraMutation('diary', () => { dbx.deleteDiaryEntry(dateString); }, dateString);
      setEntryId(`diary_${dateString}`);
    }
  }, [categoryId, dateString, dayLocked, db, entryId, moodId, text]);

  const saveEditorSelection = useCallback(() => {
    const el = editorRef.current;
    const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return;
    selectionRef.current = range.cloneRange();
  }, []);

  const restoreEditorSelection = useCallback(() => {
    const el = editorRef.current;
    const sel = window.getSelection();
    const range = selectionRef.current;
    if (!el || !sel || !range) return;
    sel.removeAllRanges();
    sel.addRange(range);
  }, []);

  const applyEditorCommand = useCallback((command: string, value?: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    restoreEditorSelection();
    document.execCommand(command, false, value);
    saveEditorSelection();
    const nextHtml = el.innerHTML;
    setText(nextHtml);
    window.setTimeout(() => persist(nextHtml), 0);
  }, [persist, restoreEditorSelection, saveEditorSelection]);

  // Load on date change
  useEffect(() => {
    allowAutosave.current = false;
    load();
    const id = window.setTimeout(() => { allowAutosave.current = true; }, 500);
    return () => window.clearTimeout(id);
  }, [load, dateString]);

  // Autosave debounce
  useEffect(() => {
    const id = window.setTimeout(() => persist(), 450);
    return () => window.clearTimeout(id);
  }, [text, moodId, categoryId, dateString, persist]);

  // Sync editor innerHTML
  useEffect(() => {
    const el = editorRef.current;
    if (!el || el.innerHTML === text) return;
    saveEditorSelection();
    el.innerHTML = text;
    restoreEditorSelection();
  }, [text, saveEditorSelection, restoreEditorSelection]);

  return {
    text, setText,
    spellcheckEnabled, setSpellcheckEnabled,
    moodId, setMoodId,
    categoryId, setCategoryId,
    entryId,
    editorRef, setEditorRef,
    applyEditorCommand,
    saveEditorSelection,
    persist,
    isEntryEmpty: toPlainText(text).length === 0,
  };
}
