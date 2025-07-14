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
  hooks?: unknown[];
  parentRealNode?: Node | null;
  parentVirtualNode?: VirtualNode | null;
};

/**
 * @type {EffectCallback}
 * callback of useEffect hook
 */
type EffectCallback = () => void | (() => void);

/**
 * @type {Effect}
 * parameters of useEffect hook and cleanup function
 * callback - callback of useEffect hook
 * cleanup - cleanup function of useEffect hook
 * deps - dependencies of useEffect hook
 */
type Effect = {
  callback: EffectCallback;
  cleanup?: () => void;
  deps: unknown[];
};

export type { VirtualNode, VirtualElement, Key, EffectCallback, Effect };
