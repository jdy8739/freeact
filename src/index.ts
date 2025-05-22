import { VirtualNode, VirtualElement } from './index.d';
import { TEXT_ELEMENT } from './constant';

interface IFreeact {
  createTextElement(text: string): VirtualNode;
  createElement(type: VirtualElement, props: Record<string, unknown>): VirtualNode;
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

  public createElement(type: VirtualElement, props: Record<string, unknown>, ...children: VirtualNode[]): VirtualNode {
    const childrenElements = children
      .filter((child) => Boolean(child))
      .map((child) => {
        if (child.type === TEXT_ELEMENT) {
          return this.createTextElement(String(child.props.value));
        }

        return child as VirtualNode;
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
