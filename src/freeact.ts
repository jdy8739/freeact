import { VirtualNode, VirtualElement } from './index.d';

const TEXT_ELEMENT = 'TEXT_ELEMENT';

interface IFreeact {
  createTextElement(text: string): VirtualNode;
  createVirtualElement(type: VirtualElement, props: Record<string, unknown>): VirtualNode;
  render(element: VirtualNode, container: Element): void;
}

class Freeact implements IFreeact {
  private rootOfVirtualDomTree: VirtualNode | null = null;

  public createTextElement(text: string): VirtualNode {
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
    props: Record<string, unknown>,
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
        children: childrenElements,
      },
    };
  }

  private createElement(element: VirtualNode): Text | HTMLElement {
    if (element.type === TEXT_ELEMENT) {
      return document.createTextNode(String(element.props.value));
    }

    return document.createElement(element.type as string);
  }

  private reconcileChildren(
    parantNode: Node,
    oldVirtualChildren: VirtualNode[],
    newVirtualChildren: VirtualNode[],
  ): void {
    const maxLength = Math.max(oldVirtualChildren.length, newVirtualChildren.length);

    for (let i = 0; i < maxLength; i++) {
      this.reconcile(parantNode, oldVirtualChildren[i] ?? null, newVirtualChildren[i]);
    }
  }

  // Run diffing algorithm to update real dom tree.
  private reconcile(parantNode: Node, oldVirtualNode: VirtualNode | null, newVirtualNode: VirtualNode | null): void {
    if (!oldVirtualNode && !newVirtualNode) {
      return;
    }

    // Remove real node in real dom tree when newVirtualNode is null.
    if (oldVirtualNode && !newVirtualNode) {
      parantNode.removeChild(oldVirtualNode.realNode!);
      return;
    }

    // Add real node in real dom tree when oldVirtualNode is null.
    if (!oldVirtualNode && newVirtualNode) {
      const newRealNode = this.createElement(newVirtualNode);

      newVirtualNode.realNode = newRealNode;

      parantNode.appendChild(newRealNode);

      this.reconcileChildren(newRealNode, [], newVirtualNode!.props.children);
      return;
    }

    // Replace real node in real dom tree when type is different.
    if (oldVirtualNode!.type !== newVirtualNode!.type) {
      const newRealNode = this.createElement(newVirtualNode!);

      newVirtualNode!.realNode = newRealNode;

      parantNode.replaceChild(newRealNode, oldVirtualNode!.realNode!);

      this.reconcileChildren(newRealNode, [], newVirtualNode!.props.children);
      return;
    }

    // Update real dom tree when old and new virtual nodes are same type.
    if (newVirtualNode!.type === TEXT_ELEMENT) {
      parantNode.textContent = String(newVirtualNode!.props.value);
    } else {
      this.reconcileChildren(parantNode, oldVirtualNode!.props.children, newVirtualNode!.props.children);
    }
  }

  private initializeVirtualDomTree(virtualNode: VirtualNode, container: Element): void {
    const node = this.createElement(virtualNode);

    if (virtualNode.type === TEXT_ELEMENT) {
      container.appendChild(node);
      return;
    }

    const clonedProps = { ...virtualNode.props };

    const isChildrenDeleted = Reflect.deleteProperty(clonedProps, 'children');

    if (!isChildrenDeleted) {
      throw new Error('Children delete failed');
    }

    for (const key in clonedProps) {
      const element = node as HTMLElement;
      element.setAttribute(key, String(clonedProps[key]));
    }

    for (const child of virtualNode.props.children) {
      this.render(child, node as Element);
    }

    container.appendChild(node);
  }

  public render(virtualNode: VirtualNode, container: Element): void {
    if (!this.rootOfVirtualDomTree) {
      this.initializeVirtualDomTree(virtualNode, container);
      return;
    }

    this.reconcile(container, this.rootOfVirtualDomTree, virtualNode);
    this.rootOfVirtualDomTree = virtualNode;
  }
}

const freeact = new Freeact();

export default freeact;
