import React, { forwardRef } from "react";
import styles from "./Button.module.css";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "chunky" | "message";
  destructive?: boolean;
  animated?: boolean;
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "chunky",
      destructive = false,
      animated = true,
      className = "",
      children,
      ...props
    },
    ref,
  ) {
    const variantClass = animated
      ? variant === "chunky"
        ? styles.buttonChunky
        : styles.buttonMessage
      : styles.buttonStatic;
    const destructiveClass = destructive ? styles.destructive : "";
    const combinedClassName =
      `${styles.button} ${variantClass} ${destructiveClass} ${className}`.trim();

    return (
      <button ref={ref} type="button" className={combinedClassName} {...props}>
        {children}
      </button>
    );
  },
);
