/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { VirtualNode, VirtualElement, Key, Effect, EffectCallback } from './index.d';

const TEXT_ELEMENT = 'TEXT_ELEMENT';

interface IFreeact {
  createVirtualElement(type: VirtualElement, props: Record<string, unknown>): VirtualNode;
  render(element: VirtualNode, container: Element): void;
}

/**
 * @class Freeact
 * @description
 * 이 클래스는 실제 리액트(v 16이하)를 흉내내어 가상돔 노드를 생성하고, 렌더링하는 클래스입니다.
 * 리액트의 핵심 가치인 가상돔 트리를 만들어 상태변경에 따라 이전과 이후의 상태를 비교하고 이를 실제 돔트리에 반영하는 기능을 가진 클래스입니다.
 */
class Freeact implements IFreeact {
  /**
   * @private
   * @member currently rendering component
   * !! 현재 렌더링되고 있는 가상돔 노드를 클로저로 캡처하여 setState 등의 함수 컨텍스트에 바인딩 및 그 클로저로부터 서브트리를 렌더링해야하기 때문에, 필요한 멤버  !!
   * !! Members required because the currently rendered virtual dome node must be captured with a closure, bound to a function context such as setState, and a subtree must be rendered from the closure !!
   */
  private currentRenderingComponent: VirtualNode | null = null;

  /**
   * @private
   * @member event listeners attached to each element
   */
  private eventListeners = new WeakMap<HTMLElement, Record<string, EventListener>>();

  /**
   * @private
   * @member hook index
   */
  private hookIndexInEachComponent = 0;

  /**
   * @private
   * @member pending effects
   * 렌더링 중에 포착된, 렌더링 이후에 실행되어야 하는 이펙트들을 저장하는 배열
   */
  private pendingEffectsQueue: (() => void)[] = [];

  /**
   * @private
   * @description create text element
   */
  private createTextElement(text: string): VirtualNode {
    return {
      type: TEXT_ELEMENT,
      props: {
        value: text,
        children: [],
      },
    };
  }

  /**
   * @description create virtual element
   */
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

  /**
   * @private
   * @description create real dom element
   */
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

  /**
   * @private
   * @description create real dom element or text node
   */
  private createElement(virtualNode: VirtualNode): Text | HTMLElement {
    if (virtualNode.type === TEXT_ELEMENT) {
      return document.createTextNode(String(virtualNode.props.value));
    }

    return this.createHTMLElement(virtualNode);
  }

  /**
   * @private
   * @description render function component
   */
  private renderFunctionComponent(
    parentNode: Node,
    oldVirtualNode: VirtualNode | null,
    newVirtualNode: VirtualNode | null,
  ): void {
    /** Context setting for rendering component. */
    this.currentRenderingComponent = newVirtualNode;
    this.hookIndexInEachComponent = 0;

    /** 함수컴포넌트의 반환값 */
    let childOfFunctionComponent = (newVirtualNode?.type as Function)(newVirtualNode?.props);

    if (!childOfFunctionComponent) {
      childOfFunctionComponent = this.createTextElement('');
    } else if (typeof childOfFunctionComponent !== 'object') {
      childOfFunctionComponent = this.createTextElement(String(childOfFunctionComponent));
    }

    childOfFunctionComponent.parentNode = parentNode;
    childOfFunctionComponent.parentVirtualNode = newVirtualNode;

    this.reconcile(parentNode, newVirtualNode, oldVirtualNode?.child || null, childOfFunctionComponent);

    newVirtualNode!.child = childOfFunctionComponent;
    newVirtualNode!.realNode = childOfFunctionComponent.realNode;

    /** Delete context for rendering component. */
    this.currentRenderingComponent = null;
  }

  /**
   * @private
   * @description render subtree
   * setState로 재렌더링되는 컴포넌트는 무조건 함수 컴포넌트이므로 함수취급합니다.
   */
  private renderSubtree(virtualNode: VirtualNode) {
    if (typeof virtualNode.type !== 'function') {
      return;
    }

    this.currentRenderingComponent = virtualNode;
    this.hookIndexInEachComponent = 0;

    /** 함수컴포넌트의 반환값 */
    let childOfFunctionComponent = (virtualNode?.type as Function)(virtualNode?.props);

    if (!childOfFunctionComponent) {
      childOfFunctionComponent = this.createTextElement('');
    } else if (typeof childOfFunctionComponent !== 'object') {
      childOfFunctionComponent = this.createTextElement(String(childOfFunctionComponent));
    }

    const parentNode = virtualNode.parentRealNode;
    childOfFunctionComponent.parentNode = parentNode;
    childOfFunctionComponent.parentVirtualNode = virtualNode;

    this.reconcile(parentNode!, virtualNode, virtualNode.child ?? null, childOfFunctionComponent);

    virtualNode.child = childOfFunctionComponent;
    virtualNode.realNode = childOfFunctionComponent.realNode;

    this.currentRenderingComponent = null;

    this.flushEffects();
  }

  /**
   * @private
   * @description reconcile old and new children by compare
   */
  private reconcileOldAndNewChildrenByCompare(
    parentRealNode: Node,
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

      this.reconcile(parentRealNode, parentVirtualNode, oldChild, newChild);

      // Remove old virtual child from map.
      oldChildrenMap.delete(newChildKey);
    }

    this.reorderChildren(parentRealNode, newVirtualChildren);

    // Remove remaining old virtual children from real dom tree.
    for (const key of oldChildrenMap.keys()) {
      this.reconcile(parentRealNode, parentVirtualNode, oldChildrenMap.get(key)!, null);
    }
  }

  /**
   * @private
   * @description reorder children if the order of children has changed by insertBefore
   */
  private reorderChildren(parentRealNode: Node, newVirtualChildren: VirtualNode[]) {
    // 여기서 재조정을 한다면... (현재 이 함수 호출부 위에서 for문을 돌면서 newVirtualChildren의 realNode는 다 만들어진 싱황)
    // 마지막 - 1 요소부터 그 앞 요소가 될 요소 앞에 insertBefore를 해준다.
    // current: c a b -> b c a -> a b c
    // to be: a b c

    // current: b a d -> c b d
    // to be: c b d

    /**
     * @todo - newVirtualChildren.length - 1인 가장 맨 끝 노드는 재조정이 필요없는지 재확인 필요!
     * 현재는 newVirtualChildren.length - 2인 노드부터 계속 새로운 뒷자리 형제를 찾아 재조정을 하기 때문에 불필요하다고 판단함.
     */
    for (let i = newVirtualChildren.length - 2; i >= 0; i--) {
      /** 현재 노드 */
      const newChild = newVirtualChildren[i].realNode;

      /** 이전 렌더링 시에 현재 노드의 다음 형제 노드 */
      const currentNextSibling = newChild?.nextSibling;

      /** 현재 렌더링 중에서 현재 노드의 다음 형제가 될 노드 */
      const newNextSibling = newVirtualChildren[i + 1].realNode;

      // 이전 렌더링 시에 현재 노드의 형제 노드와 다음 렌더링 시의 그것과 다르면, 현재 형제노드의 앞으로 위치를 변경합니다.
      if (newChild && newNextSibling && currentNextSibling !== newNextSibling) {
        parentRealNode.insertBefore(newChild, newNextSibling);
      }
    }
  }

  /**
   * @private
   * @description update virtual node props and reconcile old and new children by compare
   */
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
      oldVirtual?.props.children.flat() ?? [], // map 등의 메소드를 통해 배열로 들어오는 jsx 요소 평탄화
      newVirtual?.props.children.flat() ?? [],
    );
  }

  /**
   * @description 가상노드의 이전 노드와 새로운 노드를 비교합니다.
   * case 1: 새로운 노드가 없으면 이전 노드를 제거합니다.
   * case 2: 이전 노드가 없으면 새로운 노드를 추가합니다.
   * case 3: 이전 노드와 새로운 노드의 타입이 다르면 이전 노드를 제거하고 새로운 노드를 추가합니다.
   * case 4: 이전 노드와 새로운 노드의 타입이 같으면 이전 노드를 업데이트합니다.
   */
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

    /**
     * @case 1: Remove real node in real dom tree when newVirtualNode is null.
     */
    if (oldVirtualNode && !newVirtualNode) {
      parentNode.removeChild(oldVirtualNode.realNode!);

      // remove effects before unmounting
      if (oldVirtualNode.hooks) {
        for (const hook of oldVirtualNode.hooks) {
          if (Boolean(hook) && typeof hook === 'object') {
            (hook as Effect).cleanup?.();
          }
        }
      }
      return;
    }

    /**
     * @case 2: Add real node in real dom tree when oldVirtualNode is null.
     */
    if (!oldVirtualNode && newVirtualNode) {
      if (typeof newVirtualNode.type === 'function') {
        this.renderFunctionComponent(parentNode, null, newVirtualNode);
        return;
      }

      const newRealNode = this.createElement(newVirtualNode);

      newVirtualNode.realNode = newRealNode;

      // 처음 생긴 노드라면 부모의 맨 뒤에 추가합니다. (recondile 이후 reorderChildren 함수에서 위치를 변경합니다.)
      parentNode?.appendChild(newRealNode);

      this.reconcileChildren(newRealNode, parentVirtualNode, null, newVirtualNode!);
      return;
    }

    /**
     * @case 3: Replace real node in real dom tree when type is different.
     */
    if (oldVirtualNode!.type !== newVirtualNode!.type) {
      if (typeof newVirtualNode!.type === 'function') {
        parentNode.removeChild(oldVirtualNode!.realNode!);
        this.renderFunctionComponent(parentNode, null, newVirtualNode);
        return;
      }

      /**
       * @description change position of the newRealNode if the order has changed by insertBefore or appendChild
       */
      const newRealNode = parentNode.replaceChild(this.createElement(newVirtualNode!), oldVirtualNode!.realNode!);

      newVirtualNode!.realNode = newRealNode;

      this.reconcileChildren(newRealNode, parentVirtualNode, null, newVirtualNode!);
      return;
    }

    /**
     * @case 4: the case that old and new virtual nodes are same type and type is function.
     */
    if (typeof newVirtualNode!.type === 'function') {
      this.renderFunctionComponent(parentNode, oldVirtualNode, newVirtualNode);
      return;
    }

    /**
     * @description Update real dom tree when old and new virtual nodes are same type and type is not function.
     */
    const realNode: Node = (newVirtualNode!.realNode = oldVirtualNode!.realNode)!;

    if (newVirtualNode!.type === TEXT_ELEMENT) {
      realNode.textContent = String(newVirtualNode!.props.value);
    } else {
      this.reconcileChildren(realNode, parentVirtualNode, oldVirtualNode!, newVirtualNode!);
    }
  }

  /**
   * @private
   * @description apply style to real dom element
   */
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

  /**
   * @private
   * @description convert event name to normalized event name
   */
  private convertToEventName(arg: string): string {
    // 대문자 이벤트명 정규화: onClick -> click
    const eventName = arg.slice(2).toLowerCase();

    /** change 이벤트는 input 이벤트로 변환 */
    const convertedEventName = eventName === 'change' ? 'input' : eventName;

    return convertedEventName;
  }

  /**
   * @private
   * @description update virtual node props
   */
  private updateVirtualNodeProps(
    element: Node,
    prevProps: Record<string, unknown>,
    nextProps: Record<string, unknown>,
  ) {
    // Only proceed if dom is an Element (not a Text node)
    if (!(element instanceof Element)) {
      return;
    }

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

      const prevProp = prevProps[key];
      const nextProp = nextProps[key];

      if (!(key in nextProps) || prevProp !== nextProp) {
        if (key.startsWith('on') && typeof prevProp === 'function') {
          /* 이전 렌더링 시점에 달려있었던 이벤트 */
          const eventName = this.convertToEventName(key);

          el.removeEventListener(eventName, prevProp as EventListener);

          Reflect.deleteProperty(currentListeners, eventName);
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

      const prevProp = prevProps[key] as unknown as Record<string, unknown>;
      const nextProp = nextProps[key] as unknown as Record<string, unknown>;

      // style 객체는 깊이 비교가 필요하므로 제외
      if (prevProp === nextProp && (typeof nextProp !== 'object' || nextProp === null) && key !== 'style') return;

      if (key.startsWith('on')) {
        /* 이벤트: 이전 리스너가 있으면 교체 */
        const eventName = this.convertToEventName(key);

        if (typeof prevProp === 'function') {
          el.removeEventListener(eventName, prevProp as unknown as EventListener);
        }

        if (typeof nextProp === 'function') {
          el.addEventListener(eventName, nextProp);
          currentListeners[eventName] = nextProp;
        }
      } else if (key === 'style') {
        this.applyStyle(el, prevProp ?? {}, nextProp ?? ({} as Record<string, unknown>));
      } else if (key === 'className') {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        nextProp ? el.setAttribute('class', String(nextProp)) : el.removeAttribute('class');
      } else {
        /* 일반 속성: boolean true → 빈 문자열, false/null/undefined → 제거 */
        if (nextProp === null || nextProp === undefined || (nextProp as unknown as boolean) === false) {
          el.removeAttribute(key);
        } else {
          el.setAttribute(key, typeof nextProp === 'boolean' ? '' : String(nextProp));
        }
      }
    });
  }

  /**
   * @description useState
   */
  public useState<S>(defaultValue: S): [S, (value: S | ((prev: S) => S)) => void] {
    if (!this.currentRenderingComponent) {
      throw new Error('useState can only be called inside a function component.');
    }

    const hooks = (this.currentRenderingComponent.hooks ||= []);

    if (hooks.length <= this.hookIndexInEachComponent) {
      hooks.push(defaultValue);
    }

    /** 현재 이 컴포넌트의 hooks에서 지금 인덱스에 저장된 상태 */
    const state = hooks[this.hookIndexInEachComponent] as S;

    /** 클로저 인덱스 */
    const closureIndex = this.hookIndexInEachComponent;

    /**
     * 이 useState가 호출된 컴포넌트를 기억하는 클로저
     * UI에서 useState를 호출하는 시점에는 this.currentRenderingComponent가 null이기 때문에
     * 컴포넌트가 렌더링되는 시점의 컴포넌트를 클로저로 캡처
     */
    const closureRenderingComponent = this.currentRenderingComponent;

    this.hookIndexInEachComponent++;

    const setState = (updatedState: S | ((prev: S) => S)) => {
      if (typeof updatedState === 'function') {
        hooks[closureIndex] = (updatedState as (prev: S) => S)(hooks[closureIndex] as S);
      } else {
        hooks[closureIndex] = updatedState;
      }

      this.renderSubtree(closureRenderingComponent!);
    };

    return [state, setState];
  }

  /**
   * @private
   * @description schedule effect
   */
  private scheduleEffect(effect: Effect) {
    this.pendingEffectsQueue.push(() => {
      effect.cleanup?.();

      const nextCleanup = effect.callback();

      effect['cleanup'] = typeof nextCleanup === 'function' ? nextCleanup : undefined;
    });
  }

  /**
   * @private
   * @description flush effects
   * 렌더링이 끝난 이후에 실행되도록 스케줄링된 이펙트들을 한꺼번에 실행합니다. (flush - 비우다)
   */
  private flushEffects() {
    while (this.pendingEffectsQueue.length > 0) {
      this.pendingEffectsQueue.shift()?.();
    }

    this.pendingEffectsQueue = [];
  }

  /**
   * @description useEffect
   */
  public useEffect(callback: EffectCallback, deps: unknown[]) {
    if (!this.currentRenderingComponent) {
      throw new Error('useEffect can only be called inside a function component.');
    }

    const hooks = (this.currentRenderingComponent.hooks ||= []);

    // 앱이 처음 렌더링되어 가상노드의 훅에 저장될 때
    if (hooks.length <= this.hookIndexInEachComponent) {
      const effect: Effect = { callback, deps, cleanup: undefined };

      hooks.push(effect);
      this.scheduleEffect(effect);

      this.hookIndexInEachComponent++;
      return;
    }

    // 초기 렌더가 아니어서, 이미 훅에 저장되어 있는 훅이 있을 때

    /** 의존성 배열이 변경되었는지 여부 */
    let isDepsChanged = false;

    /** 현재 훅 인덱스에 저장된 이펙트 정보 */
    const currentIndexEffect = hooks[this.hookIndexInEachComponent] as Effect;

    /** 이전 의존성 배열 */
    const prevDeps = currentIndexEffect['deps'];

    /** 이전 의존성 배열이 없거나 새로운 의존성 배열이 없거나 길이가 다르면 의존성 배열이 변경되었다고 판단 */
    if (!prevDeps || !deps || prevDeps.length !== deps.length) {
      isDepsChanged = true;
    } else {
      for (let i = 0; i < prevDeps.length; i++) {
        if (!Object.is(prevDeps[i], deps[i])) {
          isDepsChanged = true;
          break;
        }
      }
    }

    if (isDepsChanged) {
      // 의존성 배열이 변경되었으므로 이펙트 정보를 업데이트
      currentIndexEffect['callback'] = callback;
      currentIndexEffect['deps'] = deps;

      // 이펙트를 다시 스케줄링
      this.scheduleEffect(currentIndexEffect);
    }

    this.hookIndexInEachComponent++;
  }

  /**
   * @description render
   */
  public render(virtualNode: VirtualNode, container: Element): void {
    this.reconcile(container, null, null, virtualNode);

    this.flushEffects();
  }
}

const freeact = new Freeact();

export default freeact;
