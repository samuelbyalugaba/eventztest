import { cn } from "./utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-gray-200 dark:bg-gray-800 animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

Skeleton.Line = function SkeletonLine({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <Skeleton className={cn("h-4 w-full", className)} {...props} />;
};

Skeleton.Circle = function SkeletonCircle({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <Skeleton className={cn("rounded-full", className)} {...props} />;
};

Skeleton.Image = function SkeletonImage({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <Skeleton
      className={cn("w-full rounded-none", className)}
      {...props}
    />
  );
};

Skeleton.Text = function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
};

export { Skeleton };
