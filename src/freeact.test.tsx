/** @jsx freeact.createVirtualElement */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import freeact from './freeact';

describe('Freeact', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  describe('Basic Rendering', () => {
    it('should render a simple element', () => {
      const element = <div>Hello World</div>;
      freeact.render(element, container);

      expect(container.innerHTML).toBe('<div>Hello World</div>');
    });

    it('should render nested elements', () => {
      const element = (
        <div>
          <h1>Title</h1>
          <p>Paragraph</p>
        </div>
      );
      freeact.render(element, container);

      expect(container.querySelector('h1')?.textContent).toBe('Title');
      expect(container.querySelector('p')?.textContent).toBe('Paragraph');
    });

    it('should render with attributes', () => {
      const element = (
        <div id="test" className="container">
          Content
        </div>
      );
      freeact.render(element, container);

      const div = container.querySelector('div');
      expect(div?.getAttribute('id')).toBe('test');
      expect(div?.getAttribute('class')).toBe('container');
    });

    it('should render function components', () => {
      const Component = () => <div>Function Component</div>;
      freeact.render(<Component />, container);

      expect(container.innerHTML).toBe('<div>Function Component</div>');
    });

    it('should render null as empty text', () => {
      const Component = () => null;
      freeact.render(<Component />, container);

      expect(container.textContent).toBe('');
    });

    it('should render primitives as text', () => {
      const Component = () => 42;
      freeact.render(<Component />, container);

      expect(container.textContent).toBe('42');
    });
  });

  describe('useState Hook', () => {
    it('should manage state', () => {
      let setValue: ((value: number) => void) | null = null;

      const Counter = () => {
        const [count, setCount] = freeact.useState(0);
        setValue = setCount;
        return <div>{count}</div>;
      };

      freeact.render(<Counter />, container);
      expect(container.textContent).toBe('0');

      setValue!(5);
      expect(container.textContent).toBe('5');
    });

    it('should support function updater', () => {
      let increment: (() => void) | null = null;

      const Counter = () => {
        const [count, setCount] = freeact.useState(0);
        increment = () => setCount((prev) => prev + 1);
        return <div>{count}</div>;
      };

      freeact.render(<Counter />, container);
      expect(container.textContent).toBe('0');

      increment!();
      expect(container.textContent).toBe('1');

      increment!();
      expect(container.textContent).toBe('2');
    });

    it('should preserve state across re-renders', () => {
      let rerender: (() => void) | null = null;

      const Component = () => {
        const [count, setCount] = freeact.useState(10);
        const [name] = freeact.useState('Test');
        rerender = () => setCount(count);
        return (
          <div>
            {count} - {name}
          </div>
        );
      };

      freeact.render(<Component />, container);
      expect(container.textContent).toBe('10 - Test');

      rerender!();
      expect(container.textContent).toBe('10 - Test');
    });
  });

  describe('useEffect Hook', () => {
    it('should run effect after render', () => {
      const effectFn = vi.fn();

      const Component = () => {
        freeact.useEffect(() => {
          effectFn();
        }, []);
        return <div>Effect Test</div>;
      };

      freeact.render(<Component />, container);
      expect(effectFn).toHaveBeenCalledTimes(1);
    });

    it('should run cleanup on unmount', () => {
      const cleanup = vi.fn();
      const Component = () => {
        freeact.useEffect(() => {
          return cleanup;
        }, []);
        return <div>Cleanup Test</div>;
      };

      freeact.render(<Component />, container);
      expect(cleanup).not.toHaveBeenCalled();

      // Unmount by rendering null
      freeact.render(<div />, container);
      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it('should re-run effect when deps change', () => {
      const effectFn = vi.fn();
      let setValue: ((value: number) => void) | null = null;

      const Component = () => {
        const [count, setCount] = freeact.useState(0);
        setValue = setCount;

        freeact.useEffect(() => {
          effectFn(count);
        }, [count]);

        return <div>{count}</div>;
      };

      freeact.render(<Component />, container);
      expect(effectFn).toHaveBeenCalledWith(0);
      expect(effectFn).toHaveBeenCalledTimes(1);

      setValue!(1);
      expect(effectFn).toHaveBeenCalledWith(1);
      expect(effectFn).toHaveBeenCalledTimes(2);
    });

    it('should not re-run effect when deps are same', () => {
      const effectFn = vi.fn();
      let setValue: ((value: string) => void) | null = null;

      const Component = () => {
        const [name, setName] = freeact.useState('Test');
        const [count] = freeact.useState(0);
        setValue = setName;

        freeact.useEffect(() => {
          effectFn();
        }, [count]);

        return <div>{name}</div>;
      };

      freeact.render(<Component />, container);
      expect(effectFn).toHaveBeenCalledTimes(1);

      setValue!('New Name');
      expect(effectFn).toHaveBeenCalledTimes(1); // Should not run again
    });
  });

  describe('Event Handling', () => {
    it('should handle click events', () => {
      const handleClick = vi.fn();

      const Button = () => {
        return <button onClick={handleClick}>Click Me</button>;
      };

      freeact.render(<Button />, container);

      const button = container.querySelector('button')!;
      button.click();

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should update event handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      let setHandler: ((h: () => void) => void) | null = null;

      const Component = () => {
        const [handler, setH] = freeact.useState<() => void>(() => handler1);
        setHandler = setH;
        return <button onClick={handler}>Click</button>;
      };

      freeact.render(<Component />, container);

      const button = container.querySelector('button')!;
      button.click();
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(0);

      setHandler!(() => handler2);
      button.click();
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Reconciliation', () => {
    it('should update text content', () => {
      let setValue: ((value: string) => void) | null = null;

      const Component = () => {
        const [text, setText] = freeact.useState('Initial');
        setValue = setText;
        return <div>{text}</div>;
      };

      freeact.render(<Component />, container);
      expect(container.textContent).toBe('Initial');

      setValue!('Updated');
      expect(container.textContent).toBe('Updated');
    });

    it('should update attributes', () => {
      let setId: ((value: string) => void) | null = null;

      const Component = () => {
        const [id, setIdValue] = freeact.useState('id1');
        setId = setIdValue;
        return <div id={id}>Content</div>;
      };

      freeact.render(<Component />, container);
      expect(container.querySelector('div')?.getAttribute('id')).toBe('id1');

      setId!('id2');
      expect(container.querySelector('div')?.getAttribute('id')).toBe('id2');
    });

    it('should add and remove children', () => {
      let setShow: ((value: boolean) => void) | null = null;

      const Component = () => {
        const [show, setShowValue] = freeact.useState(false);
        setShow = setShowValue;
        return <div>{show ? <span>Visible</span> : null}</div>;
      };

      freeact.render(<Component />, container);
      expect(container.querySelector('span')).toBeNull();

      setShow!(true);
      expect(container.querySelector('span')?.textContent).toBe('Visible');

      setShow!(false);
      expect(container.querySelector('span')).toBeNull();
    });

    it('should replace elements with different types', () => {
      let setUseDiv: ((value: boolean) => void) | null = null;

      const Component = () => {
        const [useDiv, setUseDivValue] = freeact.useState(true);
        setUseDiv = setUseDivValue;
        return useDiv ? <div>Div Content</div> : <span>Span Content</span>;
      };

      freeact.render(<Component />, container);
      expect(container.querySelector('div')).not.toBeNull();
      expect(container.querySelector('span')).toBeNull();

      setUseDiv!(false);
      expect(container.querySelector('div')).toBeNull();
      expect(container.querySelector('span')).not.toBeNull();
    });
  });

  describe('Key-based List Rendering', () => {
    it('should render lists with keys', () => {
      const items = [
        { id: 1, text: 'Item 1' },
        { id: 2, text: 'Item 2' },
        { id: 3, text: 'Item 3' },
      ];

      const List = () => (
        <ul>
          {items.map((item) => (
            <li key={item.id}>{item.text}</li>
          ))}
        </ul>
      );

      freeact.render(<List />, container);

      const listItems = container.querySelectorAll('li');
      expect(listItems.length).toBe(3);
      expect(listItems[0].textContent).toBe('Item 1');
      expect(listItems[1].textContent).toBe('Item 2');
      expect(listItems[2].textContent).toBe('Item 3');
    });

    it('should reorder items efficiently', () => {
      let setItems: ((value: Array<{ id: number; text: string }>) => void) | null = null;

      const List = () => {
        const [items, setItemsValue] = freeact.useState([
          { id: 1, text: 'A' },
          { id: 2, text: 'B' },
          { id: 3, text: 'C' },
        ]);
        setItems = setItemsValue;

        return (
          <ul>
            {items.map((item) => (
              <li key={item.id}>{item.text}</li>
            ))}
          </ul>
        );
      };

      freeact.render(<List />, container);

      let listItems = container.querySelectorAll('li');
      expect(listItems[0].textContent).toBe('A');
      expect(listItems[1].textContent).toBe('B');
      expect(listItems[2].textContent).toBe('C');

      // Reverse the order
      setItems!([
        { id: 3, text: 'C' },
        { id: 2, text: 'B' },
        { id: 1, text: 'A' },
      ]);

      listItems = container.querySelectorAll('li');
      expect(listItems[0].textContent).toBe('C');
      expect(listItems[1].textContent).toBe('B');
      expect(listItems[2].textContent).toBe('A');
    });
  });

  describe('Styles', () => {
    it('should apply inline styles', () => {
      const element = <div style={{ color: 'red', fontSize: '16px' }}>Styled</div>;
      freeact.render(element, container);

      const div = container.querySelector('div') as HTMLElement;
      expect(div.style.color).toBe('red');
      expect(div.style.fontSize).toBe('16px');
    });

    it('should update styles', () => {
      let setColor: ((value: string) => void) | null = null;

      const Component = () => {
        const [color, setColorValue] = freeact.useState('red');
        setColor = setColorValue;
        return <div style={{ color }}>Text</div>;
      };

      freeact.render(<Component />, container);

      const div = container.querySelector('div') as HTMLElement;
      expect(div.style.color).toBe('red');

      setColor!('blue');
      expect(div.style.color).toBe('blue');
    });

    it('should remove styles', () => {
      let setHasMargin: ((value: boolean) => void) | null = null;

      const Component = () => {
        const [hasMargin, setHasMarginValue] = freeact.useState(true);
        setHasMargin = setHasMarginValue;
        return <div style={hasMargin ? { margin: '10px' } : {}}>Text</div>;
      };

      freeact.render(<Component />, container);

      const div = container.querySelector('div') as HTMLElement;
      expect(div.style.margin).toBe('10px');

      setHasMargin!(false);
      expect(div.style.margin).toBe('');
    });
  });
});
