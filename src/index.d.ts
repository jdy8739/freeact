type FunctionComponent = (props: unknown) => VirtualNode | null;

type VirtualElement = FunctionComponent | string | symbol;

type VirtualNode = {
  type: VirtualElement;
  props: {
    children: VirtualNode[];
    [key: string]: unknown;
  };
};

export type { VirtualNode, VirtualElement };
