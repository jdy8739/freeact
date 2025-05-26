type Key = string | number | null;

type Props = {
  key?: Key;
  children: VirtualNode[];
  [key: string]: unknown;
};

type FunctionComponent = (props: Props) => VirtualNode | string | null;

type VirtualElement = FunctionComponent | string;

type VirtualNode = {
  type: VirtualElement;
  props: Props;
  realNode?: Node | null;
  child?: VirtualNode | null;
};

export type { VirtualNode, VirtualElement, Key };
