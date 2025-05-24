import { VirtualNode, VirtualElement } from './index.d';

interface IFreeact {
  createTextElement(text: string): VirtualNode;
  createElement(type: VirtualElement, props: Record<string, unknown>): VirtualNode;
}

class Freeact implements IFreeact {
  public createTextElement(text: string): VirtualNode {
    return {
      type: 'TEXT_ELEMENT',
      props: {
        value: text,
        children: [],
      },
    };
  }

  public createElement(type: VirtualElement, props: Record<string, unknown>, ...children: unknown[]): VirtualNode {
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
}

const freeact = new Freeact();

export default freeact;
