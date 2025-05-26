import freeact from './freeact';

const app = document.getElementById('app');

// freeact.render(
//   freeact.createVirtualElement(
//     'section',
//     {},
//     freeact.createVirtualElement('h1', { style: 'color: blue' }, 'Hello, World!'),
//     freeact.createVirtualElement(
//       'div',
//       null,
//       freeact.createVirtualElement('h2', { style: 'color: red' }, 'Hi, World!'),
//     ),
//   ),
//   app!,
// );

function Hello(props: any) {
  return freeact.createVirtualElement('h1', null, 'Hello ', props.name);
}

const v1 = freeact.createVirtualElement(Hello, { name: 'React' });
freeact.render(v1, app!);

setTimeout(() => {
  const v2 = freeact.createVirtualElement(Hello, { name: 'World' });
  freeact.render(v2, app!);
}, 1000);
