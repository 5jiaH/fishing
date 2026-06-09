/** 高德 JSAPI 2.0（运行时由 loader 注入，仅作类型占位） */
declare namespace AMap {
  class Map {
    constructor (container: string | HTMLElement, opts?: Record<string, unknown>)
    destroy (): void
  }
  class Marker {
    constructor (opts: Record<string, unknown>)
    setMap (map: Map | null): void
    destroy (): void
  }
  class Icon {
    constructor (opts: Record<string, unknown>)
  }
  class Size {
    constructor (width: number, height: number)
  }
  class Pixel {
    constructor (x: number, y: number)
  }
}
