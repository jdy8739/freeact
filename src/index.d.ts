type FunctionComponent = (props: unknown) => VirtualNode | null;

const TEXT_ELEMENT = Symbol('TEXT_ELEMENT');

type VirtualElement = FunctionComponent | string | TEXT_ELEMENT;

type VirtualNode = {
  type: VirtualElement;
  props: {
    children: VirtualNode[];
    [key: string]: unknown;
  };
};

export type { VirtualNode, VirtualElement };
