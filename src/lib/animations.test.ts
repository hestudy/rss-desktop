import { describe, it, expect } from 'vitest'
import {
  ANIMATION_CONFIG,
  getTransitionStyle,
  getEasingFunction,
  createAnimationClass,
  getAnimationDuration,
  type AnimationType,
} from './animations'

describe('animations', () => {
  describe('ANIMATION_CONFIG', () => {
    it('应该定义时长配置', () => {
      expect(ANIMATION_CONFIG.duration).toBeDefined()
      expect(ANIMATION_CONFIG.duration.fast).toBe(150)
      expect(ANIMATION_CONFIG.duration.normal).toBe(250)
      expect(ANIMATION_CONFIG.duration.slow).toBe(400)
    })

    it('应该定义缓动函数配置', () => {
      expect(ANIMATION_CONFIG.easing).toBeDefined()
      expect(ANIMATION_CONFIG.easing.easeInOut).toBe('cubic-bezier(0.4, 0, 0.2, 1)')
      expect(ANIMATION_CONFIG.easing.easeOut).toBe('cubic-bezier(0.0, 0, 0.2, 1)')
      expect(ANIMATION_CONFIG.easing.easeIn).toBe('cubic-bezier(0.4, 0, 1, 1)')
      expect(ANIMATION_CONFIG.easing.spring).toBe('cubic-bezier(0.175, 0.885, 0.32, 1.275)')
    })

    it('应该定义页面过渡配置', () => {
      expect(ANIMATION_CONFIG.transition).toBeDefined()
      expect(ANIMATION_CONFIG.transition.slideDistance).toBe(100)
      expect(ANIMATION_CONFIG.transition.fadeOpacity).toBe(0.3)
    })
  })

  describe('getTransitionStyle', () => {
    it('应该返回正确的过渡样式字符串', () => {
      const style = getTransitionStyle('opacity', 'normal', 'easeOut')
      expect(style).toContain('opacity')
      expect(style).toContain('250ms')
      expect(style).toContain('cubic-bezier(0.0, 0, 0.2, 1)')
    })

    it('应该支持多个属性', () => {
      const style = getTransitionStyle(['opacity', 'transform'], 'fast', 'easeInOut')
      expect(style).toContain('opacity')
      expect(style).toContain('transform')
      expect(style).toContain('150ms')
    })

    it('应该使用默认值', () => {
      const style = getTransitionStyle('transform')
      expect(style).toContain('transform')
      expect(style).toContain('250ms') // normal
      expect(style).toContain('cubic-bezier(0.4, 0, 0.2, 1)') // easeInOut
    })

    it('应该支持自定义时长（毫秒）', () => {
      const style = getTransitionStyle('opacity', 300, 'easeIn')
      expect(style).toContain('300ms')
    })

    it('应该支持自定义缓动函数', () => {
      const customEasing = 'linear'
      const style = getTransitionStyle('opacity', 'normal', customEasing)
      expect(style).toContain(customEasing)
    })
  })

  describe('getEasingFunction', () => {
    it('应该返回预定义的缓动函数', () => {
      expect(getEasingFunction('easeInOut')).toBe('cubic-bezier(0.4, 0, 0.2, 1)')
      expect(getEasingFunction('easeOut')).toBe('cubic-bezier(0.0, 0, 0.2, 1)')
      expect(getEasingFunction('easeIn')).toBe('cubic-bezier(0.4, 0, 1, 1)')
      expect(getEasingFunction('spring')).toBe('cubic-bezier(0.175, 0.885, 0.32, 1.275)')
    })

    it('应该返回自定义缓动函数', () => {
      const custom = 'ease'
      expect(getEasingFunction(custom)).toBe('ease')
    })
  })

  describe('createAnimationClass', () => {
    it('应该创建动画类名', () => {
      const className = createAnimationClass('slide', 'enter')
      expect(className).toBe('slide-enter')
    })

    it('应该支持 active 状态', () => {
      const className = createAnimationClass('slide', 'enter', true)
      expect(className).toBe('slide-enter slide-enter-active')
    })

    it('应该支持 exit 动画', () => {
      const className = createAnimationClass('fade', 'exit', true)
      expect(className).toBe('fade-exit fade-exit-active')
    })

    it('应该处理空状态', () => {
      const className = createAnimationClass('fade', 'none')
      expect(className).toBe('')
    })
  })

  describe('getAnimationDuration', () => {
    it('应该返回预定义时长', () => {
      expect(getAnimationDuration('fast')).toBe(150)
      expect(getAnimationDuration('normal')).toBe(250)
      expect(getAnimationDuration('slow')).toBe(400)
    })

    it('应该返回自定义时长', () => {
      expect(getAnimationDuration(500)).toBe(500)
    })

    it('应该处理字符串数字', () => {
      expect(getAnimationDuration('300')).toBe(300)
    })

    it('应该对无效值返回默认时长', () => {
      expect(getAnimationDuration('invalid' as unknown as AnimationType)).toBe(250)
    })
  })
})
