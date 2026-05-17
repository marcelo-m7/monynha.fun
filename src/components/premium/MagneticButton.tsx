import { motion, useReducedMotion } from "motion/react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

type MagneticButtonProps = ComponentProps<typeof Button>;

export function MagneticButton(props: MagneticButtonProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="inline-flex"
      whileHover={reduceMotion ? undefined : { y: -2, scale: 1.015 }}
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
    >
      <Button {...props} />
    </motion.div>
  );
}

