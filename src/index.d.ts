/**
 * @type {Key}
 * key of the virtual node
 * we can recognize the uniqueness of the virtual node by the key
 */
type Key = string | number | null;

/**
 * @type {Props}
 * properties of the virtual node
 * @field key - key of the virtual node
 * @field children - children of the virtual node
 * @field [key: string]: unknown - other props of the virtual node
 */
type Props = {
  key?: Key;
  children: VirtualNode[];
  [key: string]: unknown;
};

/**
 * @type {FunctionComponent}
 * function component of the virtual DOM tree
 * @param {Props} props - properties of the function component
 * @returns {VirtualNode | string | null} - virtual node of the function component to be rendered
 */
type FunctionComponent = (props: Props) => VirtualNode | string | null;

/**
 * @type {VirtualElement}
 * it means string (the element tag name) or function component of the virtual DOM tree
 */
type VirtualElement = FunctionComponent | string;

/**
 * @type {VirtualNode}
 * virtual node of the DOM tree
 * @field type - type of the virtual node (element name or function component)
 * @field props - properties of the virtual node
 * @field realNode - real node of the virtual node
 * @field child - child of the virtual node
 * @field hooks - state or effect functions of the virtual node
 * @field parentRealNode - real node of the parent of the virtual node
 * @field parentVirtualNode - virtual node of the parent of the virtual node
 */
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
 * @field callback - callback of useEffect hook
 * @field cleanup - cleanup function of useEffect hook
 * @field deps - dependencies of useEffect hook
 */
type Effect = {
  callback: EffectCallback;
  cleanup?: () => void;
  deps: unknown[];
};

export type { VirtualNode, VirtualElement, Key, EffectCallback, Effect };
