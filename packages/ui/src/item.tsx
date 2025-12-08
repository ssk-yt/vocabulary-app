import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "./utils"

const itemVariants = cva(
    "relative flex w-full flex-col gap-4 rounded-xl border p-4 text-left transition-all hover:bg-muted/50 data-[state=active]:bg-muted/50 data-[state=open]:bg-muted/50 sm:flex-row sm:items-center sm:gap-6",
    {
        variants: {
            variant: {
                default: "bg-card text-card-foreground shadow-sm",
                outline: "border bg-transparent shadow-none",
                muted: "bg-muted text-muted-foreground border-transparent",
            },
            size: {
                default: "p-6 sm:p-8",
                sm: "p-4 sm:p-6",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ItemProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof itemVariants> {
    asChild?: boolean
}

const Item = React.forwardRef<HTMLDivElement, ItemProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(itemVariants({ variant, size }), className)}
                {...props as any}
            />
        )
    }
)
Item.displayName = "Item"

const ItemHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex flex-col gap-1.5", className)}
        {...props as any}
    />
))
ItemHeader.displayName = "ItemHeader"

const ItemContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex-1 space-y-2", className)}
        {...props as any}
    />
))
ItemContent.displayName = "ItemContent"

const ItemTitle = React.forwardRef<
    HTMLHeadingElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn(
            "text-lg font-semibold leading-none tracking-tight",
            className
        )}
        {...props as any}
    />
))
ItemTitle.displayName = "ItemTitle"

const ItemDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props as any}
    />
))
ItemDescription.displayName = "ItemDescription"

const ItemActions = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex items-center gap-2", className)}
        {...props as any}
    />
))
ItemActions.displayName = "ItemActions"

const ItemMedia = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground",
            className
        )}
        {...props as any}
    />
))
ItemMedia.displayName = "ItemMedia"

export {
    Item,
    ItemHeader,
    ItemContent,
    ItemTitle,
    ItemDescription,
    ItemActions,
    ItemMedia,
}
