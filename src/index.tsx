/* eslint-disable @typescript-eslint/no-explicit-any */
/** @jsx freeact.createVirtualElement */
import freeact from './freeact';

const root = document.getElementById('root')!;

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

const TodoItem = ({
  todo,
  key,
  onToggle,
  onDelete,
}: {
  todo: Todo;
  key: number;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}) => {
  return (
    <div
      // 강제로 넣어주어야 한다...
      // it must be forced to put in...
      key={key}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#fff',
        transition: 'background-color 0.2s',
      }}
    >
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
        style={{
          marginRight: '12px',
          transform: 'scale(1.2)',
          cursor: 'pointer',
        }}
      />
      <span
        style={{
          flex: 1,
          textDecoration: todo.completed ? 'line-through' : 'none',
          color: todo.completed ? '#888' : '#333',
          fontSize: '16px',
          lineHeight: '1.5',
        }}
      >
        {todo.text}
      </span>
      <button
        onClick={() => onDelete(todo.id)}
        style={{
          background: 'none',
          border: 'none',
          color: '#ff4757',
          cursor: 'pointer',
          fontSize: '18px',
          padding: '4px 8px',
          borderRadius: '4px',
          transition: 'background-color 0.2s',
        }}
        onMouseOver={(e: any) => {
          (e.target as HTMLElement).style.backgroundColor = '#ffe0e0';
        }}
        onMouseOut={(e: any) => {
          (e.target as HTMLElement).style.backgroundColor = 'transparent';
        }}
      >
        ×
      </button>
    </div>
  );
};

const TodoList = () => {
  const [todos, setTodos] = freeact.useState<Todo[]>([]);

  const [inputValue, setInputValue] = freeact.useState('');

  const [filter, setFilter] = freeact.useState<'all' | 'active' | 'completed'>('all');

  const addTodo = () => {
    if (inputValue.trim()) {
      const newTodo: Todo = {
        id: Date.now(),
        text: inputValue.trim(),
        completed: false,
      };
      setTodos((prev) => [...prev, newTodo]);
      setInputValue('');
    }
  };

  const toggleTodo = (id: number) => {
    setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)));
  };

  const deleteTodo = (id: number) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  const clearCompleted = () => {
    setTodos((prev) => prev.filter((todo) => !todo.completed));
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const activeCount = todos.filter((todo) => !todo.completed).length;
  const completedCount = todos.filter((todo) => todo.completed).length;

  return (
    <div
      style={{
        maxWidth: '600px',
        margin: '40px auto',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: '#667eea',
          color: 'white',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            margin: '0 0 8px 0',
            fontSize: '28px',
            fontWeight: '600',
          }}
        >
          Todo List
        </h1>
        <p
          style={{
            margin: '0',
            opacity: '0.9',
            fontSize: '14px',
          }}
        >
          {activeCount} active, {completedCount} completed
        </p>
      </div>

      {/* Input Section */}
      <div
        style={{
          padding: '20px',
          backgroundColor: 'white',
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '12px',
          }}
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e: any) => setInputValue(e.target.value)}
            onKeyPress={(e: any) => e.key === 'Enter' && addTodo()}
            placeholder="Add a new todo..."
            style={{
              flex: 1,
              padding: '12px 16px',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e: any) => {
              e.target.style.borderColor = '#667eea';
            }}
            onBlur={(e: any) => {
              e.target.style.borderColor = '#e0e0e0';
            }}
          />
          <button
            onClick={addTodo}
            disabled={!inputValue.trim()}
            style={{
              padding: '12px 24px',
              backgroundColor: inputValue.trim() ? '#667eea' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e: any) => {
              if (inputValue.trim()) {
                e.target.style.backgroundColor = '#5a6fd8';
              }
            }}
            onMouseOut={(e: any) => {
              if (inputValue.trim()) {
                e.target.style.backgroundColor = '#667eea';
              }
            }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          backgroundColor: 'white',
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        {[
          { key: 'all', label: 'All', count: todos.length },
          { key: 'active', label: 'Active', count: activeCount },
          { key: 'completed', label: 'Completed', count: completedCount },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key as 'all' | 'active' | 'completed')}
            style={{
              flex: 1,
              padding: '16px',
              border: 'none',
              backgroundColor: filter === key ? '#667eea' : 'transparent',
              color: filter === key ? 'white' : '#666',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e: any) => {
              if (filter !== key) {
                e.target.style.backgroundColor = '#f0f0f0';
              }
            }}
            onMouseOut={(e: any) => {
              if (filter !== key) {
                e.target.style.backgroundColor = 'transparent';
              }
            }}
          >
            {label} ({count ? count : '0'})
          </button>
        ))}
      </div>

      {/* Todo Items */}
      <div
        style={{
          maxHeight: '400px',
          overflowY: 'auto',
        }}
      >
        {filteredTodos.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: '#888',
              fontSize: '16px',
            }}
          >
            {filter === 'all'
              ? 'No todos yet. Add one above!'
              : filter === 'active'
                ? 'No active todos.'
                : 'No completed todos.'}
          </div>
        ) : (
          filteredTodos.map((todo) => (
            <TodoItem key={todo.id} todo={todo} onToggle={toggleTodo} onDelete={deleteTodo} />
          ))
        )}
      </div>

      {/* Footer */}
      {completedCount > 0 && (
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: 'white',
            borderTop: '1px solid #e0e0e0',
            textAlign: 'center',
          }}
        >
          <button
            onClick={clearCompleted}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              border: '1px solid #ff4757',
              color: '#ff4757',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e: any) => {
              e.target.style.backgroundColor = '#ff4757';
              e.target.style.color = 'white';
            }}
            onMouseOut={(e: any) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#ff4757';
            }}
          >
            Clear completed ({completedCount})
          </button>
        </div>
      )}
    </div>
  );
};

const App = () => {
  return <TodoList />;
};

freeact.render(<App />, root);
