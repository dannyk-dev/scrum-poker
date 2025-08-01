"use client";

import React, {
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
} from "react";
import { ChevronUp, Loader } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@uidotdev/usehooks";

type PopoverFormProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  openChild?: ReactNode;
  successChild?: ReactNode;
  showSuccess: boolean;
  width?: string;
  height?: string;
  showCloseButton?: boolean;
  title: string;
  icon?: ReactNode;
  preferIcon?: boolean;
  showTitleBeforeChild?: boolean;
  popupClass?: string;
  isAction?: boolean;
  mobilePopupClass?: string;
  customTrigger?: (args: {
    onClick: () => void;
    layoutId?: string;
  }) => React.ReactNode;
};

export function PopoverForm({
  open,
  setOpen,
  openChild,
  showSuccess,
  successChild,
  width = "364px",
  height = "192px",
  title = "Feedback",
  showCloseButton = false,
  preferIcon = true,
  popupClass,
  mobilePopupClass,
  icon,
  showTitleBeforeChild = false,
  isAction = false,
  customTrigger,
}: PopoverFormProps) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  const isMobile = useMediaQuery('(max-width: 768px)')

  return (
    <div
      key={title}
      className={cn(
        "z-50 flex w-fit items-center justify-center",
        customTrigger && "w-full items-start justify-start",
      )}
    >
      {customTrigger ? (
        customTrigger({ onClick: () => setOpen(true) })
      ) : isAction ? (
        <motion.button
          layoutId={`${title}-wrapper`}
          onClick={() => setOpen(true)}
        >
          <Button
            variant="ghost"
            className="rounded-lg font-sans text-sm font-medium py-0"
            asChild
          >
            <motion.span layoutId={`${title}-title`}>
              {preferIcon ? (
                icon
              ) : (
                <>
                  {icon ?? icon}
                  {title}
                </>
              )}
            </motion.span>
          </Button>
        </motion.button>
      ) : (
        <motion.button
          layoutId={`${title}-wrapper`}
          onClick={() => setOpen(true)}
          className="flex h-fit cursor-pointer items-center text-sm font-medium outline-none"
        >
          <motion.span layoutId={`${title}-title`}>
            {icon && preferIcon ? icon : title}
          </motion.span>
        </motion.button>
      )}
      <AnimatePresence>
        {open && (
          <motion.div
            layoutId={`${title}-wrapper`}
            className={cn(
              "bg-muted absolute z-50 overflow-hidden p-1 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0px_1px_2px_rgba(0,0,0,0.04)] outline-none",
              popupClass,
              isMobile && mobilePopupClass
            )}
            ref={ref}
            style={{ borderRadius: 10, width, height }}
          >
            <motion.span
              aria-hidden
              className="text-muted-foreground absolute top-[17px] left-4 text-sm data-[success]:text-transparent"
              layoutId={`${title}-title`}
              data-success={showSuccess}
            >
              {title}
            </motion.span>

            {showCloseButton && (
              <div className="absolute -top-[5px] left-1/2 z-20 flex h-[26px] w-[12px] -translate-x-1/2 transform items-center justify-center">
                <button
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground absolute z-10 -mt-1 flex h-[6px] w-[10px] items-center justify-center rounded-full focus:outline-none"
                  aria-label="Close"
                >
                  <ChevronUp className="text-muted-foreground/80" />
                </button>

                <PopoverFormCutOutTopIcon />
              </div>
            )}

            <AnimatePresence mode="popLayout">
              {showSuccess ? (
                <motion.div
                  key="success"
                  initial={{ y: -32, opacity: 0, filter: "blur(4px)" }}
                  animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                  transition={{ type: "spring", duration: 0.4, bounce: 0 }}
                  className="flex h-full flex-col items-center justify-center"
                >
                  {successChild || <PopoverFormSuccess />}
                </motion.div>
              ) : (
                <motion.div
                  exit={{ y: 8, opacity: 0, filter: "blur(4px)" }}
                  transition={{ type: "spring", duration: 0.4, bounce: 0 }}
                  key="open-child"
                  style={{ borderRadius: 10 }}
                  className={cn(
                    "z-20 h-full border bg-white dark:bg-[#121212]",
                    showTitleBeforeChild && "flex flex-col space-y-4 py-4",
                  )}
                >
                  {showTitleBeforeChild ? (
                    <>
                      <CardHeader>
                        <CardTitle>{title}</CardTitle>
                      </CardHeader>
                      <CardContent>{openChild}</CardContent>
                    </>
                  ) : (
                    openChild
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PopoverFormButton({
  loading,
  text = "submit",
}: {
  loading: boolean;
  text: string;
}) {
  return (
    <button
      type="submit"
      className="from-primary/90 to-primary text-primary-foreground ml-auto flex h-6 w-26 items-center justify-center overflow-hidden rounded-md bg-gradient-to-b px-3 text-xs font-semibold shadow-[0_0_1px_1px_rgba(255,255,255,0.08)_inset,0_1px_1.5px_0_rgba(0,0,0,0.32),0_0_0_0.5px_#1a94ff]"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={`${loading}`}
          initial={{ opacity: 0, y: -25 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 25 }}
          transition={{
            type: "spring",
            duration: 0.3,
            bounce: 0,
          }}
          className="flex w-full items-center justify-center"
        >
          {loading ? (
            <Loader className="size-3 animate-spin" />
          ) : (
            <span>{text}</span>
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

const useClickOutside = (
  ref: RefObject<HTMLElement>,
  handleOnClickOutside: (event: MouseEvent | TouchEvent) => void,
) => {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handleOnClickOutside(event);
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handleOnClickOutside]);
};

export function PopoverFormSuccess({
  title = "Success",
  description = "Thank you for your submission",
}) {
  return (
    <>
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="-mt-1"
      >
        <path
          d="M27.6 16C27.6 17.5234 27.3 19.0318 26.717 20.4392C26.1341 21.8465 25.2796 23.1253 24.2025 24.2025C23.1253 25.2796 21.8465 26.1341 20.4392 26.717C19.0318 27.3 17.5234 27.6 16 27.6C14.4767 27.6 12.9683 27.3 11.5609 26.717C10.1535 26.1341 8.87475 25.2796 7.79759 24.2025C6.72043 23.1253 5.86598 21.8465 5.28302 20.4392C4.70007 19.0318 4.40002 17.5234 4.40002 16C4.40002 12.9235 5.62216 9.97301 7.79759 7.79759C9.97301 5.62216 12.9235 4.40002 16 4.40002C19.0765 4.40002 22.027 5.62216 24.2025 7.79759C26.3779 9.97301 27.6 12.9235 27.6 16Z"
          fill="#2090FF"
          fillOpacity="0.16"
        />
        <path
          d="M12.1334 16.9667L15.0334 19.8667L19.8667 13.1M27.6 16C27.6 17.5234 27.3 19.0318 26.717 20.4392C26.1341 21.8465 25.2796 23.1253 24.2025 24.2025C23.1253 25.2796 21.8465 26.1341 20.4392 26.717C19.0318 27.3 17.5234 27.6 16 27.6C14.4767 27.6 12.9683 27.3 11.5609 26.717C10.1535 26.1341 8.87475 25.2796 7.79759 24.2025C6.72043 23.1253 5.86598 21.8465 5.28302 20.4392C4.70007 19.0318 4.40002 17.5234 4.40002 16C4.40002 12.9235 5.62216 9.97301 7.79759 7.79759C9.97301 5.62216 12.9235 4.40002 16 4.40002C19.0765 4.40002 22.027 5.62216 24.2025 7.79759C26.3779 9.97301 27.6 12.9235 27.6 16Z"
          stroke="#2090FF"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <h3 className="text-primary mt-2 mb-1 text-sm font-medium">{title}</h3>
      <p className="text-muted-foreground mx-auto max-w-xs text-center text-sm text-pretty">
        {description}
      </p>
    </>
  );
}

export function PopoverFormSeparator({
  width = 352,
  height = 2,
}: {
  width?: number | string;
  height?: number;
}) {
  return (
    <svg
      className="absolute top-[-1px] right-0 left-0"
      width={width}
      height={height}
      viewBox="0 0 352 2"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M0 1H352" className="stroke-border" strokeDasharray="4 4" />
    </svg>
  );
}

function PopoverFormCutOutTopIcon({
  width = 44,
  height = 30,
}: {
  width?: number;
  height?: number;
}) {
  const aspectRatio = 6 / 12;
  const calculatedHeight = width * aspectRatio;
  const calculatedWidth = height / aspectRatio;

  const finalWidth = Math.min(width, calculatedWidth);
  const finalHeight = Math.min(height, calculatedHeight);

  return (
    <svg
      width={finalWidth}
      height={finalHeight}
      viewBox="0 0 6 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mt-[1px] rotate-90"
      preserveAspectRatio="none"
    >
      <g clipPath="url(#clip0_2029_22)">
        <path
          d="M0 2C0.656613 2 1.30679 2.10346 1.91341 2.30448C2.52005 2.5055 3.07124 2.80014 3.53554 3.17157C3.99982 3.54301 4.36812 3.98396 4.6194 4.46927C4.87067 4.95457 5 5.47471 5 6C5 6.52529 4.87067 7.04543 4.6194 7.53073C4.36812 8.01604 3.99982 8.45699 3.53554 8.82843C3.07124 9.19986 2.52005 9.4945 1.91341 9.69552C1.30679 9.89654 0.656613 10 0 10V6V2Z"
          className="fill-muted"
        />
        <path
          d="M1 12V10C2.06087 10 3.07828 9.57857 3.82843 8.82843C4.57857 8.07828 5 7.06087 5 6C5 4.93913 4.57857 3.92172 3.82843 3.17157C3.07828 2.42143 2.06087 2 1 2V0"
          className="stroke-border"
          strokeWidth={0.6}
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_2029_22">
          <rect width={finalWidth} height={finalHeight} fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

export function PopoverFormCutOutLeftIcon() {
  return (
    <svg
      width="6"
      height="12"
      viewBox="0 0 6 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_2029_22)">
        <path
          d="M0 2C0.656613 2 1.30679 2.10346 1.91341 2.30448C2.52005 2.5055 3.07124 2.80014 3.53554 3.17157C3.99982 3.54301 4.36812 3.98396 4.6194 4.46927C4.87067 4.95457 5 5.47471 5 6C5 6.52529 4.87067 7.04543 4.6194 7.53073C4.36812 8.01604 3.99982 8.45699 3.53554 8.82843C3.07124 9.19986 2.52005 9.4945 1.91341 9.69552C1.30679 9.89654 0.656613 10 0 10V6V2Z"
          className="fill-muted"
        />
        <path
          d="M1 12V10C2.06087 10 3.07828 9.57857 3.82843 8.82843C4.57857 8.07828 5 7.06087 5 6C5 4.93913 4.57857 3.92172 3.82843 3.17157C3.07828 2.42143 2.06087 2 1 2V0"
          className="stroke-border"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_2029_22">
          <rect width="6" height="12" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

export function PopoverFormCutOutRightIcon() {
  return (
    <svg
      width="6"
      height="12"
      viewBox="0 0 6 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_2029_22)">
        <path
          d="M0 2C0.656613 2 1.30679 2.10346 1.91341 2.30448C2.52005 2.5055 3.07124 2.80014 3.53554 3.17157C3.99982 3.54301 4.36812 3.98396 4.6194 4.46927C4.87067 4.95457 5 5.47471 5 6C5 6.52529 4.87067 7.04543 4.6194 7.53073C4.36812 8.01604 3.99982 8.45699 3.53554 8.82843C3.07124 9.19986 2.52005 9.4945 1.91341 9.69552C1.30679 9.89654 0.656613 10 0 10V6V2Z"
          className="fill-muted"
        />
        <path
          d="M1 12V10C2.06087 10 3.07828 9.57857 3.82843 8.82843C4.57857 8.07828 5 7.06087 5 6C5 4.93913 4.57857 3.92172 3.82843 3.17157C3.07828 2.42143 2.06087 2 1 2V0"
          className="stroke-border"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_2029_22">
          <rect width="6" height="12" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

export default PopoverForm;
