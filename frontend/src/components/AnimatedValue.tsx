'use client';

import React, { useEffect } from 'react';
import { useSpring } from 'framer-motion';

interface Props {
  value: number;
  prefix?: string;
  postfix?: string;
}

export function AnimatedValue({ value, prefix = '', postfix = '' }: Props) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const spring = useSpring(0, { damping: 30, stiffness: 100, mass: 1 });

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsubscribe = spring.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = `${prefix}${Intl.NumberFormat('en-US').format(Math.round(latest))}${postfix}`;
      }
    });
    return () => unsubscribe();
  }, [prefix, postfix, spring]);

  return <span ref={ref}>{prefix}{Intl.NumberFormat('en-US').format(Math.round(value))}{postfix}</span>;
}
