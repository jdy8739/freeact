/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { VirtualNode, VirtualElement, Key } from './index.d';

const TEXT_ELEMENT = 'TEXT_ELEMENT';

interface IFreeact {
  createVirtualElement(type: VirtualElement, props: Record<string, unknown>): VirtualNode;
  render(element: VirtualNode, container: Element): void;
}

class Freeact implements IFreeact {
  private virtualRootNode: VirtualNode | null = null;

  /** currently rendering component */
  private currentRenderingComponent: VirtualNode | null = null;

  /** event listeners attached to each element */
  private eventListeners = new WeakMap<HTMLElement, Record<string, EventListener>>();

  /** hook index */
  private hookIndex = 0;

  /** root node */
  private rootNode: Element | null = null;

  /** create text element */
  private createTextElement(text: string): VirtualNode {
    return {
      type: TEXT_ELEMENT,
      props: {
        value: text,
        children: [],
      },
    };
  }

  public createVirtualElement(
    type: VirtualElement,
    props: ({ key?: Key } & Record<string, unknown>) | null = {},
    ...children: unknown[]
  ): VirtualNode {
    const childrenElements = children.filter(Boolean).map((child) => {
      if (typeof child === 'object') {
        return child as VirtualNode;
      }

      return this.createTextElement(String(child));
    });

    return {
      type,
      props: {
        ...props,
        key: props?.key ?? null,
        children: childrenElements,
      },
    };
  }

  private createHTMLElement(virtualNode: VirtualNode): HTMLElement {
    const realNode = document.createElement(virtualNode.type as string);

    virtualNode.realNode = realNode;

    for (const key in virtualNode.props) {
      if (key === 'children' || key === 'key') {
        continue;
      }

      realNode.setAttribute(key, String(virtualNode.props[key]));
    }

    return realNode;
  }

  private createElement(virtualNode: VirtualNode): Text | HTMLElement {
    if (virtualNode.type === TEXT_ELEMENT) {
      return document.createTextNode(String(virtualNode.props.value));
    }

    return this.createHTMLElement(virtualNode);
  }

  private renderComponent(
    parentNode: Node,
    parentVirtualNode: VirtualNode | null,
    oldVirtualNode: VirtualNode | null,
    newVirtualNode: VirtualNode | null,
  ): void {
    /** Context setting for rendering component. */
    this.currentRenderingComponent = newVirtualNode;
    this.hookIndex = 0;

    let nextVirtualNode = (newVirtualNode?.type as Function)(newVirtualNode?.props);
    if (!nextVirtualNode) {
      nextVirtualNode = this.createTextElement('');
    } else if (typeof nextVirtualNode !== 'object') {
      nextVirtualNode = this.createTextElement(String(nextVirtualNode));
    }

    nextVirtualNode.parentNode = parentNode;
    nextVirtualNode.parentVirtualNode = newVirtualNode;

    this.reconcile(parentNode, newVirtualNode, oldVirtualNode?.child || null, nextVirtualNode);

    newVirtualNode!.child = nextVirtualNode;
    newVirtualNode!.realNode = nextVirtualNode.realNode;

    /** Delete context for rendering component. */
    this.currentRenderingComponent = null;
  }

  private rerenderSubtree(virtualNode: VirtualNode) {
    if (typeof virtualNode.type !== 'function') {
      return;
    }

    this.currentRenderingComponent = virtualNode;
    this.hookIndex = 0;

    let nextVirtualNode = (virtualNode?.type as Function)(virtualNode?.props);
    if (!nextVirtualNode) {
      nextVirtualNode = this.createTextElement('');
    } else if (typeof nextVirtualNode !== 'object') {
      nextVirtualNode = this.createTextElement(String(nextVirtualNode));
    }

    const parentNode = virtualNode.parentRealNode;
    nextVirtualNode.parentNode = parentNode;
    nextVirtualNode.parentVirtualNode = virtualNode;

    this.reconcile(parentNode!, virtualNode, virtualNode.child ?? null, nextVirtualNode);

    virtualNode.child = nextVirtualNode;
    virtualNode.realNode = nextVirtualNode.realNode;

    this.currentRenderingComponent = null;
  }

  private reconcileOldAndNewChildrenByCompare(
    nodeToBeUpdated: Node,
    parentVirtualNode: VirtualNode | null,
    oldVirtualChildren: VirtualNode[],
    newVirtualChildren: VirtualNode[],
  ): void {
    /** Store old virtual children in map with their own key. */
    const oldChildrenMap = new Map<string | number, VirtualNode>();

    // Store old virtual children in map with their own key.
    for (let i = 0; i < oldVirtualChildren.length; i++) {
      const oldChild = oldVirtualChildren[i];

      oldChildrenMap.set(oldChild.props.key ?? i, oldChild);
    }

    // Reconcile new virtual children with old virtual children.
    for (let i = 0; i < newVirtualChildren.length; i++) {
      const newChild = newVirtualChildren[i];

      const newChildKey = newChild.props.key ?? i;

      const oldChild = oldChildrenMap.get(newChildKey) ?? null;

      this.reconcile(nodeToBeUpdated, parentVirtualNode, oldChild, newChild);

      // Remove old virtual child from map.
      oldChildrenMap.delete(newChildKey);
    }

    // Remove remaining old virtual children from real dom tree.
    for (const key of oldChildrenMap.keys()) {
      this.reconcile(nodeToBeUpdated, parentVirtualNode, oldChildrenMap.get(key)!, null);
    }
  }

  private reconcileChildren(
    nodeToBeUpdated: Node,
    parentVirtualNode: VirtualNode | null,
    oldVirtual: VirtualNode | null,
    newVirtual: VirtualNode | null,
  ): void {
    this.updateVirtualNodeProps(nodeToBeUpdated, oldVirtual?.props ?? {}, newVirtual?.props ?? {});
    this.reconcileOldAndNewChildrenByCompare(
      nodeToBeUpdated,
      parentVirtualNode,
      oldVirtual?.props.children ?? [],
      newVirtual?.props.children ?? [],
    );
  }

  // Run diffing algorithm to update real dom tree.
  private reconcile(
    parentNode: Node,
    parentVirtualNode: VirtualNode | null,
    oldVirtualNode: VirtualNode | null,
    newVirtualNode: VirtualNode | null,
  ): void {
    if (newVirtualNode) {
      newVirtualNode.parentRealNode = parentNode;
      newVirtualNode.parentVirtualNode = parentVirtualNode;
    }

    if (!oldVirtualNode && !newVirtualNode) {
      return;
    }

    // Remove real node in real dom tree when newVirtualNode is null.
    if (oldVirtualNode && !newVirtualNode) {
      parentNode.removeChild(oldVirtualNode.realNode!);
      return;
    }

    // Add real node in real dom tree when oldVirtualNode is null.
    if (!oldVirtualNode && newVirtualNode) {
      if (typeof newVirtualNode.type === 'function') {
        this.renderComponent(parentNode, parentVirtualNode, null, newVirtualNode);
        return;
      }

      const newRealNode = this.createElement(newVirtualNode);

      newVirtualNode.realNode = newRealNode;

      parentNode.appendChild(newRealNode);

      this.reconcileChildren(newRealNode, parentVirtualNode, null, newVirtualNode!);
      return;
    }

    // Replace real node in real dom tree when type is different.
    if (oldVirtualNode!.type !== newVirtualNode!.type) {
      if (typeof newVirtualNode!.type === 'function') {
        parentNode.removeChild(oldVirtualNode!.realNode!);
        this.renderComponent(parentNode, parentVirtualNode, null, newVirtualNode);
        return;
      }

      const newRealNode = this.createElement(newVirtualNode!);

      newVirtualNode!.realNode = newRealNode;

      parentNode.replaceChild(newRealNode, oldVirtualNode!.realNode!);

      this.reconcileChildren(newRealNode, parentVirtualNode, null, newVirtualNode!);
      return;
    }

    // Render component when type is function.
    if (typeof newVirtualNode!.type === 'function') {
      this.renderComponent(parentNode, parentVirtualNode, oldVirtualNode, newVirtualNode);
      return;
    }

    /** Update real dom tree when old and new virtual nodes are same type. */
    const nodeToBeUpdated: Node = (newVirtualNode!.realNode = oldVirtualNode!.realNode)!;

    if (newVirtualNode!.type === TEXT_ELEMENT) {
      nodeToBeUpdated!.textContent = String(newVirtualNode!.props.value);
    } else {
      this.reconcileChildren(nodeToBeUpdated!, parentVirtualNode, oldVirtualNode!, newVirtualNode!);
    }
  }

  private applyStyle(el: HTMLElement, prevStyle: Record<string, unknown>, nextStyle: Record<string, unknown>) {
    if (typeof nextStyle !== 'object' || nextStyle === null) {
      el.style.cssText = (nextStyle || '') as string;
      return;
    }

    const styleDecl = el.style as unknown as Record<string, unknown>;

    // 1) 사라진 속성 제거
    for (const key in prevStyle) {
      if (!(key in nextStyle)) {
        styleDecl[key] = '';
      }
    }

    // 2) 새로 추가되거나 변경된 속성 적용
    for (const key in nextStyle) {
      const updatedStyleValue = nextStyle[key];
      if (styleDecl[key] !== updatedStyleValue) {
        styleDecl[key] = updatedStyleValue;
      }
    }
  }

  private updateVirtualNodeProps(
    element: Node,
    prevProps: Record<string, unknown>,
    nextProps: Record<string, unknown>,
  ) {
    // Only proceed if dom is an Element (not a Text node)
    if (!(element instanceof Element)) return;
    const el = element as HTMLElement;

    /**
     * 전역 WeakMap<HTMLElement, Record<string, EventListener>>
     * 각 노드에 연결된 이벤트 리스너를 추적해
     * 중복 바인딩과 메모리 누수를 방지합니다.
     */
    const currentListeners = this.eventListeners.get(el) ?? {};

    /* ------------------------------------------------------------------
     * 1단계: nextProps에 사라졌거나 값이 달라진 이전 속성·리스너 제거
     * ----------------------------------------------------------------*/
    Object.keys(prevProps).forEach((key) => {
      if (key === 'children' || key === 'key') return; // 가상 DOM 전용 필드

      const prevVal = prevProps[key];
      const nextVal = nextProps[key];

      if (!(key in nextProps) || prevVal !== nextVal) {
        if (key.startsWith('on')) {
          /* 이벤트:  remove → 캐시 정리 */
          const type = key.slice(2).toLowerCase();
          el.removeEventListener(type, prevVal as EventListener);
          delete currentListeners[type];
        } else if (key === 'style') {
          /* style: 전체 초기화(개별 diff는 2단계에서 처리) */
          el.style.cssText = '';
        } else if (key === 'className') {
          el.removeAttribute('class');
        } else {
          el.removeAttribute(key);
        }
      }
    });

    /* ------------------------------------------------------------------
     * 2단계: 새로 추가되었거나 값이 바뀐 속성·리스너 적용
     * ----------------------------------------------------------------*/
    Object.keys(nextProps).forEach((key) => {
      if (key === 'children' || key === 'key') return;

      const prevPropValue = prevProps[key] as unknown as Record<string, unknown>;
      const nextPropValue = nextProps[key] as unknown as Record<string, unknown>;

      // style 객체는 깊이 비교가 필요하므로 제외
      if (
        prevPropValue === nextPropValue &&
        (typeof nextPropValue !== 'object' || nextPropValue === null) &&
        key !== 'style'
      )
        return;

      if (key.startsWith('on')) {
        /* 이벤트: 이전 리스너가 있으면 교체 */
        // 대문자 이벤트명 정규화: onClick -> click
        const eventName = key.slice(2).toLowerCase();

        if (prevPropValue) {
          el.removeEventListener(eventName, prevPropValue as unknown as EventListener);
        }

        if (nextPropValue && typeof nextPropValue === 'function') {
          el.addEventListener(eventName, nextPropValue);
          currentListeners[eventName] = nextPropValue;
        }
      } else if (key === 'style') {
        this.applyStyle(el, prevPropValue ?? {}, nextPropValue ?? ({} as Record<string, unknown>));
      } else if (key === 'className') {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        nextPropValue ? el.setAttribute('class', String(nextPropValue)) : el.removeAttribute('class');
      } else {
        /* 일반 속성: boolean true → 빈 문자열, false/null/undefined → 제거 */
        if (nextPropValue === null || nextPropValue === undefined || (nextPropValue as unknown as boolean) === false) {
          el.removeAttribute(key);
        } else {
          el.setAttribute(key, typeof nextPropValue === 'boolean' ? '' : String(nextPropValue));
        }
      }
    });
  }

  public useState<S>(defaultValue: S): [S, (value: S | ((prev: S) => S)) => void] {
    if (!this.currentRenderingComponent) {
      throw new Error('useState can only be called inside a function component.');
    }

    const hooks = (this.currentRenderingComponent.hooks ||= []);

    if (hooks.length <= this.hookIndex) {
      hooks.push(defaultValue);
    }

    const currentRenderingComponent = this.currentRenderingComponent;

    const state = hooks[this.hookIndex] as S;
    const currentHookIndex = this.hookIndex;

    this.hookIndex++;

    const setState = (updatedState: S | ((prev: S) => S)) => {
      if (typeof updatedState === 'function') {
        hooks[currentHookIndex] = (updatedState as (prev: S) => S)(hooks[currentHookIndex] as S);
      } else {
        hooks[currentHookIndex] = updatedState;
      }

      this.rerenderSubtree(currentRenderingComponent);
    };

    return [state, setState];
  }

  public render(virtualNode: VirtualNode, container: Element): void {
    if (!this.rootNode) {
      this.rootNode = container;
    }

    this.reconcile(container, null, this.virtualRootNode, virtualNode);
    this.virtualRootNode = virtualNode;
  }
}

const freeact = new Freeact();

export default freeact;
