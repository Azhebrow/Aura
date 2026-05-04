import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { useTabSlideAnimation } from "@/shared/hooks/use-tab-slide-animation"

type TabSlideDirection = 'left' | 'right' | null;

const TabsAnimationContext = React.createContext<{
  direction: TabSlideDirection;
  currentIndex: number;
} | null>(null);

function useTabsAnimation() {
  return React.useContext(TabsAnimationContext);
}

function Tabs({
  className,
  orientation = "horizontal",
  value,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root> & {
  children?: React.ReactNode;
}) {
  const childArray = React.Children.toArray(children);
  const tabsList = childArray.find(
    (child) =>
      React.isValidElement(child) && child.type === TabsList
  ) as React.ReactElement<{ children?: React.ReactNode }> | undefined;

  let currentIndex = 0;
  if (tabsList && React.isValidElement(tabsList)) {
    const triggers = React.Children.toArray(tabsList.props.children).filter(
      (child) =>
        React.isValidElement(child) && child.type === TabsTrigger
    );
    currentIndex = triggers.findIndex((trigger) => {
      if (!React.isValidElement(trigger)) return false;
      const triggerValue = (trigger as React.ReactElement<{ value?: string }>).props.value;
      return triggerValue === value;
    });
    if (currentIndex === -1) currentIndex = 0;
  }

  const direction = useTabSlideAnimation(currentIndex);

  return (
    <TabsAnimationContext.Provider value={{ direction, currentIndex }}>
      <TabsPrimitive.Root
        value={value}
        data-slot="tabs"
        data-orientation={orientation}
        className={cn(
          "group/tabs flex gap-2 data-horizontal:flex-col",
          className
        )}
        {...props}
      >
        {children}
      </TabsPrimitive.Root>
    </TabsAnimationContext.Provider>
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 aura-tx-colors group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "data-active:text-foreground dark:data-active:text-foreground",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity after:duration-aura-base after:ease-aura group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  value,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  const animationContext = useTabsAnimation();
  const isActive = value === (props as any).value || true;

  let animationClass = '';
  if (animationContext?.direction) {
    if (animationContext.direction === 'right') {
      animationClass = isActive ? 'aura-tabs-slide-enter-right' : 'aura-tabs-slide-exit-left';
    } else if (animationContext.direction === 'left') {
      animationClass = isActive ? 'aura-tabs-slide-enter-left' : 'aura-tabs-slide-exit-right';
    }
  }

  return (
    <TabsPrimitive.Content
      value={value}
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", animationClass, className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants, useTabsAnimation }
