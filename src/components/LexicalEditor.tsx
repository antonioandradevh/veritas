import { useEffect, useState, useCallback } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
  $getSelection, 
  $isRangeSelection, 
  FORMAT_TEXT_COMMAND, 
  SELECTION_CHANGE_COMMAND,
  $getRoot,
  type EditorState,
  $createParagraphNode,
  COMMAND_PRIORITY_EDITOR,
  $insertNodes,
  DecoratorNode,
  type NodeKey,
  PASTE_COMMAND
} from 'lexical';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { $patchStyleText, $setBlocksType } from '@lexical/selection';
import { HeadingNode, QuoteNode, $createHeadingNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';

// --- CUSTOM IMAGE NODE ---
class ImageNode extends DecoratorNode<any> {
  __src: string;

  static getType(): string { return 'image'; }
  static clone(node: ImageNode): ImageNode { return new ImageNode(node.__src, node.__key); }
  constructor(src: string, key?: NodeKey) { super(key); this.__src = src; }
  
  createDOM(): HTMLElement { 
    const span = document.createElement('span');
    span.style.display = 'inline-block';
    return span; 
  }
  
  updateDOM(): boolean { return false; }
  
  decorate(): any {
    return <img src={this.__src} style={{ maxWidth: '100%', borderRadius: '8px', margin: '10px 0', display: 'block' }} alt="Pasted content" />;
  }

  exportDOM() {
    const element = document.createElement('img');
    element.setAttribute('src', this.__src);
    element.setAttribute('style', 'max-width: 100%; border-radius: 8px; margin: 10px 0; display: block;');
    return { element };
  }

  exportJSON(): any { return { type: 'image', src: this.__src, version: 1 }; }
  static importJSON(json: any): ImageNode { return new ImageNode(json.src); }
}

function $createImageNode(src: string): ImageNode { return new ImageNode(src); }

const theme = {
  paragraph: 'editor-paragraph',
  heading: { 
    h1: 'editor-heading-h1', 
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
    h4: 'editor-heading-h4',
    h5: 'editor-heading-h5',
    h6: 'editor-heading-h6',
  },
  list: { ol: 'editor-list-ol', ul: 'editor-list-ul', listitem: 'editor-listitem' },
  text: { bold: 'editor-text-bold', italic: 'editor-text-italic', underline: 'editor-text-underline' },
};

// --- PLUGINS ---
function ImagePastePlugin() {
  const [editor] = useLexicalComposerContext();
  
  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = () => {
                editor.update(() => {
                  const node = $createImageNode(reader.result as string);
                  $insertNodes([node]);
                });
              };
              reader.readAsDataURL(file);
              return true; 
            }
          }
        }
        return false; 
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);
  
  return null;
}

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  const updateToolbar = useCallback(() => {
    try {
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          setIsBold(selection.hasFormat('bold'));
          setIsItalic(selection.hasFormat('italic'));
          setIsUnderline(selection.hasFormat('underline'));
        }
      });
    } catch (e) {}
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(SELECTION_CHANGE_COMMAND, () => { updateToolbar(); return false; }, COMMAND_PRIORITY_EDITOR);
  }, [editor, updateToolbar]);

  const applyFont = (font: string) => editor.update(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) $patchStyleText(selection, { 'font-family': font });
  });

  const applySize = (size: string) => editor.update(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) $patchStyleText(selection, { 'font-size': size });
  });

  const applyColor = (color: string) => editor.update(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) $patchStyleText(selection, { 'color': color });
  });

  return (
    <div className="dark-editor-toolbar" style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
      <select className="rdw-dropdown-wrapper" style={{ height: '36px', background: '#333', border: '1px solid #444', color: '#fff' }} onChange={(e) => {
        const level = e.target.value;
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            if (level === 'p') $setBlocksType(selection, () => $createParagraphNode());
            else $setBlocksType(selection, () => $createHeadingNode(level as any));
          }
        });
      }}>
        <option value="p">Texto Normal</option>
        <option value="h1">Título 1</option>
        <option value="h2">Título 2</option>
        <option value="h3">Título 3</option>
        <option value="h4">Título 4</option>
        <option value="h5">Título 5</option>
        <option value="h6">Título 6</option>
      </select>

      <button type="button" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')} className={"rdw-option-wrapper " + (isBold ? "rdw-option-active" : "")} style={{ width: '36px', height: '36px' }}>B</button>
      <button type="button" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')} className={"rdw-option-wrapper " + (isItalic ? "rdw-option-active" : "")} style={{ width: '36px', height: '36px' }}>I</button>
      <button type="button" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')} className={"rdw-option-wrapper " + (isUnderline ? "rdw-option-active" : "")} style={{ width: '36px', height: '36px' }}>U</button>
      
      <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />
      
      <select className="rdw-dropdown-wrapper" style={{ height: '36px', background: '#333', border: '1px solid #444', color: '#fff' }} onChange={(e) => applyFont(e.target.value)}>
        <option value="">Fonte...</option>
        <option value="Inter">Inter</option>
        <option value="Arial">Arial</option>
        <option value="Times New Roman">Times New Roman</option>
        <option value="RomanUncialModern">RomanUncial</option>
        <option value="Verdana">Verdana</option>
      </select>

      <select className="rdw-dropdown-wrapper" style={{ height: '36px', background: '#333', border: '1px solid #444', color: '#fff' }} onChange={(e) => applySize(e.target.value)}>
        <option value="">Tam...</option>
        {[10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48].map(size => (
          <option key={size} value={`${size}px`}>{size}</option>
        ))}
      </select>

      <input type="color" style={{ width: '36px', height: '36px', border: '1px solid #444', background: '#333', cursor: 'pointer' }} onChange={(e) => applyColor(e.target.value)} />
    </div>
  );
}

export default function LexicalEditor({ initialHtml, onChange, placeholder }: { initialHtml: string; onChange: (html: string) => void; placeholder?: string; }) {
  const initialConfig = {
    namespace: 'VeritasEditor',
    theme,
    nodes: [HeadingNode, ListNode, ListItemNode, QuoteNode, LinkNode, ImageNode],
    onError: (error: Error) => console.error(error)
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="dark-editor-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
        <ToolbarPlugin />
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <RichTextPlugin
            contentEditable={<ContentEditable className="dark-editor-content" style={{ outline: 'none', minHeight: '500px', flex: 1, overflowY: 'auto' }} />}
            placeholder={<div style={{ position: 'absolute', top: '20px', left: '20px', color: '#666', pointerEvents: 'none' }}>{placeholder || 'Digite...'}</div>}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <ImagePastePlugin />
          <InitialStatePlugin initialHtml={initialHtml} />
          <OnChangePlugin onChange={(editorState: EditorState) => {
            editorState.read(() => {
              const html = $generateHtmlFromNodes(editorState as any);
              onChange(html);
            });
          }} />
        </div>
      </div>
    </LexicalComposer>
  );
}

function InitialStatePlugin({ initialHtml }: { initialHtml: string }) {
  const [editor] = useLexicalComposerContext();
  const [isFirstRender, setIsFirstFirstRender] = useState(true);
  useEffect(() => {
    if (isFirstRender && initialHtml) {
      editor.update(() => {
        const parser = new DOMParser();
        const dom = parser.parseFromString(initialHtml, 'text/html');
        const nodes = $generateNodesFromDOM(editor, dom);
        $getRoot().clear().append(...nodes);
      });
      setIsFirstFirstRender(false);
    }
  }, [editor, initialHtml, isFirstRender]);
  return null;
}
