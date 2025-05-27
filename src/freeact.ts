/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { VirtualNode, VirtualElement, Key } from './index.d';

const TEXT_ELEMENT = 'TEXT_ELEMENT';

interface IFreeact {
  createVirtualElement(type: VirtualElement, props: Record<string, unknown>): VirtualNode;
  render(element: VirtualNode, container: Element): void;
}

class Freeact implements IFreeact {
  private virtualRootNode: VirtualNode | null = null;

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
    const childrenElements = children
      .filter((child) => Boolean(child))
      .map((child) => {
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
    oldVirtualNode: VirtualNode | null,
    newVirtualNode: VirtualNode | null,
  ): void {
    // Previously rendered virtual node by function component.
    const oldRenderedVirtualNode = oldVirtualNode?.child ?? null;

    let renderedVirtualNode: VirtualNode = (newVirtualNode?.type as Function)(newVirtualNode?.props);

    if (!renderedVirtualNode) {
      this.reconcile(parentNode, oldRenderedVirtualNode, null);
      return;
    }

    if (typeof renderedVirtualNode !== 'object') {
      renderedVirtualNode = this.createTextElement(String(renderedVirtualNode));
    }

    // Save child data for next reconcile.
    newVirtualNode!.child = renderedVirtualNode as VirtualNode;

    console.log(parentNode, oldRenderedVirtualNode, renderedVirtualNode);

    this.reconcile(parentNode, oldRenderedVirtualNode, renderedVirtualNode);

    newVirtualNode!.realNode = renderedVirtualNode.realNode;
  }

  private reconcileOldAndNewChildrenByCompare(
    parentNode: Node,
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

      console.log(parentNode, oldChild, newChild);

      this.reconcile(parentNode, oldChild, newChild);

      // Remove old virtual child from map.
      oldChildrenMap.delete(newChildKey);
    }

    // Remove remaining old virtual children from real dom tree.
    for (const key of oldChildrenMap.keys()) {
      this.reconcile(parentNode, oldChildrenMap.get(key)!, null);
    }
  }

  private reconcileChildren(
    parentNode: Node,
    oldVirtualChildren: VirtualNode[],
    newVirtualChildren: VirtualNode[],
  ): void {
    this.reconcileOldAndNewChildrenByCompare(parentNode, oldVirtualChildren, newVirtualChildren);
    //
  }

  // Run diffing algorithm to update real dom tree.
  private reconcile(parentNode: Node, oldVirtualNode: VirtualNode | null, newVirtualNode: VirtualNode | null): void {
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
        this.renderComponent(parentNode, null, newVirtualNode);
        return;
      }

      const newRealNode = this.createElement(newVirtualNode);

      newVirtualNode.realNode = newRealNode;

      parentNode.appendChild(newRealNode);

      this.reconcileChildren(newRealNode, [], newVirtualNode!.props.children);
      return;
    }

    // Replace real node in real dom tree when type is different.
    if (oldVirtualNode!.type !== newVirtualNode!.type) {
      if (typeof newVirtualNode!.type === 'function') {
        parentNode.removeChild(oldVirtualNode!.realNode!);
        this.renderComponent(parentNode, null, newVirtualNode);
        return;
      }

      const newRealNode = this.createElement(newVirtualNode!);

      newVirtualNode!.realNode = newRealNode;

      parentNode.replaceChild(newRealNode, oldVirtualNode!.realNode!);

      this.reconcileChildren(newRealNode, [], newVirtualNode!.props.children);
      return;
    }

    // Render component when type is function.
    if (typeof newVirtualNode!.type === 'function') {
      this.renderComponent(parentNode, oldVirtualNode, newVirtualNode);
      return;
    }

    // Update real dom tree when old and new virtual nodes are same type.
    if (newVirtualNode!.type === TEXT_ELEMENT) {
      parentNode.textContent = String(newVirtualNode!.props.value);
    } else {
      console.log('!!@@', parentNode);
      this.reconcileChildren(parentNode, oldVirtualNode!.props.children, newVirtualNode!.props.children);
    }
  }

  public render(virtualNode: VirtualNode, container: Element): void {
    console.log('container: ', container);
    this.reconcile(container, this.virtualRootNode, virtualNode);

    this.virtualRootNode = virtualNode;
  }
}

const freeact = new Freeact();

export default freeact;
