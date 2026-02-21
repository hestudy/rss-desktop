/**
 * 动画配置常量和工具函数
 * 用于统一管理移动端动画参数
 */

/** 动画类型 */
export type AnimationType = 'fast' | 'normal' | 'slow'

/** 缓动函数类型 */
export type EasingType = 'easeInOut' | 'easeOut' | 'easeIn' | 'spring'

/** 动画阶段 */
export type AnimationPhase = 'enter' | 'exit' | 'none'

/** 动画配置常量 */
export const ANIMATION_CONFIG = {
  /** 时长配置（毫秒） */
  duration: {
    /** 快速交互 */
    fast: 150,
    /** 标准过渡 */
    normal: 250,
    /** 复杂动画 */
    slow: 400,
  },
  /** 缓动函数 */
  easing: {
    /** 平滑进出 */
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    /** 平滑出 */
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    /** 平滑进 */
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    /** 弹性效果 */
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  /** 页面过渡配置 */
  transition: {
    /** 滑动距离（像素） */
    slideDistance: 100,
    /** 淡出透明度 */
    fadeOpacity: 0.3,
  },
} as const

/**
 * 获取缓动函数
 * @param type 缓动类型或自定义缓动函数
 * @returns 缓动函数字符串
 */
export function getEasingFunction(type: EasingType | string): string {
  if (type in ANIMATION_CONFIG.easing) {
    return ANIMATION_CONFIG.easing[type as EasingType]
  }
  return type
}

/**
 * 获取动画时长
 * @param duration 时长类型或自定义时长
 * @returns 时长（毫秒）
 */
export function getAnimationDuration(duration: AnimationType | number | string): number {
  if (typeof duration === 'number') {
    return duration
  }
  if (typeof duration === 'string') {
    const parsed = parseInt(duration, 10)
    if (!isNaN(parsed)) {
      return parsed
    }
    if (duration in ANIMATION_CONFIG.duration) {
      return ANIMATION_CONFIG.duration[duration as AnimationType]
    }
  }
  return ANIMATION_CONFIG.duration.normal
}

/**
 * 生成过渡样式字符串
 * @param properties CSS 属性或属性数组
 * @param duration 时长
 * @param easing 缓动函数
 * @returns 过渡样式字符串
 */
export function getTransitionStyle(
  properties: string | string[],
  duration: AnimationType | number = 'normal',
  easing: EasingType | string = 'easeInOut'
): string {
  const durationMs = getAnimationDuration(duration)
  const easingFn = getEasingFunction(easing)
  const props = Array.isArray(properties) ? properties : [properties]

  return props
    .map((prop) => `${prop} ${durationMs}ms ${easingFn}`)
    .join(', ')
}

/**
 * 创建动画类名
 * @param baseName 基础名称
 * @param phase 动画阶段
 * @param active 是否处于活动状态
 * @returns 类名字符串
 */
export function createAnimationClass(
  baseName: string,
  phase: AnimationPhase,
  active = false
): string {
  if (phase === 'none') {
    return ''
  }

  const classes = [`${baseName}-${phase}`]
  if (active) {
    classes.push(`${baseName}-${phase}-active`)
  }

  return classes.join(' ')
}

/**
 * 页面过渡动画配置
 */
export const PAGE_TRANSITIONS = {
  /** 前进动画（从右进入） */
  forward: {
    enter: {
      transform: 'translateX(100%)',
      opacity: 0,
    },
    enterActive: {
      transform: 'translateX(0)',
      opacity: 1,
    },
    exit: {
      transform: 'translateX(0)',
      opacity: 1,
    },
    exitActive: {
      transform: 'translateX(-30%)',
      opacity: ANIMATION_CONFIG.transition.fadeOpacity,
    },
  },
  /** 后退动画（从左进入） */
  back: {
    enter: {
      transform: 'translateX(-30%)',
      opacity: ANIMATION_CONFIG.transition.fadeOpacity,
    },
    enterActive: {
      transform: 'translateX(0)',
      opacity: 1,
    },
    exit: {
      transform: 'translateX(0)',
      opacity: 1,
    },
    exitActive: {
      transform: 'translateX(100%)',
      opacity: 0,
    },
  },
} as const
