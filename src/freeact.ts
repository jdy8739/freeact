import { VirtualNode, VirtualElement } from './index.d';

const TEXT_ELEMENT = 'TEXT_ELEMENT';

interface IFreeact {
  createTextElement(text: string): VirtualNode;
  createVirtualElement(type: VirtualElement, props: Record<string, unknown>): VirtualNode;
  render(element: VirtualNode, container: Element): void;
}

class Freeact implements IFreeact {
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

  public render(virtualNode: VirtualNode, container: Element): void {
    const node = this.createElement(virtualNode);

    if (virtualNode.type === TEXT_ELEMENT) {
      container.appendChild(node);
      return;
    }

    const props = { ...virtualNode.props };

    const isChildrenDeleted = Reflect.deleteProperty(props, 'children');

    if (!isChildrenDeleted) {
      throw new Error('Children delete failed');
    }

    for (const key in props) {
      const element = node as HTMLElement;
      element.setAttribute(key, String(props[key]));
    }

    for (const child of virtualNode.props.children) {
      this.render(child, node as Element);
    }

    container.appendChild(node);
  }
}

const freeact = new Freeact();

export default freeact;
