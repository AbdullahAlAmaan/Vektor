import { cn } from '@/lib/utils';

type BGVariantType = 'dots' | 'diagonal-stripes' | 'grid' | 'horizontal-lines' | 'vertical-lines' | 'checkerboard';
type BGMaskType =
  | 'fade-center'
  | 'fade-edges'
  | 'fade-top'
  | 'fade-bottom'
  | 'fade-left'
  | 'fade-right'
  | 'fade-x'
  | 'fade-y'
  | 'none';

type BGPatternProps = React.ComponentProps<'div'> & {
  variant?: BGVariantType;
  mask?: BGMaskType;
  size?: number;
  fill?: string;
};

const maskStyles: Record<BGMaskType, React.CSSProperties> = {
  'fade-edges': { maskImage: 'radial-gradient(ellipse at center, transparent, #0f1117)' },
  'fade-center': { maskImage: 'radial-gradient(ellipse at center, #0f1117, transparent)' },
  'fade-top': { maskImage: 'linear-gradient(to bottom, transparent, #0f1117)' },
  'fade-bottom': { maskImage: 'linear-gradient(to bottom, #0f1117, transparent)' },
  'fade-left': { maskImage: 'linear-gradient(to right, transparent, #0f1117)' },
  'fade-right': { maskImage: 'linear-gradient(to right, #0f1117, transparent)' },
  'fade-x': { maskImage: 'linear-gradient(to right, transparent, #0f1117, transparent)' },
  'fade-y': { maskImage: 'linear-gradient(to bottom, transparent, #0f1117, transparent)' },
  none: {},
};

function getBgImage(variant: BGVariantType, fill: string, size: number): string | undefined {
  switch (variant) {
    case 'dots':
      return `radial-gradient(${fill} 1px, transparent 1px)`;
    case 'grid':
      return `linear-gradient(to right, ${fill} 1px, transparent 1px), linear-gradient(to bottom, ${fill} 1px, transparent 1px)`;
    case 'diagonal-stripes':
      return `repeating-linear-gradient(45deg, ${fill}, ${fill} 1px, transparent 1px, transparent ${size}px)`;
    case 'horizontal-lines':
      return `linear-gradient(to bottom, ${fill} 1px, transparent 1px)`;
    case 'vertical-lines':
      return `linear-gradient(to right, ${fill} 1px, transparent 1px)`;
    case 'checkerboard':
      return `linear-gradient(45deg, ${fill} 25%, transparent 25%), linear-gradient(-45deg, ${fill} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${fill} 75%), linear-gradient(-45deg, transparent 75%, ${fill} 75%)`;
    default:
      return undefined;
  }
}

export function BGPattern({
  variant = 'grid',
  mask = 'none',
  size = 24,
  fill = '#1a1f2e',
  className,
  style,
  ...props
}: BGPatternProps) {
  const bgSize = `${size}px ${size}px`;
  const backgroundImage = getBgImage(variant, fill, size);

  return (
    <div
      className={cn('absolute inset-0 z-0 size-full pointer-events-none', className)}
      style={{
        backgroundImage,
        backgroundSize: bgSize,
        ...maskStyles[mask],
        ...style,
      }}
      {...props}
    />
  );
}
