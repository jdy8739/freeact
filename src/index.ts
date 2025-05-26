import freeact from './freeact';

const app = document.getElementById('app');

freeact.render(
  freeact.createVirtualElement(
    'section',
    {},
    freeact.createVirtualElement('h1', { style: 'color: blue' }, 'Hello, World!'),
    freeact.createVirtualElement(
      'div',
      null,
      freeact.createVirtualElement('h2', { style: 'color: red' }, 'Hi, World!'),
    ),
  ),
  app!,
);
