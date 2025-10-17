# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Freeact** is an educational React v16 implementation using DFS-based virtual DOM without Fiber architecture. It demonstrates core React concepts including virtual DOM reconciliation, state management (useState), side effects (useEffect), and event handling. This is not intended for production use—it's designed to help understand React's internals.

## Quick Start Commands

```bash
# Development server
npm start

# Production build
npm run build

# Code formatting and linting (built-in via eslint + prettier)
npm run lint  # Note: not explicitly in package.json, run via eslint
```

## Project Structure

```
src/
├── freeact.ts       # Core Freeact class implementation (~670 lines)
├── index.d.ts       # TypeScript type definitions
└── index.tsx        # Demo TODO application using Freeact

dist/               # Build output (ESBuild bundle)
```

## Key Architecture Concepts

### Core Class: Freeact

The entire library is built around a single `Freeact` class (`src/freeact.ts`) that handles:
- Virtual element creation via `createVirtualElement()`
- Rendering via `render()` and reconciliation
- State management with `useState()`
- Side effects with `useEffect()`

### Virtual DOM Structure

**VirtualNode** (`src/index.d.ts`) is the fundamental data structure:
```typescript
type VirtualNode = {
  type: VirtualElement;           // string (tag name) or FunctionComponent
  props: Props;                   // attributes and children
  realNode?: Node | null;         // mapped to actual DOM
  child?: VirtualNode | null;     // single child for function components
  hooks?: unknown[];              // stores state and effects
  parentRealNode?: Node | null;
  parentVirtualNode?: VirtualNode | null;
};
```

### Reconciliation Algorithm (the core diffing logic)

The `reconcile()` method (`src/freeact.ts:304-397`) implements 4 cases:
1. **Remove**: Old exists, new doesn't → remove from DOM
2. **Add**: Old doesn't exist, new does → append to DOM
3. **Replace**: Type changed → replace in DOM
4. **Update**: Same type → update props and children recursively

Key insight: Children reconciliation uses **key-based optimization** (`reconcileOldAndNewChildrenByCompare()` at line 197) that maps old children by key, iterates new children, and calls `reorderChildren()` to fix DOM order using `insertBefore()`.

### State Management (useState)

- Each component tracks `hookIndexInEachComponent` to index into its `hooks` array
- State updates trigger `renderSubtree()` which re-renders only that component subtree
- State setters capture component reference via closure to ensure correct re-renders

### Effects Management (useEffect)

- Effects scheduled during render are collected in `pendingEffectsQueue`
- After render completes, `flushEffects()` executes all effects
- Dependency array changes trigger re-execution
- Cleanup functions run before next effect execution or unmount

### Event Handling

- Events are normalized from React style (onClick → click) in `convertToEventName()`
- Event listeners stored in `WeakMap<HTMLElement, Record<string, EventListener>>` to prevent duplicates
- Props update logic handles event listener attachment/removal

## Development Notes

### Important Implementation Details

1. **Text Elements**: Primitive values are converted to text nodes with type `'TEXT_ELEMENT'`
2. **Function Components**: When type is a function, render its return value as child
3. **Props Flattening**: Array children from `.map()` are flattened via `.flat()`
4. **Style Object Handling**: Styles are deep-compared and applied individually to avoid recomputation
5. **Hook Rules**: Hooks must be called in the same order every render (just like React)
6. **Key Prop**: Used in child reconciliation for stable element identity across re-renders

### Common Tasks

**Adding a new hook** (e.g., useRef, useCallback):
1. Add hook type to `src/index.d.ts`
2. Implement in Freeact class with hook index tracking
3. Follow pattern: check if hook exists at index, initialize if needed, increment index

**Fixing reconciliation bugs**:
- Start in `reconcile()` method, trace through cases 1-4
- Check `reconcileOldAndNewChildrenByCompare()` for child list handling
- Verify `reorderChildren()` if elements shift positions incorrectly
- Review `updateVirtualNodeProps()` for prop/event listener issues

**Performance considerations**:
- No Fiber architecture = no work interruption (all rendering is synchronous)
- No batching of state updates
- Reconciliation is O(n) where n = total virtual nodes
- WeakMap for event listeners prevents memory leaks on DOM cleanup

## Build and Tooling

- **TypeScript 5.8.3**: Strict mode enabled, JSX set to "react"
- **ESBuild 0.25.4**: Fast bundler, outputs ESM format to `dist/bundle.js`
- **ESLint + Prettier**: Configured via `eslint.config.js` and `.prettierrc.json`
- **Serve**: Dev server for local testing (`npm start`)

## Demo Application

`src/index.tsx` contains a fully functional TODO application demonstrating:
- useState for managing todos, input, and filter state
- Function components (TodoItem, TodoList)
- Event handlers (onClick, onChange, onKeyPress, onMouseOver/Out)
- Conditional rendering and list rendering with keys
- Inline styles with dynamic values

Run `npm start` to view the app at `http://localhost:3000`.

## Limitations (by Design)

- No Fiber architecture → no interruptible rendering
- No concurrent mode or priority-based updates
- No context API or portals
- No error boundaries
- No lazy loading or code splitting
- Single-threaded rendering only
