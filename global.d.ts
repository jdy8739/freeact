// global.d.ts

// jsx 타입 인식하게 하는 법
// 2. tsconfig.json 에서 compilerOptions > jsx": "react" 설정
// 3. tsconfig.json 에서 include: ["src", "global.d.ts"] 설정
// 4. 아래처럼 export {} 추가

export {};

/** tsx 파일에서 jsx 타입을 사용할 수 있도록 전역 타입 선언 */
declare global {
  namespace JSX {
    interface IntrinsicElements {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [elemName: string]: any;
    }
  }
}
