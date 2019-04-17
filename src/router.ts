import pathToRegexp from 'path-to-regexp'
import { createMatcher } from './matcher'
import { inBrowser } from './util/dom'
import { assert } from './util/warn'
import { cleanPath } from './util/path'
import { START } from './util/route'
import { supportsPushState } from './util/push-state'
import { normalizeLocation } from './util/location'

import { HashHistory } from './history/hash'
import { HTML5History } from './history/html5'
import { AbstractHistory } from './history/abstract'

const isWeex = false

export class Router  {

  fullpath: renderToString
  component: null | ComponentInterface
  RouterView: ComponentInterface
  forceUpdate: null | Function

  etsx: any;

  options: Router.Options
  mode: Router.mode;
  history: HashHistory | HTML5History | AbstractHistory;
  matcher: Matcher;
  fallback: boolean;
  beforeHooks: Router.NavigationGuard[];
  resolveHooks: Router.NavigationGuard[];
  afterHooks: Router.AfterNavigationHook[];

  constructor(options?: Router.Options) {
    this.options = options || {}
    this.beforeHooks = []
    this.resolveHooks = []
    this.afterHooks = []
    /**
     * 创建路由映射表
     */
    this.matcher = createMatcher(this.options.routes || [], this)

    if (this.options.mode) {
      this.mode = this.options.mode
    } else if (isWeex) {
      this.mode = 'weex'
    } else if (inBrowser) {
      this.mode = this.options.mode || 'history'
      this.fallback = this.mode === 'history' && !supportsPushState && this.options.fallback !== false
      if (this.fallback) {
        this.mode = 'hash'
      }
    } else {
      this.mode = 'abstract'
    }

    switch (this.mode) {
      // case 'weex':
      //   this.history = new WeexHistory(this, this.options.base)
      //   break
      case 'history':
        this.history = new HTML5History(this, this.options.base)
        break
      // case 'hash':
      //   this.history = new HashHistory(this, this.options.base, this.fallback)
      //   break
      case 'abstract':
        this.history = new AbstractHistory(this, this.options.base)
        break
      default:
        if (process.env.NODE_ENV !== 'production') {
          assert(false, `invalid mode: ${this.mode}`)
        }
    }
  }
  beforeEach(guard: Router.NavigationGuard): Router.unHook {
    return registerHook(this.beforeHooks, guard)
  }

  beforeResolve(guard: Router.NavigationGuard): Router.unHook {
    return registerHook(this.resolveHooks, guard)
  }

  afterEach(hook: Router.AfterNavigationHook): Router.unHook {
    return registerHook(this.afterHooks, hook)
  }

  onReady(cb: Router.ReadyHandler, errorCb?: Router.ErrorHandler): void {
    this.history.onReady(cb, errorCb)
  }

  onError(errorCb: Router.ErrorHandler): void {
    this.history.onError(errorCb)
  }

  push(location: RawLocation, onComplete?: Router.CompleteHandler, onAbort?: Router.ErrorHandler): void {
    this.history.push(location, onComplete, onAbort)
  }

  replace(location: RawLocation, onComplete?: Router.CompleteHandler, onAbort?: Router.ErrorHandler): void {
    this.history.replace(location, onComplete, onAbort)
  }
  /**
   * 去到
   * @param n 去到第几栈
   */
  go(n: number): void {
    this.history.go(n)
  }
  /**
   * 后退
   */
  back(): void {
    this.go(-1)
  }
  /**
   * 向前
   */
  forward(): void {
    this.go(1)
  }
  currentRoute(): Route | void {
    return this.history && this.history.current
  }
  getMatchedComponents(to?: RawLocation | Route): any[] {
    console.log('getMatchedComponents')
    const route: any = to
      ? to.matched
        ? to
        : this.resolve(to).route
      : this.currentRoute
    if (!route) {
      return []
    }
    return [].concat.apply([], route.matched.map((m) => {
      console.log(99988,m);
      return Object.keys(m.components).map((key) => {
        return m.components[key]
      })
    }))
  }
  resolve(
    to: RawLocation,
    current?: Route,
    append?: boolean,
  ): {
    location: Location,
    route: Route,
    href: string,
    // for backwards compat
    normalizedTo: Location,
    resolved: Route,
  } {
    current = current || this.history.current
    const location = normalizeLocation(
      to,
      current,
      append,
      this,
    )
    const route = this.match(location, current)
    const fullPath = route.redirectedFrom || route.fullPath
    const base = this.history.base
    const href = createHref(base, fullPath, this.mode)
    return {
      location,
      route,
      href,
      // for backwards compat
      normalizedTo: location,
      resolved: route,
    }
  }
  /**
   * 路由匹配
   * @param raw 原始路径
   * @param current 当前路由
   * @param redirectedFrom 来源路由
   */
  match(
    raw: RawLocation,
    current?: Route,
    redirectedFrom?: EtsxLocation,
  ): Route {
    return this.matcher.match(raw, current, redirectedFrom)
  }

  addRoutes(routes: Router.Config[]) {
    this.matcher.addRoutes(routes)
    if (this.history.current !== START) {
      this.history.transitionTo(this.history.getCurrentLocation())
    }
  }
}

function createHref(base: string, fullPath: string, mode: Router.mode) {
  const path = mode === 'hash' ? '#' + fullPath : fullPath
  return base ? cleanPath(base + '/' + path) : path
}

function registerHook(list: Array<Router.NavigationGuard | Router.AfterNavigationHook>, fn: Router.NavigationGuard | Router.AfterNavigationHook): Router.unHook {
  if (Array.isArray(list)) {
    list.push(fn)
    return () => {
      const i = list.indexOf(fn)
      if (i > -1) list.splice(i, 1)
    }
  } else {
    return () => { }
  }
}

export default Router
