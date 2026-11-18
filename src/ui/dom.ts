export type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: { class?: string; role?: string; text?: string; style?: Partial<CSSStyleDeclaration>; attrs?: Record<string, string> } = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props.class) el.className = props.class;
  if (props.role) el.dataset.role = props.role;
  if (props.text !== undefined) el.textContent = props.text;
  if (props.style) Object.assign(el.style, props.style);
  if (props.attrs) for (const [k, v] of Object.entries(props.attrs)) el.setAttribute(k, v);
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

export const BTN = 'toy-btn font-display font-bold rounded-2xl min-h-12 min-w-12 px-4 py-2 inline-flex items-center justify-center gap-2 cursor-pointer select-none';

export function button(label: string, onClick: () => void, cls = '', role?: string): HTMLButtonElement {
  const b = h('button', { class: `${BTN} ${cls}`, text: label, role });
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}
