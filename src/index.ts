import freeact from './freeact';

const app = document.getElementById('app');

function Counter() {
  const [count, setCount] = freeact.useState(0);

  return freeact.createVirtualElement(
    'div',
    {
      style: {
        backgroundColor: 'blue',
        padding: '10px',
        borderRadius: '5px',
        border: '1px solid black',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 'bold',
        color: 'white',
      },
    },
    freeact.createVirtualElement('button', { onclick: () => setCount(count + 1) }, `Click me ${count}`),
  );
}

freeact.render(freeact.createVirtualElement(Counter), app!);
