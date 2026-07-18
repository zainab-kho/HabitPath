// Injected into the note editor WebView AFTER it loads, via
// editor.webviewRef.current.injectJavaScript (see notes/[id].tsx). It must NOT
// be passed as the WebView's injectedJavaScript prop — TenTap uses that prop
// internally for its bootstrap (including the custom CSS), and overriding it
// breaks all editor styling.
//
// Fixes the backspace behavior after leaving a checkbox list: pressing Enter on
// an empty checkbox exits the list (good), but Tiptap's default backspace then
// "joins backward" — converting the now-plain line BACK into a checkbox item.
// Users expect backspace there to simply return to the previous line.
//
// The fix intercepts that one exact case at the DOM level: caret on an EMPTY
// top-level paragraph that sits directly below a task list. We remove the empty
// paragraph and place the caret at the end of the last checkbox item —
// ProseMirror's mutation observer folds the DOM change into its document (the
// same path it uses to absorb autocorrect/spellcheck edits), so no checkbox is
// recreated. Every other backspace goes through untouched.
export const TASKLIST_BACKSPACE_FIX_JS = `
(function () {
  if (window.__taskBackspaceFix) return;
  window.__taskBackspaceFix = true;
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Backspace') return;
    var sel = window.getSelection();
    if (!sel || !sel.isCollapsed || sel.rangeCount === 0) return;
    var node = sel.anchorNode;
    if (!node) return;
    var el = node.nodeType === 1 ? node : node.parentElement;
    var p = el && el.closest ? el.closest('p') : null;
    if (!p) return;
    if (p.textContent !== '') return; // only an empty line
    var root = p.parentElement;
    if (!root || !root.classList || !root.classList.contains('ProseMirror')) return;
    var prev = p.previousElementSibling;
    if (!prev || !prev.matches('ul[data-type="taskList"]')) return;
    var items = prev.querySelectorAll('li > div > p');
    var target = items[items.length - 1];
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();
    p.remove();
    var r = document.createRange();
    r.selectNodeContents(target);
    r.collapse(false);
    sel.removeAllRanges();
    sel.addRange(r);
  }, true);
})();
true;
`;
