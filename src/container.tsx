type Subscriber<T> = (data: T) => void

export class Container<T = unknown, P = {}> {
  constructor(public hook: (props: P) => T) {}
  subscribers = new Set<Subscriber<T>>()
  data!: T

  notify() {
    for (const subscriber of this.subscribers) {
      subscriber(this.data)
    }
  }
}
