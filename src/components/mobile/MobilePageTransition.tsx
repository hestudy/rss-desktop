/**
 * 移动端页面过渡动画组件
 * 为移动端视图切换提供流畅的过渡动画
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { ANIMATION_CONFIG } from '@/lib/animations'

export interface MobilePageTransitionProps {
  /** 子内容 */
  children: React.ReactNode
  /** 视图标识，用于检测视图切换 */
  viewKey: string
  /** 动画方向 */
  direction?: 'forward' | 'back' | 'none'
  /** 动画完成回调 */
  onTransitionEnd?: () => void
  /** 自定义类名 */
  className?: string
}

/**
 * 移动端页面过渡组件
 */
export function MobilePageTransition({
  children,
  viewKey,
  direction = 'forward',
  onTransitionEnd,
  className,
}: MobilePageTransitionProps) {
  const [isAnimating, setIsAnimating] = useState(direction !== 'none')
  const [animationPhase, setAnimationPhase] = useState<'enter' | 'active'>(
    direction === 'none' ? 'active' : 'enter'
  )
  const previousViewKeyRef = useRef(viewKey)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 清理定时器
  const clearAnimationTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // 处理动画完成
  const handleAnimationComplete = useCallback(() => {
    setIsAnimating(false)
    setAnimationPhase('active')
    onTransitionEnd?.()
  }, [onTransitionEnd])

  // viewKey 变化时触发动画
  useEffect(() => {
    if (viewKey !== previousViewKeyRef.current && direction !== 'none') {
      // 清理之前的定时器
      clearAnimationTimer()

      // 开始新动画
      setIsAnimating(true)
      setAnimationPhase('enter')
      previousViewKeyRef.current = viewKey

      // 设置动画完成定时器
      timerRef.current = setTimeout(
        handleAnimationComplete,
        ANIMATION_CONFIG.duration.normal
      )
    }

    return clearAnimationTimer
  }, [viewKey, direction, handleAnimationComplete, clearAnimationTimer])

  // 初始动画
  useEffect(() => {
    if (direction !== 'none') {
      timerRef.current = setTimeout(
        handleAnimationComplete,
        ANIMATION_CONFIG.duration.normal
      )
    }

    return clearAnimationTimer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 计算动画样式
  const getAnimationStyle = (): React.CSSProperties => {
    if (direction === 'none' || animationPhase === 'active') {
      return {}
    }

    if (direction === 'forward') {
      return {
        transform: animationPhase === 'enter' ? 'translateX(100%)' : 'translateX(0)',
        opacity: animationPhase === 'enter' ? 0 : 1,
        transition: `transform ${ANIMATION_CONFIG.duration.normal}ms ${ANIMATION_CONFIG.easing.easeOut}, opacity ${ANIMATION_CONFIG.duration.normal}ms ${ANIMATION_CONFIG.easing.easeOut}`,
      }
    }

    // back direction
    return {
      transform:
        animationPhase === 'enter' ? 'translateX(-30%)' : 'translateX(0)',
      opacity: animationPhase === 'enter' ? ANIMATION_CONFIG.transition.fadeOpacity : 1,
      transition: `transform ${ANIMATION_CONFIG.duration.normal}ms ${ANIMATION_CONFIG.easing.easeOut}, opacity ${ANIMATION_CONFIG.duration.normal}ms ${ANIMATION_CONFIG.easing.easeOut}`,
    }
  }

  // 计算动画类名
  const getAnimationClassName = (): string => {
    if (direction === 'none') {
      return ''
    }

    const baseClass = direction === 'forward' ? 'page-enter' : 'page-back-enter'

    if (animationPhase === 'enter') {
      return baseClass
    }

    return ''
  }

  return (
    <div
      className={cn(
        'w-full h-full overflow-hidden',
        isAnimating && 'will-change-transform',
        getAnimationClassName(),
        className
      )}
      style={getAnimationStyle()}
    >
      {children}
    </div>
  )
}
