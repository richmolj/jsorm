import { JSORMBase } from "./model"

export type Attr<T> = (() => T) | { new (...args: any[]): T & object }

export type AttrType<T> = Attr<T>

export interface AttrRecord<T> {
  name?: string | symbol
  type?: AttrType<T>
  persist?: boolean
}

export const attr = <T = any>(options?: AttrRecord<T>): Attribute<T> => {
  if (!options) {
    options = {}
  }

  return new Attribute<T>(options)
}

export type AttributeValue<Attributes> = {
  [K in keyof Attributes]: Attributes[K]
}

export type AttributeOptions = Partial<{
  name: string | symbol
  type: () => any
  persist: boolean
}>

export class Attribute<T = any> {
  isRelationship = false
  name: string | symbol
  type?: T = undefined
  persist: boolean = true
  owner: typeof JSORMBase

  constructor(options: AttrRecord<T>) {
    if (!options) {
      return
    }

    if (options.name) {
      this.name = options.name
    }

    if (options.type) {
      this.type = (options.type as any) as T
    }

    if (options.persist !== undefined) {
      this.persist = !!options.persist
    }
  }

  apply(ModelClass: typeof JSORMBase): void {
    Object.defineProperty(ModelClass.prototype, this.name, this.descriptor())
  }

  // The model calls this setter
  setter(context: JSORMBase, val: any): void {
    const privateContext: any = context
    privateContext._attributeOverrides[this.name] = val
    privateContext._attributes[this.name] = val
  }

  // The model calls this getter
  getter(context: JSORMBase): any {
    const privateContext: any = context
    return privateContext.attributes[this.name]
  }

  // This returns the getters/setters for use on the *model*
  descriptor(): PropertyDescriptor {
    const attrDef = this

    return {
      configurable: true,
      enumerable: true,
      get(this: JSORMBase): any {
        return attrDef.getter(this)
      },

      set(this: JSORMBase, value): void {
        attrDef.setter(this, value)
      }
    }
  }
}

const simpleCheckRE = /^(String|Number|Boolean|Function|Symbol)$/

/*
 *  Function taken from VueJS's props assertion code here:
 *  https://github.com/vuejs/vue/blob/1dd6b6f046c3093950e599ccc6bbe7a393b8a494/src/core/util/props.js
 *
 *  We aren't using this yet, but I don't want to lose the reference
 *  to it so I'm keeping it around.
 *
 */
const assertType = <T>(
  value: any,
  type: Attr<T>
): {
  valid: boolean
  expectedType: string
} => {
  let valid
  const expectedType = getType(type)
  if (simpleCheckRE.test(expectedType)) {
    const t = typeof value
    valid = t === expectedType.toLowerCase()
    // for primitive wrapper objects
    if (!valid && t === "object") {
      valid = value instanceof type
    }
  } else if (expectedType === "Object") {
    valid = isPlainObject(value)
  } else if (expectedType === "Array") {
    valid = Array.isArray(value)
  } else {
    valid = value instanceof type
  }
  return {
    valid,
    expectedType
  }
}

/**
 * Use function string name to check built-in types,
 * because a simple equality check will fail when running
 * across different vms / iframes.
 */
/* tslint:disable-next-line:ban-types */
const getType = (fn: Function) => {
  const match = fn && fn.toString().match(/^\s*function (\w+)/)
  return match ? match[1] : ""
}

const isType = <T>(type: Attr<T>, fn: any): fn is T => {
  if (!Array.isArray(fn)) {
    return getType(fn) === getType(type)
  }
  for (let i = 0, len = fn.length; i < len; i++) {
    if (getType(fn[i]) === getType(type)) {
      return true
    }
  }

  return false
}

/**
 * Get the raw type string of a value e.g. [object Object]
 */
const _toString = Object.prototype.toString

/**
 * Strict object type check. Only returns true
 * for plain JavaScript objects.
 */
const isPlainObject = (obj: any): obj is object => {
  return _toString.call(obj) === "[object Object]"
}
