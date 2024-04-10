# 快速上手

## 创建一个 store

在 hox 中，任意的 custom Hook，经过 `createStore` 包装后，就变成了持久化，可以在组件间进行共享的状态。

```jsx
import { useState } from 'react'
import { createStore } from 'hox'

export const [useTaskStore, TaskStoreProvider] = createStore(() => {
  const [tasks, setTasks] = useState([])

  function addTask(task) {
    setTasks(v => [...v, task])
  }

  function finishTask(task) {
    setTasks(v => v.filter(t => t !== task))
  }

  return {
    tasks,
    addTask,
    finishTask,
  }
})
```

`createStore` 会返回一个数组，里面有两个元素，你可以通过 ES6 的数组解构语法把他们解构出来，并且取成符合业务逻辑的名字，例如上面的 `useTaskStore` 和 `TaskStoreProvider`。

`TaskStoreProvider` 是状态的容器，它的底层是依赖了 React Context 所以你需要把它注入到组件树中，例如：

```jsx
<App>
  <Header />
  <TaskStoreProvider>
    <TaskList>
      <TaskItem />
      <TaskItem />
      <TaskItem />
    </TaskList>
  </TaskStoreProvider>
</App>
```

接下来可以在 `TaskList` 组件中使用 `useTaskStore` 订阅和消费 store 中的数据：

```jsx
function TaskList() {
  const { tasks } = useTaskStore()
  return (
    <>
      {tasks.map(task => (
        <TaskItem key={task.id} task={task} />
      ))}
    </>
  )
}
```

每次 TaskStore 更新时，TaskList 都会自动重新渲染，并且获取到最新的 `tasks` 数据。

> `useStore` 是一个 React Hook ，所以在使用它的时候，请遵守 React 的 [rules of hooks](https://reactjs.org/docs/hooks-rules.html) 。

我们推荐 `useXxxStore` 和 `XxxStoreProvider` 这样的命名，因为它们更加明确，但是如果你觉得它们名字太长了，也可以考虑缩写成 `useXxx` 和 `XxxProvider`。

## store 的上下文和多个实例

需要注意的是，只有 `CounterStoreProvider` 的内部节点才可以获取到它的上下文，所以在 `Header` 组件中是不可以调用 `useTaskStore` 的。如果你熟悉 React 的 Context 特性，那么这一点是很好理解的。

```jsx
<App>
  <Header />
  <TaskStoreProvider>
    <TaskList>...</TaskList>
  </TaskStoreProvider>
</App>
```

每渲染一个 `TaskStoreProvider`，就会对应的创建一个 store 的实例，基于这个特性，你可以在页面上渲染多个 StoreProvider，来实现多实例，并且根据 Context 的上下文，在子节点组件中自动地获取到对应的 store 实例：

```jsx
<TaskStoreProvider>
  <TaskList>
    ...
  </TaskList>
</TaskStoreProvider>
<TaskStoreProvider>
  <TaskList>
    ...
  </TaskList>
</TaskStoreProvider>
```

不同 StoreProvider 实例之间，数据是完全独立和隔离的，就像是同一个 React 组件的多个实例一样。

你甚至可以在 `TaskStoreProvider` 子节点中再渲染一个 `TaskStoreProvider`，根据 Context 的特性，`TaskList` 组件会自动寻找到最近的父级 Provider：

```jsx
<TaskStoreProvider>
  <TaskList>...</TaskList>
  <TaskStoreProvider>
    <TaskList>...</TaskList>
  </TaskStoreProvider>
</TaskStoreProvider>
```

当然，一般来说不太会需要这么用。

## store 之间的依赖

虽然你仍然可以按照传统的单一数据源的思想进行 store 的设计，但我们更推荐将 store 拆分成多个小部分，于是不可避免的，我们需要在多个 store 之间处理依赖关系，例如任务列表模块 `task` 依赖账户模块 `account`。

在 hox 中，处理模块之间的依赖非常简单且自然：在一个 store 中可以直接使用 `useXXXStore` 来获取另一个 store，并订阅其更新，和在组件中使用并无两样。

> 提醒：小心循环依赖！

```jsx
import { useAccountStore } from './account-store'

export const [useTaskStore, TaskStoreProvider] = createStore(() => {
  // ...
  const { user } = useAccountStore()

  function addTask(taskName) {
    setTasks(v => [
      ...v,
      {
        name: taskName,
        assignee: user.id,
      },
    ])
  }

  // ...
})
```

## 传递额外的参数给 StoreProvider

你可以通过 `props` 传递额外的参数给 StoreProvider，然后再 store 的 Hook 中，通过第一个参数 `props` 获取到，就像写 React 组件一样：

```jsx
<CounterStoreProvider initialCount={42}>{/* ... */}</CounterStoreProvider>
```

```jsx
type Props = {
  initialCount: number,
}

const [useCounterStore, CounterStoreProvider] = createStore(function (
  props: Props
) {
  const [count, setCount] = useState(props.initialCount)
  return { count, setCount }
})
```

## 全局 store

其实并不是所有的 store 都需要有一个作用域、需要支持多个实例，在一个真实的项目中，大部分的 store 可能都是全局性的，而如果你每次都手动添加 StoreProvider，可能会感到崩溃：

```jsx
<AccountStoreProvider>
  <TaskStoreProvider>
    <FooStoreProvider>
      <BarStoreProvider>
        <App />
      </BarStoreProvider>
    </FooStoreProvider>
  </TaskStoreProvider>
</AccountStoreProvider>
```

因此，hox 提供了另一种类型的 store：全局 store。

你可以通过 `createGlobalStore` 来创建一个全局 `store`：

```js
import { createGlobalStore } from 'hox'

const [useAccountStore, getAccountStore] = createGlobalStore(() => {
  // ...
})
```

和 `createStore` 类似，`createGlobalStore` 返回了一个数组：

第一个元素是用来订阅 store 的 Hook 函数，关于它的用法，这里就不再介绍了，和普通 store 是一样的。

而第二个元素有些区别，是一个静态获取函数 `getXxxStore`，这里先卖个关子，下面再具体介绍。

可以发现，对于全局 store，并没有对应的 StoreProvider 组件，因此你不需要每次创建一个 store，就手动添加一层 Provider。不过，为了让全局 store 能够正常注册，你需要在整个 React 应用的最外层用 `HoxRoot` 包裹一下：

```jsx
import { HoxRoot } from 'hox'

ReactDOM.render(
  <HoxRoot>
    <App />
  </HoxRoot>,
  domContainer
)
```

你可以把 `HoxRoot` 想象成所有全局 store 的统一的 StoreProvider，可以通过它一次性地把所有全局 store 都注册掉。

回到刚刚提到的 `getXxxStore` 函数，它的作用是一次性地读取 store 当前最新的值，而不会触发持续的订阅，因为它不是 Hook，所以并不需要一定在 React 组件渲染函数中调用，你可以在任何地方、任何时候调用它：

```js
export function log(message) {
  const { user } = getAccountStore()
  report.requestApi({
    message,
    userId: user.id,
  })
}
```
