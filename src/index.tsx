/** @jsx freeact.createVirtualElement */
import freeact from './freeact';

const root = document.getElementById('root')!;

const Text = ({ text }: { text: string }) => {
  return <h1>{text}</h1>;
};

function Counter() {
  const [count, setCount] = freeact.useState(0);

  return (
    <div>
      <button
        onClick={() => setCount(count + 1)}
        style={{
          backgroundColor: count % 2 === 0 ? 'red' : 'blue',
        }}
      >
        Click me {count}
      </button>
    </div>
  );
}

const App = () => {
  return (
    <section>
      <Text text="Hello Freeact" />

      {[1, 2, 3].map((key) => (
        <Counter key={key} />
      ))}
    </section>
  );
};

freeact.render(<App />, root);
