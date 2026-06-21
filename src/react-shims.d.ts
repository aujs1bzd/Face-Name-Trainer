declare module 'react' {
  export type FormEvent = { preventDefault(): void };
  export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  export function useMemo<T>(factory: () => T, deps: unknown[]): T;
  export function useRef<T>(initial: T): { current: T };
  export function useState<T>(initial: T | (() => T)): [T, (value: T | ((previous: T) => T)) => void];
  const React: { StrictMode: (props: { children?: unknown }) => unknown };
  export default React;
}

declare module 'react-dom/client' {
  export function createRoot(element: Element): { render(node: unknown): void };
}

declare namespace JSX { interface IntrinsicElements { [elementName: string]: any } }

declare module 'react/jsx-runtime' {
  export const jsx: unknown;
  export const jsxs: unknown;
  export const Fragment: unknown;
}
