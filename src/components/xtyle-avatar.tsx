import Image from "next/image";

import { cn } from "@/lib/utils";

type XtyleAvatarProps = {
  className?: string;
  sizeClassName?: string;
};

/** Avatar / marca Xtyle (hangtag). */
export function XtyleAvatar({
  className,
  sizeClassName = "size-9",
}: XtyleAvatarProps) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-xl",
        sizeClassName,
        className,
      )}
      aria-hidden
      title="Xtyle"
    >
      <Image
        src="/icon.svg"
        alt=""
        fill
        className="object-cover"
        sizes="36px"
      />
    </span>
  );
}
