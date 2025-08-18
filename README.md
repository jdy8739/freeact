# Freeact

React 16 버전을 기반으로 한 DFS(Depth-First Search) 방식의 가상 DOM 구현체입니다. Fiber 아키텍처 없이 기본적인 React 기능들을 구현하여 상태 관리와 컴포넌트 렌더링의 핵심 개념을 이해할 수 있도록 설계되었습니다.

Freeact로 만든 데모 앱을 방문하려면 우클릭 후 "새 탭에서 열기"를 선택하세요.
<a href="https://freeact.netlify.app/" target="_blank">Freeact로 구현한 TODO 앱</a>

아래는 Freeact를 구현하면서 얻은 인사이트를 공유하기 위해 작성한 블로그 글입니다.

[React 직접 구현해 본 후기](https://logdo.netlify.app/react/) //

## 프로젝트 개요

### 구현된 기능

- **가상 DOM**: DFS 방식의 가상 DOM 트리 구조
- **상태 관리**: useState 훅을 통한 컴포넌트 상태 관리
- **이펙트 처리**: useEffect 훅을 통한 사이드 이펙트 관리
- **이벤트 처리**: DOM 이벤트 리스너 등록 및 관리
- **재조정(Reconciliation)**: 이전 가상 DOM과 새로운 가상 DOM 비교를 통한 효율적인 업데이트
- **키 기반 최적화**: 컴포넌트 키를 활용한 리스트 렌더링 최적화

### 구현되지 않은 기능

- **동시성 처리**: Fiber 아키텍처 없이 단일 스레드 렌더링
- **배칭 처리**: 상태 업데이트 배칭 최적화
- **이벤트 우선순위**: 이벤트 처리 우선순위 조절
- **렌더링 중단**: 렌더링 작업의 중단 및 재개

## 기술 스택

### 개발 환경

- **TypeScript**: 정적 타입 검사를 통한 안정성 확보
- **ESBuild**: 빠른 번들링을 위한 빌드 도구
- **ESLint**: 코드 품질 관리
- **Prettier**: 코드 포맷팅

### 핵심 라이브러리

- **TypeScript 5.8.3**: 타입 안전성과 개발자 경험 향상
- **ESBuild 0.25.4**: 빠른 JavaScript/TypeScript 번들링

## 아키텍처

### 클래스 기반 설계

프로젝트는 `Freeact` 클래스를 중심으로 설계되어 로직의 캡슐화를 수행합니다:

```typescript
class Freeact implements IFreeact {
  private currentRenderingComponent: VirtualNode | null = null;
  private eventListeners = new WeakMap<HTMLElement, Record<string, EventListener>>();
  private hookIndex = 0;
  private pendingEffectsQueue: (() => void)[] = [];

  // 핵심 메서드들
  public createVirtualElement(...)
  public render(...)
  public useState(...)
  public useEffect(...)
}
```

### 핵심 컴포넌트

#### VirtualNode

가상 DOM 노드를 표현하는 핵심 데이터 구조:

```typescript
type VirtualNode = {
  type: VirtualElement;
  props: Props;
  realNode?: Node | null;
  child?: VirtualNode | null;
  hooks?: unknown[];
  parentRealNode?: Node | null;
  parentVirtualNode?: VirtualNode | null;
};
```

#### 상태 관리

- `currentRenderingComponent`: 현재 렌더링 중인 컴포넌트 추적
- `hookIndex`: 훅 호출 순서 관리
- `pendingEffectsQueue`: 렌더링 후 실행될 이펙트 큐

#### 재조정 알고리즘

1. **타입 비교**: 노드 타입이 변경된 경우 새 노드로 교체
2. **Props 업데이트**: 속성 변경사항을 실제 DOM에 반영
3. **자식 노드 재조정**: 키 기반 비교를 통한 효율적인 자식 노드 업데이트

## 사용법

### 기본 렌더링

```typescript
import freeact from './freeact';

const App = () => {
  const [count, setCount] = freeact.useState(0);

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
};

freeact.render(<App />, document.getElementById('root'));
```

### 이펙트 사용

```typescript
const Component = () => {
  const [data, setData] = freeact.useState(null);

  freeact.useEffect(() => {
    // 컴포넌트 마운트 시 실행
    fetchData().then(setData);

    return () => {
      // 클린업 함수
      console.log('Component unmounted');
    };
  }, []); // 빈 의존성 배열

  return <div>{data}</div>;
};
```

## 개발 및 빌드

### 개발 서버 실행

```bash
npm start
```

### 프로덕션 빌드

```bash
npm run build
```

## 프로젝트 구조

```
src/
├── freeact.ts      # 핵심 FreeAct 라이브러리 구현
├── index.d.ts      # TypeScript 타입 정의
└── index.tsx       # 데모 애플리케이션

dist/               # 빌드 출력 디렉토리
```

## 제한사항

1. **동시성 부재**: Fiber 아키텍처가 없어 렌더링 작업을 중단할 수 없음
2. **단일 스레드**: 모든 렌더링 작업이 메인 스레드에서 실행됨
3. **배칭 미지원**: 상태 업데이트가 즉시 반영됨
4. **메모리 사용량**: 대규모 애플리케이션에서 메모리 효율성 제한

## 학습 목적

이 프로젝트는 React의 핵심 개념들을 이해하기 위한 교육용 구현체입니다:

- 가상 DOM의 동작 원리
- 상태 관리와 훅 시스템
- 컴포넌트 재조정 과정
- 이벤트 처리 메커니즘

Freeact는 React와 동일한 기능 및 성능을 보장하지 않습니다. 실제 프로덕션 환경에서는 React를 사용하세요.
